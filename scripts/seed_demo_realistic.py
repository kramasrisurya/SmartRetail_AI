"""Seed realistic demo data into StoreSight database (SQLite).
Seeds:
- 10 Alerts across all priority levels (URGENT, HIGH, MEDIUM, LOW) & statuses
- 10 RiskScores with complete rule justification signals and plain-language summaries
- 60+ Events across all 13 cameras for rich heatmap density and safety/inventory log
- 4 Full Person Journeys with timelines
- Shelf product discrepancies
"""

import asyncio
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "apps" / "backend"))

from sqlalchemy import select, delete
from app.db.session import get_session_maker
from app.models import (
    Store, Zone, Camera, Product, Shelf, Event, Journey, JourneyEvent,
    RiskScore, Alert, Evidence
)
from app.models.enums import (
    AlertPriority, AlertStatus, EvidenceType, JourneyStatus, JourneyType,
    StoreStatus, ZoneType, CameraStatus
)

async def seed_realistic_data():
    now = datetime.now(UTC)
    async with get_session_maker()() as session:
        # Get store
        store = (await session.scalars(select(Store))).first()
        if not store:
            print("Store not found, please run base seed first.")
            return

        cams = {c.name: c for c in (await session.scalars(select(Camera))).all()}
        zones = {z.name: z for z in (await session.scalars(select(Zone))).all()}

        # 1. Update camera health to realistic mixed states
        for name, c in cams.items():
            if name == "CAM-12":
                c.status = CameraStatus.FAULTED
                c.last_heartbeat_at = now - timedelta(minutes=15)
                c.last_heartbeat_fps = 0.0
                c.last_heartbeat_latency_ms = None
            elif name == "CAM-06":
                c.status = CameraStatus.ACTIVE
                c.last_heartbeat_at = now
                c.last_heartbeat_fps = 5.2
                c.last_heartbeat_latency_ms = 148.0
            else:
                c.status = CameraStatus.ACTIVE
                c.last_heartbeat_at = now
                c.last_heartbeat_fps = 15.0
                c.last_heartbeat_latency_ms = 28.0 + (hash(name) % 15)

        # 2. Clear old alerts, risk scores, events to avoid duplication
        await session.execute(delete(Evidence))
        await session.execute(delete(Alert))
        await session.execute(delete(RiskScore))
        await session.execute(delete(JourneyEvent))
        await session.execute(delete(Journey))
        await session.execute(delete(Event))
        await session.flush()

        # 3. Seed 65+ realistic events across the store (populates heatmap & logs)
        print("Seeding events...")
        event_definitions = [
            # Entrance / Customer Area
            ("person_entered", "CAM-11", 12, 135, {"label": "Shopper #17 entered store", "person_id": 17}),
            ("person_entered", "CAM-11", 14, 137, {"label": "Shopper #23 entered store", "person_id": 23}),
            ("person_entered", "CAM-11", 10, 134, {"label": "Shopper #31 entered store", "person_id": 31}),
            ("person_entered", "CAM-11", 15, 138, {"label": "Shopper #42 entered store", "person_id": 42}),
            ("person_entered", "CAM-11", 13, 136, {"label": "Shopper #08 entered store", "person_id": 8}),
            ("zone_dwell", "CAM-07", 50, 72, {"label": "Shopper #17 dwell in Customer Area", "dwell_sec": 45}),
            ("zone_dwell", "CAM-07", 52, 74, {"label": "Shopper #23 dwell in Customer Area", "dwell_sec": 30}),
            ("congestion", "CAM-07", 48, 70, {"label": "Customer Area aisle traffic surge", "count": 6}),
            
            # Shelf A (Groceries / Cereal)
            ("approach_shelf", "CAM-01", 20, 15, {"label": "Shopper #17 approached Shelf A"}),
            ("product_pick", "CAM-01", 20, 15, {"sku": "A123", "product": "Coffee Beans 250g", "action": "pick"}),
            ("product_pick", "CAM-01", 22, 16, {"sku": "K881", "product": "Cereal 500g", "action": "pick"}),
            ("zone_dwell", "CAM-01", 21, 15, {"label": "Shopper inspecting labels at Shelf A", "dwell_sec": 95}),
            ("shelf_replenish", "CAM-01", 20, 15, {"sku": "A123", "action": "restock_verified", "staff": "op1"}),

            # Shelf B (Dairy / Bakery)
            ("approach_shelf", "CAM-02", 50, 15, {"label": "Shopper #17 arrived at Shelf B"}),
            ("product_pick", "CAM-02", 50, 15, {"sku": "B222", "product": "Milk 1L", "action": "pick"}),
            ("product_conceal", "CAM-02", 50, 15, {"sku": "B222", "action": "conceal_jacket", "confidence": 0.94}),
            ("misplaced_item", "CAM-02", 51, 16, {"sku": "A123", "action": "deposited_wrong_shelf", "label": "Coffee Beans left on Dairy Shelf"}),
            ("approach_shelf", "CAM-02", 48, 14, {"label": "Shopper #23 browsing bakery"}),
            ("product_pick", "CAM-02", 49, 15, {"sku": "D447", "product": "Bread Loaf", "action": "pick"}),

            # Shelf C (Beverages)
            ("approach_shelf", "CAM-03", 80, 15, {"label": "Shopper #31 at Shelf C"}),
            ("product_pick", "CAM-03", 80, 15, {"sku": "C991", "product": "Energy Drink 250ml", "action": "pick"}),
            ("product_pick", "CAM-03", 82, 16, {"sku": "J550", "product": "Bottled Water 1.5L", "action": "pick"}),
            ("zone_dwell", "CAM-03", 80, 15, {"label": "Dwell at beverage cooler", "dwell_sec": 65}),

            # Shelf D (Confectionery)
            ("approach_shelf", "CAM-04", 20, 40, {"label": "Shopper #23 at Shelf D"}),
            ("product_pick", "CAM-04", 20, 40, {"sku": "E005", "product": "Chocolate Bar", "action": "pick"}),
            ("product_conceal", "CAM-04", 21, 41, {"sku": "E005", "action": "pocket_slip", "confidence": 0.86}),

            # Shelf E (Household)
            ("approach_shelf", "CAM-05", 50, 40, {"label": "Shopper #14 at Shelf E"}),
            ("product_pick", "CAM-05", 50, 40, {"sku": "F318", "product": "Laundry Detergent 1kg", "action": "pick"}),
            ("abandoned_cart", "CAM-05", 48, 42, {"label": "Cart stationary > 10m in household aisle"}),

            # Shelf F (Cosmetics / Personal Care - High Shrink)
            ("approach_shelf", "CAM-06", 80, 40, {"label": "Shopper #19 at Shelf F"}),
            ("product_pick", "CAM-06", 80, 40, {"sku": "H104", "product": "Shampoo 400ml", "action": "pick"}),
            ("zone_dwell", "CAM-06", 80, 40, {"label": "Extended dwell at cosmetics: 180s", "dwell_sec": 180}),
            ("product_sweep", "CAM-06", 81, 41, {"sku": "G702", "product": "Toothpaste 100ml", "action": "multi_item_sweep", "confidence": 0.91}),

            # Restricted Staff Office
            ("restricted_entry", "CAM-07", 5, 60, {"label": "Unauthorized entry detected in Staff Office", "person_id": 31}),
            ("badge_mismatch", "CAM-07", 6, 62, {"label": "No active employee badge in restricted polygon"}),

            # Checkout Area (CAM-08, CAM-09, CAM-10)
            ("approach_checkout", "CAM-08", 20, 105, {"label": "Shopper #17 approached Register 1"}),
            ("pos_scan_mismatch", "CAM-08", 20, 105, {"label": "Concealed item B222 bypasses barcode scanner", "confidence": 0.98}),
            ("queue_congestion", "CAM-08", 20, 108, {"label": "Queue length: 4 customers, wait 3.5 min"}),
            
            ("approach_checkout", "CAM-09", 50, 105, {"label": "Shopper #23 approached Register 2"}),
            ("pos_scan_mismatch", "CAM-09", 50, 105, {"label": "Item E005 not scanned during checkout dwell", "confidence": 0.88}),
            
            ("approach_checkout", "CAM-10", 80, 105, {"label": "Shopper #14 checking out at Register 3"}),
            ("pos_scan_match", "CAM-10", 80, 105, {"label": "Cart contents matched POS transaction", "total": "$24.50"}),

            # Exit Area (CAM-12)
            ("approach_exit", "CAM-12", 88, 135, {"label": "Shopper #17 passing EAS pedestals with active alarm", "confidence": 0.96}),
            ("approach_exit", "CAM-12", 87, 134, {"label": "Shopper #08 approaching exit with unverified return item"}),
        ]

        created_events = []
        for i, (etype, cam_name, x, y, payload) in enumerate(event_definitions):
            cam = cams.get(cam_name)
            ts = now - timedelta(minutes=(len(event_definitions) - i) * 3)
            ev = Event(
                store_id=store.id,
                camera_id=cam.id if cam else None,
                event_type=etype,
                event_timestamp=ts,
                confidence=payload.get("confidence", 0.92),
                payload=payload,
            )
            session.add(ev)
            created_events.append(ev)

        # Duplicate some high-density events to give the heatmap realistic hotspots
        for cam_name, count in [("CAM-01", 6), ("CAM-02", 9), ("CAM-06", 8), ("CAM-08", 12), ("CAM-11", 14)]:
            cam = cams.get(cam_name)
            for k in range(count):
                session.add(Event(
                    store_id=store.id,
                    camera_id=cam.id,
                    event_type="ambient_flow",
                    event_timestamp=now - timedelta(minutes=k * 5),
                    confidence=0.90,
                    payload={"flow_count": 1},
                ))

        await session.flush()

        # 4. Seed 4 Person Journeys
        print("Seeding journeys...")
        j1 = Journey(
            store_id=store.id,
            journey_type=JourneyType.PERSON,
            subject_key="shopper-17:B222",
            status=JourneyStatus.ACTIVE,
            started_at=now - timedelta(minutes=25),
            payload={"person_id": 17, "tracked_sku": "B222", "dwell_total_sec": 420, "risk_status": "URGENT"}
        )
        j2 = Journey(
            store_id=store.id,
            journey_type=JourneyType.PERSON,
            subject_key="shopper-23:E005",
            status=JourneyStatus.ACTIVE,
            started_at=now - timedelta(minutes=18),
            payload={"person_id": 23, "tracked_sku": "E005", "dwell_total_sec": 310, "risk_status": "HIGH"}
        )
        j3 = Journey(
            store_id=store.id,
            journey_type=JourneyType.PERSON,
            subject_key="shopper-31:RESTRICTED",
            status=JourneyStatus.ACTIVE,
            started_at=now - timedelta(minutes=12),
            payload={"person_id": 31, "zone": "Staff Office", "dwell_total_sec": 180, "risk_status": "MEDIUM"}
        )
        j4 = Journey(
            store_id=store.id,
            journey_type=JourneyType.PRODUCT,
            subject_key="shopper-42:G702",
            status=JourneyStatus.ACTIVE,
            started_at=now - timedelta(minutes=8),
            payload={"person_id": 42, "tracked_sku": "G702", "action": "cosmetics_sweep", "risk_status": "URGENT"}
        )
        session.add_all([j1, j2, j3, j4])
        await session.flush()

        # Seed JourneyEvents for J1 (Shopper #17)
        timeline_events = [
            (1, "Shopper #17 entered store via Entrance", "CAM-11", 0.98, "enter"),
            (2, "Handoff CAM-11 -> CAM-01 (Approached Shelf A)", "CAM-01", 0.95, "handoff"),
            (3, "Product A123 picked up from Shelf A", "CAM-01", 0.93, "pick"),
            (4, "Product A123 placed in handheld basket", "CAM-01", 0.94, "cart"),
            (5, "Shopper navigated Customer Area aisle (CAM-07)", "CAM-07", 0.96, "walk"),
            (6, "Shopper arrived at Dairy section (CAM-02)", "CAM-02", 0.95, "approach"),
            (7, "Product A123 left on Shelf B (Misplaced item)", "CAM-02", 0.91, "misplace"),
            (8, "Product B222 (Milk 1L) picked up from Shelf B", "CAM-02", 0.95, "pick"),
            (9, "Product B222 concealed inside coat pocket", "CAM-02", 0.94, "conceal"),
            (10, "Shopper walked through Customer Area toward checkout", "CAM-07", 0.93, "walk"),
            (11, "POS scan check: Register 1 did not record scan for B222", "CAM-08", 0.99, "pos_skip"),
            (12, "Shopper approached Exit doorway with active EAS trigger", "CAM-12", 0.97, "exit"),
        ]
        for pos, label, cname, conf, etype in timeline_events:
            ev = Event(
                store_id=store.id,
                camera_id=cams[cname].id if cname in cams else None,
                event_type=f"journey_{etype}",
                event_timestamp=now - timedelta(minutes=25 - pos * 2),
                confidence=conf,
                payload={"label": label, "position": pos}
            )
            session.add(ev)
            await session.flush()
            session.add(JourneyEvent(store_id=store.id, journey_id=j1.id, event_id=ev.id, position=pos))

        # 5. Seed 10 Realistic Alerts with varying risk levels
        print("Seeding alerts & risk scores...")
        alerts_data = [
            {
                "priority": AlertPriority.URGENT,
                "status": AlertStatus.OPEN,
                "score_value": 94,
                "title": "Active Concealment & Unscanned Exit Approach",
                "summary": "Shopper #17 concealed Milk 1L into coat at Shelf B. Bypassed register scan and is approaching the exit.",
                "instance_key": "shopper-17:B222",
                "confidence": 0.94,
                "zone": "Exit / Checkout",
                "camera": "CAM-08",
                "rules": [
                    {"rule_name": "Concealment", "confidence": 0.94, "justification": "Item picked and obscured inside inner coat pocket"},
                    {"rule_name": "POS Reconciliation", "confidence": 0.99, "justification": "No barcode scan matched during 45s checkout window"},
                    {"rule_name": "Exit Approach", "confidence": 0.97, "justification": "Unresolved product payload approaching EAS sensor zone"}
                ],
                "explanation": "High confidence loss prevention event: Person picked high-value SKU, concealed it, passed checkout lanes without barcode transaction, and moved into exit vestibule."
            },
            {
                "priority": AlertPriority.URGENT,
                "status": AlertStatus.ESCALATED,
                "score_value": 91,
                "title": "Rapid Cosmetics Shelf Sweep (Organized Retail Crime Pattern)",
                "summary": "Shopper #42 swept 4 units of Toothpaste 100ml into backpack within 6 seconds at Shelf F.",
                "instance_key": "shopper-42:G702",
                "confidence": 0.91,
                "zone": "Shelf F",
                "camera": "CAM-06",
                "rules": [
                    {"rule_name": "Rapid Multi-Pick", "confidence": 0.95, "justification": "4 units removed from shelf in under 6 seconds"},
                    {"rule_name": "Concealment Carrier", "confidence": 0.92, "justification": "Items deposited directly into personal backpack"},
                    {"rule_name": "ORC Signature Match", "confidence": 0.88, "justification": "High velocity shelf clearing on target SKU"}
                ],
                "explanation": "Organized retail crime pattern detected: velocity threshold exceeded for personal care category. Escalated to on-duty security guard."
            },
            {
                "priority": AlertPriority.HIGH,
                "status": AlertStatus.OPEN,
                "score_value": 86,
                "title": "Self-Checkout Basket Skip",
                "summary": "Shopper #23 transferred Chocolate Bar directly to coat pocket while paying for only 1 beverage at Register 2.",
                "instance_key": "shopper-23:E005",
                "confidence": 0.86,
                "zone": "Checkout 2",
                "camera": "CAM-09",
                "rules": [
                    {"rule_name": "Unscanned Transfer", "confidence": 0.89, "justification": "Item picked from shelf and pocketed at POS counter"},
                    {"rule_name": "Scan Discrepancy", "confidence": 0.92, "justification": "POS registered 1 item ($2.49); visual detector observed 2 items"}
                ],
                "explanation": "Self-checkout discrepancy: visual cart tracker counted 2 unique items picked; POS registered payment for only 1 item."
            },
            {
                "priority": AlertPriority.HIGH,
                "status": AlertStatus.REVIEWING,
                "score_value": 81,
                "title": "Extended High Dwell in Blind Spot",
                "summary": "Shopper #19 dwelled for 180s in cosmetics blind spot. Item removed from packaging.",
                "instance_key": "shopper-19:H104",
                "confidence": 0.81,
                "zone": "Shelf F",
                "camera": "CAM-06",
                "rules": [
                    {"rule_name": "Excessive Dwell", "confidence": 0.85, "justification": "Stationary dwell exceeded 3x category average (180s vs 60s)"},
                    {"rule_name": "Visual Occlusion", "confidence": 0.78, "justification": "Hand interaction obscured by shoulder turn"}
                ],
                "explanation": "Unusual dwelling pattern in high-theft aisle with intentional body occlusion during product handling."
            },
            {
                "priority": AlertPriority.HIGH,
                "status": AlertStatus.OPEN,
                "score_value": 77,
                "title": "Unverified Return Attempt from Floor",
                "summary": "Shopper #08 entered store empty-handed, picked item from shelf, and went directly to customer service return counter.",
                "instance_key": "shopper-08:RETURN",
                "confidence": 0.77,
                "zone": "Customer Area / Exit",
                "camera": "CAM-11",
                "rules": [
                    {"rule_name": "Floor Pick to Return", "confidence": 0.84, "justification": "Entrance camera confirmed person entered with zero carry items"},
                    {"rule_name": "Direct Return Desk Approach", "confidence": 0.80, "justification": "Approached service desk with in-store merchandise"}
                ],
                "explanation": "Fraudulent return prevention: individual entered store without merchandise, selected item from Shelf C, and approached customer service."
            },
            {
                "priority": AlertPriority.MEDIUM,
                "status": AlertStatus.OPEN,
                "score_value": 65,
                "title": "Restricted Area Unauthorized Entry",
                "summary": "Shopper #31 crossed threshold into Staff-Only Office without badge authentication.",
                "instance_key": "shopper-31:RESTRICTED",
                "confidence": 0.95,
                "zone": "Staff Office",
                "camera": "CAM-07",
                "rules": [
                    {"rule_name": "Restricted Polygon Breach", "confidence": 0.98, "justification": "Track coordinates penetrated restricted office boundary"},
                    {"rule_name": "Missing Staff Credential", "confidence": 0.93, "justification": "No valid RFID/NFC badge swipe within 10s window"}
                ],
                "explanation": "Security perimeter violation: individual entered employee back-office door without authorization."
            },
            {
                "priority": AlertPriority.MEDIUM,
                "status": AlertStatus.REVIEWING,
                "score_value": 58,
                "title": "Cross-Department Misplaced Inventory",
                "summary": "Product A123 (Coffee Beans) picked from Shelf A and abandoned on refrigerated Shelf B.",
                "instance_key": "shopper-17:A123",
                "confidence": 0.88,
                "zone": "Shelf B",
                "camera": "CAM-02",
                "rules": [
                    {"rule_name": "Misplaced Deposition", "confidence": 0.91, "justification": "Dry grocery SKU placed onto dairy refrigeration rack"},
                    {"rule_name": "Shelf Planogram Mismatch", "confidence": 0.86, "justification": "Expected Dairy B222/D447; observed Coffee A123"}
                ],
                "explanation": "Inventory planogram exception: dry good deposited in refrigerated zone, requiring staff re-shelving."
            },
            {
                "priority": AlertPriority.MEDIUM,
                "status": AlertStatus.RESOLVED,
                "score_value": 52,
                "title": "Abandoned Shopping Cart Blocking Main Aisle",
                "summary": "Full shopping cart left unattended in Customer Area for > 15 minutes.",
                "instance_key": "cart-abandoned:14",
                "confidence": 0.92,
                "zone": "Customer Area",
                "camera": "CAM-07",
                "rules": [
                    {"rule_name": "Obstruction Hazard", "confidence": 0.94, "justification": "Cart stationary in main walkway exceeding 15 minutes"},
                    {"rule_name": "Customer Separation", "confidence": 0.90, "justification": "Associated shopper departed through exit without cart"}
                ],
                "explanation": "Store operations alert: customer abandoned basket mid-shopping, merchandise returned to shelves by associate."
            },
            {
                "priority": AlertPriority.LOW,
                "status": AlertStatus.FALSE_POSITIVE,
                "score_value": 38,
                "title": "Employee Restock Flagged as Multi-Pick",
                "summary": "Staff member restocked Laundry Detergent. Reviewed and confirmed legitimate store activity.",
                "instance_key": "staff-restock:F318",
                "confidence": 0.38,
                "zone": "Shelf E",
                "camera": "CAM-05",
                "rules": [
                    {"rule_name": "Bulk Movement", "confidence": 0.70, "justification": "6 units transferred simultaneously from cart to shelf"},
                    {"rule_name": "Uniform Identifier", "confidence": 0.88, "justification": "Subject wearing verified employee smock"}
                ],
                "explanation": "Automated vision flagged multiple item handling; supervisor marked as false-positive legitimate restock."
            },
            {
                "priority": AlertPriority.LOW,
                "status": AlertStatus.RESOLVED,
                "score_value": 31,
                "title": "Checkout Queue Congestion Exceeded Target",
                "summary": "Register 1 queue exceeded 4 persons. Backup lane opened automatically.",
                "instance_key": "queue-congestion:REG1",
                "confidence": 0.96,
                "zone": "Checkout 1",
                "camera": "CAM-08",
                "rules": [
                    {"rule_name": "Queue Depth Limit", "confidence": 0.98, "justification": "Observed queue count = 5 persons (> 3 threshold)"},
                    {"rule_name": "Wait Time Projection", "confidence": 0.91, "justification": "Estimated wait time reached 4.2 minutes"}
                ],
                "explanation": "Customer experience metric: queue depth trigger alerted store lead to open register 3."
            },
        ]

        for i, a_data in enumerate(alerts_data):
            score = RiskScore(
                store_id=store.id,
                event_id=created_events[i % len(created_events)].id,
                journey_id=j1.id if i == 0 else (j2.id if i == 2 else (j3.id if i == 5 else None)),
                score_value=a_data["score_value"],
                scoring_version="v2.1-fused",
                model_id="risk-fusion-ensemble",
                scored_at=now - timedelta(minutes=(len(alerts_data) - i) * 6),
                signals={
                    "instance_key": a_data["instance_key"],
                    "confidence": a_data["confidence"],
                    "rules": a_data["rules"],
                    "zone": a_data["zone"],
                    "camera": a_data["camera"] if "camera" in a_data else "CAM-01",
                    "explanation": a_data["explanation"],
                    "title": a_data["title"],
                }
            )
            session.add(score)
            await session.flush()

            alert = Alert(
                store_id=store.id,
                risk_score_id=score.id,
                status=a_data["status"],
                priority=a_data["priority"],
                title=a_data["title"],
                summary=a_data["summary"],
                created_at=now - timedelta(minutes=(len(alerts_data) - i) * 6),
                resolved_at=now if a_data["status"] in (AlertStatus.RESOLVED, AlertStatus.FALSE_POSITIVE) else None
            )
            session.add(alert)
            await session.flush()

            # Attach evidence thumbnail / frame reference
            cam_obj = cams.get(a_data.get("camera", "CAM-01"))
            evidence = Evidence(
                store_id=store.id,
                alert_id=alert.id,
                evidence_type=EvidenceType.SNAPSHOT,
                storage_key=f"evidence/alert_{alert.id}_keyframe.jpg",
                url=f"/evidence/alert_{alert.id}_keyframe.jpg",
                camera_id=cam_obj.id if cam_obj else None,
                captured_at=alert.created_at,
            )
            session.add(evidence)

        await session.commit()
        print("Successfully seeded realistic demo dataset!")

if __name__ == "__main__":
    asyncio.run(seed_realistic_data())
