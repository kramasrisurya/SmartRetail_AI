"""Risk score history + threshold configuration (Phase 12) and the mock POS +
checkout reconciliation surface (Phase 13).

Reconciliation reports FACTS (a scan matched or did not within the window);
it never judges. Mismatch events flow into Phase 12's rule; matched scans are
the only writer of PURCHASED.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.db.session import get_db
from app.models import Event, Journey, Product, RiskScore
from app.models.enums import AlertPriority, JourneyStatus, JourneyType
from services.risk import JourneyFacts, RiskEngine
from services.security import metric_increment

router = APIRouter()

_ENGINE = RiskEngine()


# --- thresholds -----------------------------------------------------------------


class ThresholdUpdate(BaseModel):
    alert_threshold: float = Field(ge=0, le=1)


@router.get("/risk/thresholds")
async def get_thresholds() -> dict:
    return {"alert_threshold": _ENGINE.alert_threshold,
            "default": get_settings().app_env}


@router.put("/risk/thresholds")
async def set_thresholds(body: ThresholdUpdate) -> dict:
    _ENGINE.alert_threshold = body.alert_threshold
    return {"alert_threshold": _ENGINE.alert_threshold}


# --- scoring ---------------------------------------------------------------------


class ScoreRequest(BaseModel):
    instance_key: str = Field(min_length=1, max_length=128)
    sku: str | None = None
    current_state: str | None = None
    seconds_in_state: float = 0.0
    concealed: bool = False
    transferred: bool = False
    checkout_mismatch: bool = False
    person_track_key: str | None = None
    person_journey_closed: bool = False
    near_exit: bool = False
    unresolved_at_exit: bool = False


class ScanOp(BaseModel):
    store_id: int
    register_id: str = Field(min_length=1, max_length=64)
    sku: str = Field(min_length=1)
    quantity: int = Field(default=1, ge=1)
    ts: datetime | None = None
    transaction_id: str | None = Field(default=None, max_length=64)


def _facts_from(req: ScoreRequest) -> JourneyFacts:
    return JourneyFacts(
        instance_key=req.instance_key, sku=req.sku, current_state=req.current_state,
        seconds_in_state=req.seconds_in_state, concealed=req.concealed,
        transferred=req.transferred, checkout_mismatch=req.checkout_mismatch,
        person_track_key=req.person_track_key,
        person_journey_closed=req.person_journey_closed,
        near_exit=req.near_exit, unresolved_at_exit=req.unresolved_at_exit,
    )


async def _persist_run(session: AsyncSession, req: ScoreRequest, run) -> RiskScore:
    # Lineage anchor: every score attaches to its product journey (§95 chain).
    journey = (
        await session.scalars(
            select(Journey).where(Journey.subject_key == req.instance_key,
                                  Journey.journey_type == JourneyType.PRODUCT)
        )
    ).first()
    if journey is None:
        journey = Journey(
            store_id=await _store_id(session),
            journey_type=JourneyType.PRODUCT,
            subject_key=req.instance_key,
            status=JourneyStatus.ACTIVE,
            started_at=datetime.now(UTC),
            payload={"auto": "risk_anchor"},
        )
        session.add(journey)
        await session.flush()
    row = RiskScore(
        store_id=journey.store_id,
        journey_id=journey.id,
        score_value=int(round(max(0.0, min(1.0, run.priority)) * 100)),
        signals={"confidence": run.confidence, "rules": run.contributions,
                 "instance_key": req.instance_key},
        scoring_version="rules-1.0",
        model_id="risk/rules-1.0",
        scored_at=datetime.now(UTC),
    )
    session.add(row)
    await session.commit()
    await session.refresh(row)
    return row


async def _store_id(session: AsyncSession) -> int:
    from app.models import Store

    sid = await session.scalar(select(Store.id).order_by(Store.id))
    if sid is None:
        raise HTTPException(status_code=404, detail="No store exists")
    return sid


def _level(priority: float) -> AlertPriority:
    if priority >= 0.85:
        return AlertPriority.URGENT
    if priority >= 0.65:
        return AlertPriority.HIGH
    if priority >= 0.4:
        return AlertPriority.MEDIUM
    return AlertPriority.LOW


@router.post("/risk/score")
async def score(req: ScoreRequest, session: AsyncSession = Depends(get_db)) -> dict:
    """Evaluate + persist a new immutable score run (history preserved).

    When the configured threshold is crossed, an operator-facing Alert is
    created/updated (duplicate-suppressed per journey) so the review queue
    reflects it immediately.
    """
    from app.models import Alert
    from app.models.enums import AlertStatus

    run = _ENGINE.evaluate(_facts_from(req))
    row = await _persist_run(session, req, run)
    should_alert = _ENGINE.should_alert(run)

    alert_id: int | None = None
    if should_alert:
        journey = (
            await session.scalars(
                select(Journey).where(Journey.subject_key == req.instance_key,
                                      Journey.journey_type == JourneyType.PRODUCT)
            )
        ).first()
        existing = (
            await session.scalars(
                select(Alert).where(
                    Alert.status == AlertStatus.OPEN,
                    Alert.risk_score_id.is_not(None),
                )
                .order_by(Alert.created_at.desc())
            )
        ).all()
        # Duplicate suppression: match by journey anchor of prior scores.
        target = next(
            (a for a in existing
             if (await session.get(RiskScore, a.risk_score_id)).signals.get("instance_key")
             == req.instance_key),
            None,
        ) if existing else None
        level = _level(run.priority)
        if target is not None:
            target.risk_score_id = row.id
            target.priority = level
            alert_id = target.id
        else:
            alert = Alert(store_id=journey.store_id if journey else await _store_id(session),
                          risk_score_id=row.id, status=AlertStatus.OPEN, priority=level)
            session.add(alert)
            await session.flush()
            alert_id = alert.id
        metric_increment("smartretail_alerts_total", labels=f'level="{level.value}"')

    await session.commit()
    return {
        "risk_score_id": row.id,
        "priority": round(run.priority, 4),
        "confidence": round(run.confidence, 4),
        "should_alert": should_alert,
        "alert_id": alert_id,
        "level": _level(run.priority).value,
        "rules": run.contributions,
    }


@router.get("/risk/scores")
async def list_scores(
    instance_key: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=500),
    session: AsyncSession = Depends(get_db),
) -> list[dict]:
    stmt = select(RiskScore).order_by(RiskScore.created_at.desc()).limit(limit)
    rows = (await session.scalars(stmt)).all()
    out = []
    for r in rows:
        p = r.signals or {}
        if instance_key and p.get("instance_key") != instance_key:
            continue
        out.append({
            "id": r.id, "score": round(r.score_value / 100.0, 4),
            "level": str(_level(r.score_value / 100.0).value),
            "model_version": r.scoring_version, "created_at": r.created_at.isoformat(),
            "signals": p,
        })
    return out


# --- Phase 13: mock POS + reconciliation -------------------------------------------


@router.post("/pos/scan")
async def pos_scan(op: ScanOp, session: AsyncSession = Depends(get_db)) -> dict:
    """Inject a mock register scan; persisted as a POS-scan event (ground truth)."""
    ts = op.ts or datetime.now(UTC)
    event = Event(
        store_id=op.store_id,
        event_type="pos_scan",
        event_timestamp=ts,
        confidence=1.0,
        payload={"sku": op.sku, "quantity": op.quantity, "register_id": op.register_id,
                 "transaction_id": op.transaction_id},
    )
    session.add(event)
    await session.commit()
    await session.refresh(event)
    return {"event_id": event.id}


class ReconcileRequest(BaseModel):
    """Ask reconciliation about a specific pending item.

    ``scans`` is supplied by the caller (demo/tests); a real integration would
    stream these from the retailer's POS adapter.
    """

    instance_key: str
    sku: str
    window_seconds: float = Field(default=120, gt=0)
    scans: list[dict[str, Any]] = Field(
        default_factory=list,
        description='[{"ts": iso, "sku": "...", ...}] register scans in the window',
    )


@router.post("/checkout/reconcile")
async def reconcile(req: ReconcileRequest, session: AsyncSession = Depends(get_db)) -> dict:
    now = datetime.now(UTC)
    matching = [s for s in req.scans if s.get("sku") == req.sku]
    if matching:
        return {"status": "matched", "instance_key": req.instance_key,
                "resolution": "purchased", "matches": len(matching)}
    # No match ⇒ emit a factual CheckoutMismatch EVENT (Phase 12 weighs it).
    store = await _store_id(session)
    event = Event(
        store_id=store,
        event_type="checkout_mismatch",
        event_timestamp=now,
        confidence=0.8,
        payload={"instance_key": req.instance_key, "sku": req.sku,
                 "window_seconds": req.window_seconds},
    )
    session.add(event)
    await session.commit()
    await session.refresh(event)
    return {"status": "mismatch", "instance_key": req.instance_key,
            "event_id": event.id, "resolution": "pending_human_review"}


@router.get("/checkout/reconciliation")
async def list_reconciliation(
    status: Literal["matched", "mismatch"] | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=500),
    session: AsyncSession = Depends(get_db),
) -> list[dict]:
    etype = {"matched": "pos_scan", "mismatch": "checkout_mismatch", None: None}[status]
    stmt = select(Event).where(Event.event_type == (etype or "checkout_mismatch"))
    rows = (await session.scalars(stmt.order_by(Event.event_timestamp.desc()).limit(limit))).all()
    return [
        {"event_id": e.id, "status": status or "mismatch", "ts": e.event_timestamp.isoformat(),
         "payload": e.payload}
        for e in rows
    ]


_ = timedelta
