"""Unit tests for the ByteTrack-style single-camera tracker (Phase 5).

Covers the spec's tracking edge cases: identity persistence across brief
occlusions (no id fragmentation), stable ids in crowded scenes, low-confidence
recovery via second-stage association, and deterministic behavior.
"""

from __future__ import annotations

from services.detection.base import Detection
from services.tracking.iou_tracker import SingleCameraTracker, iou_matrix


def det(x1, y1, x2, y2, conf=0.9):
    return Detection(bbox=(float(x1), float(y1), float(x2), float(y2)), confidence=float(conf))


def moving_person(x, conf=0.9):
    """A 24x70 box whose top-left corner is at (x, 60)."""
    return det(x, 60, x + 24, 130, conf)


def test_iou_matrix_basic_overlap() -> None:
    a = [[0, 0, 10, 10]]
    b = [[5, 5, 15, 15], [100, 100, 110, 110]]
    iou = iou_matrix(a, b)
    assert abs(iou[0][0] - (25 / 175)) < 1e-6
    assert iou[0][1] == 0.0


def test_single_person_keeps_one_track() -> None:
    tracker = SingleCameraTracker()
    ids = []
    for x in range(0, 200, 4):  # 50 frames of steady rightward walk
        matches, finished = tracker.update([moving_person(x)])
        assert not finished
        ids.append({tid for tid, _ in matches})
    assert all(len(s) == 1 for s in ids), "exactly one detection must match per frame"
    assert len(set().union(*ids)) == 1, "the same person must keep one stable track id"


def test_brief_occlusion_does_not_fragment_track() -> None:
    tracker = SingleCameraTracker(max_age=30)
    seen_ids: list[int] = []

    for x in range(0, 80, 4):          # approach
        matches, _ = tracker.update([moving_person(x)])
        seen_ids += [tid for tid, _ in matches]
    for _ in range(12):                 # occluded: no detections at all
        matches, finished = tracker.update([])
        assert not finished, "track must survive the scripted gap"
    for x in range(84, 160, 4):         # re-appears just past the column
        matches, _ = tracker.update([moving_person(x)])
        seen_ids += [tid for tid, _ in matches]

    assert len(set(seen_ids)) == 1, "one person before/after an occlusion is one track"


def test_long_absence_closes_track_and_new_id_spawns() -> None:
    tracker = SingleCameraTracker(min_hits=1)
    first_ids: set[int] = set()
    for x in range(0, 40, 8):
        matches, _ = tracker.update([moving_person(x)])
        first_ids |= {tid for tid, _ in matches}
        # advance past max_age with empty frames between sightings
        for _ in range(tracker.max_age + 2):
            _, finished = tracker.update([])
            if finished:
                break

    late_matches, _ = tracker.update([moving_person(300)])
    late_ids = {tid for tid, _ in late_matches}
    assert late_ids.isdisjoint(first_ids), "a fresh appearance after closure gets a new id"


def test_two_people_do_not_merge() -> None:
    tracker = SingleCameraTracker()
    all_ids: set[int] = set()
    for t in range(30):
        dets = [moving_person(10 + t * 3), moving_person(200 - t * 2)]
        matches, _ = tracker.update(dets)
        assert len(matches) == 2, "two distinct people must produce two matches"
        all_ids |= {tid for tid, _ in matches}
    assert len(all_ids) == 2


def test_low_confidence_detection_recovers_occluded_track() -> None:
    tracker = SingleCameraTracker(high_conf_threshold=0.5)
    ids: set[int] = set()
    for x in range(0, 40, 4):
        matches, _ = tracker.update([moving_person(x)])
        ids |= {tid for tid, _ in matches}
    for _ in range(6):
        tracker.update([])  # brief full occlusion
    # Re-appears half-hidden behind the shelf edge → weak confidence.
    weak = moving_person(44, conf=0.32)
    matches, finished = tracker.update([weak])
    assert not finished
    recovered = {tid for tid, _ in matches}
    assert recovered and recovered <= ids, "stage-2 association must re-attach the weak box to the live track"


def test_confirmation_delay_filters_one_frame_noise() -> None:
    tracker = SingleCameraTracker(min_hits=3)
    matches, _ = tracker.update([moving_person(50)])
    tid, d = matches[0]
    state = next(t for t in tracker.pending() if t.track_id == tid)
    assert not state.confirmed, "a single-frame blip must stay tentative"
    for x in (54, 58):
        tracker.update([moving_person(x)])
    state = next(t for t in tracker.pending() if t.track_id == tid)
    assert state.confirmed


def test_association_is_deterministic() -> None:
    def run_once() -> list[int]:
        tracker = SingleCameraTracker()
        order = []
        for t in range(20):
            matches, _ = tracker.update([moving_person(10 + t * 2), moving_person(120 + t * 2)])
            order.extend(tid for tid, _ in matches)
        return order

    assert run_once() == run_once(), "same input stream must yield identical id assignment"


def test_crossing_paths_never_collapse_to_one_track() -> None:
    """Crossing walkers may swap ids (expected, documented §7) but must never
    merge into a single track while both are visible."""
    tracker = SingleCameraTracker(iou_threshold=0.2)
    all_ids: set[int] = set()
    for t in range(40):
        d1 = det(60 + t * 2, 60, 84 + t * 2, 130)
        d2 = det(140 - t * 2, 62, 164 - t * 2, 132)
        matches, _ = tracker.update([d1, d2] if t % 2 == 0 else [d2, d1])
        assert len(matches) == 2
        all_ids |= {tid for tid, _ in matches}
    assert len(all_ids) >= 2
