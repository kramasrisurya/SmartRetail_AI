"""Unit tests for spatial association + the interaction engine (Phase 7).

Synthetic person/product sequences with known outcomes pin the §9 contract:
sustained-proximity picks (standing near a shelf is NOT a pick), hold cadence,
return-to-ANY-shelf as a normal outcome, §94 confidence breakdowns, and
multi-person ambiguity handled without confident misattribution.
"""

from __future__ import annotations

import pytest

from services.interaction.association import (
    PersonObservation,
    ProductObservation,
    SpatialAssociator,
    hand_region,
    proximity_score,
)
from services.interaction.belief import ShelfRegistry
from services.interaction.engine import EVENT_HELD, EVENT_PICKED, EVENT_RETURNED, InteractionEngine

CAM = "cam1"


def person(x, conf=0.94, wrist=None) -> PersonObservation:
    # A standing shopper box: 30 wide x 80 tall.
    return PersonObservation(track_key=f"{CAM}:t1", bbox=(x, 50, x + 30, 130),
                             confidence=conf, wrist=wrist)


def product(x, y=90, sku="A123", conf=0.91) -> ProductObservation:
    # A handheld product box: 16 wide x 20 tall.
    return ProductObservation(instance_key=f"{CAM}:{sku}", sku=sku, bbox=(x, y, x + 16, y + 20),
                              confidence=conf, identified=True)


def make_engine(**kw) -> tuple[InteractionEngine, list[dict]]:
    shelves = ShelfRegistry()
    shelves.add(CAM, "Shelf A", (0, 40, 60, 150))
    shelves.add(CAM, "Shelf B", (250, 40, 320, 150))
    engine = InteractionEngine(shelves=shelves, **kw)
    events: list[dict] = []
    engine.event_handlers.append(events.append)
    return engine, events


# --- association ---------------------------------------------------------------


def test_proximity_score_one_at_contact_zero_beyond_radius() -> None:
    assert proximity_score((10, 10), (10, 10), radius=50) == 1.0
    assert proximity_score((60, 10), (10, 10), radius=50) == 0.0
    assert 0.4 < proximity_score((35, 10), (10, 10), radius=50) < 0.6


def test_hand_region_is_lower_half_center_not_box_center() -> None:
    # Box (100,50)-(130,130): center y=90, +25% of height (80) ⇒ hip-level 110.
    hx, hy = hand_region((100, 50, 130, 130))
    assert (hx, hy) == (115.0, 110.0)


def test_wrist_signal_outranks_bbox_fallback() -> None:
    assoc = SpatialAssociator()
    # Product held HIGH (shelf-top height) - reachable by a raised wrist, far
    # from the lower-half heuristic point.
    prod = product(214, 55)  # center ≈ (222, 65)
    far = PersonObservation(track_key=f"{CAM}:tFar", bbox=(0, 50, 30, 130), confidence=0.94)
    near_wrist = PersonObservation(track_key=f"{CAM}:tWrist", bbox=(200, 50, 230, 130),
                                   confidence=0.94, wrist=(220, 68))

    assert assoc.associate([far], [prod])[prod.instance_key] == []

    both = assoc.associate([far, near_wrist], [prod])[prod.instance_key]
    assert len(both) == 1
    cand = both[0]
    assert cand.used_pose is True and cand.signal > 0.85

    from services.interaction.association import hand_region, proximity_score

    fallback_signal = proximity_score(
        cand.product_center, hand_region(near_wrist.bbox), radius=(near_wrist.bbox[3] - near_wrist.bbox[1]) * 0.6
    )
    assert cand.signal > fallback_signal + 0.5, (
        "wrist proximity must decisively outrank the bbox heuristic when the item is held high"
    )


def test_breakdown_matches_spec94_shape() -> None:
    assoc = SpatialAssociator()
    cand = assoc.associate([person(40)], [product(52)])[f"{CAM}:A123"][0]
    b = cand.breakdown(person_conf=0.94, product_conf=0.91)
    assert set(b) == {"person_tracking", "product_detection", "product_association", "combined"}
    assert b["combined"] == pytest.approx(0.94 * 0.91 * b["product_association"], abs=1e-3)


# --- engine ---------------------------------------------------------------------


def seed_shelved(engine: InteractionEngine, key: str, center, region="Shelf A") -> None:
    engine.observe_shelf(key, CAM, center, region)


def run_ticks(engine: InteractionEngine, ticks: list[tuple[float, int, list, list]]) -> list[dict]:
    out = []
    for ts, seq, persons, products in ticks:
        out.extend(engine.process_tick(CAM, ts, seq, persons, products))
    return out


def test_pick_requires_sustained_proximity_and_displacement() -> None:
    engine, events = make_engine()
    seed_shelved(engine, f"{CAM}:A123", (38, 100))

    # Shopper stands NEAR the shelf for many ticks; product never moves.
    near_ticks = [(t / 30, t, [person(20)], [product(30)]) for t in range(12)]
    assert run_ticks(engine, near_ticks) == [], "proximity without movement must not pick"

    # Now the product travels WITH the person's hands → sustained + displaced.
    moving = []
    for i, x in enumerate(range(34, 58, 4)):  # product follows the hand region
        moving.append(((12 + i) / 30, 12 + i, [person(x - 8)], [product(x)]))
    picked = run_ticks(engine, moving)
    assert picked, "sustained proximity + displacement must confirm the pick"
    assert picked[0]["event_type"] == EVENT_PICKED
    assert all(e["event_type"] == EVENT_HELD for e in picked[1:]), (
        "carry continuation emits holds after the pick"
    )
    assert picked[0]["from_state"] == "shelf:Shelf A"
    assert picked[0]["to_state"] == f"held:{CAM}:t1"


def test_hold_cadence_then_return_to_different_shelf_is_normal() -> None:
    engine, _ = make_engine(pick_confirm_ticks=2, hold_emit_every=5)
    seed_shelved(engine, f"{CAM}:A123", (38, 100))

    # Pick phase.
    for i, x in enumerate(range(34, 46, 4)):
        engine.process_tick(CAM, (i + 1) / 30, i + 1, [person(x - 8)], [product(x)])
    # Carry for 12 ticks → hold at tick 1 then every 5th.
    hold_events = []
    for i in range(12):
        x = 50 + i * 6
        evs = engine.process_tick(CAM, (20 + i) / 30, 20 + i, [person(x)], [product(x + 14)])
        hold_events += [e for e in evs if e["event_type"] == EVENT_HELD]
    assert hold_events, "first hold must emit"
    assert all(e["to_state"].startswith("held:") for e in hold_events)

    # Place onto Shelf B (a DIFFERENT shelf than origin): the shopper walks
    # away and the product reappears resting on Shelf B with nobody near.
    engine.process_tick(CAM, 33 / 30, 33, [], [])
    ret = engine.process_tick(CAM, 34 / 30, 34, [person(180)], [product(270)])
    returned = [e for e in ret if e["event_type"] == EVENT_RETURNED]
    assert len(returned) == 1
    assert returned[0]["from_state"] == f"held:{CAM}:t1"
    assert returned[0]["to_state"] == "shelf:Shelf B", (
        "returning to another shelf is a normal resolvable outcome, not an error"
    )


def test_confidence_breakdown_present_on_every_event() -> None:
    engine, _ = make_engine()
    seed_shelved(engine, f"{CAM}:A123", (38, 100))
    for i, x in enumerate(range(34, 50, 4)):
        evs = engine.process_tick(CAM, (i + 1) / 30, i + 1, [person(x - 8)], [product(x)])
        for e in evs:
            b = e["confidence_breakdown"]
            assert set(b) == {"person_tracking", "product_detection", "product_association"}


def test_multiperson_ambiguity_flagged_and_capped_not_misattributed() -> None:
    engine, _ = make_engine(pick_confirm_ticks=1)
    # Product was shelved at x≈38 (its true center), now observed far away at
    # x=120 between two equidistant shoppers ⇒ moved + ambiguous association.
    seed_shelved(engine, f"{CAM}:A123", (38, 100))

    # Two shoppers symmetric about the product's new position ⇒ signals within
    # the ambiguity margin; the engine must flag it, rank candidates, and cap
    # confidence rather than confidently picking one of them.
    p1 = PersonObservation(track_key=f"{CAM}:t1", bbox=(98, 50, 128, 130), confidence=0.94)
    p2 = PersonObservation(track_key=f"{CAM}:t2", bbox=(132, 50, 162, 130), confidence=0.93)
    evs = engine.process_tick(CAM, 1 / 30, 1, [p1, p2], [product(120)])
    picks = [e for e in evs if e["event_type"] == EVENT_PICKED]
    assert picks, "pick should still be detected"
    e = picks[0]
    assert e["ambiguous"] is True
    assert set(e["candidate_persons"]) == {f"{CAM}:t1", f"{CAM}:t2"}
    assert e["confidence"] <= 0.70, "ambiguous attribution must be confidence-capped"


def test_standing_near_without_touching_never_picks_even_long() -> None:
    engine, events = make_engine(pick_confirm_ticks=2)
    seed_shelved(engine, f"{CAM}:B222", (44, 100))
    for t in range(60):
        engine.process_tick(CAM, t / 30, t, [person(18)], [product(36, sku="B222")])
    assert not [e for e in events if e["event_type"] == EVENT_PICKED]
