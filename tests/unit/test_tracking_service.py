"""Unit tests for the TrackingService (detector + tracker + event emission).

Runs the full in-process Phase 5 path on scripted frames — no HTTP, no DB —
asserting the exact lifecycle contract downstream phases consume: opened once,
updated while visible, closed after max_age, nothing dangling at shutdown.
"""

from __future__ import annotations

import numpy as np
import pytest

from services.detection.base import Detection
from services.ingestion.frame import Frame
from services.tracking.events import EVENT_CLOSED, EVENT_OPENED, EVENT_UPDATED
from services.tracking.persistence import BackendTrackSink
from services.tracking.service import TrackingService


def frame(seq: int, ts: float) -> Frame:
    return Frame(
        camera_id="cam1",
        sequence=seq,
        capture_ts=ts,
        received_ts=ts + 0.001,
        data=np.zeros((180, 320, 3), dtype=np.uint8),
    )


class ScriptedDetector:
    """Returns detections only for frames listed in ``schedule``."""

    def __init__(self, schedule: dict[int, list[Detection]]) -> None:
        self.schedule = schedule

    def detect(self, f: Frame) -> list[Detection]:
        return self.schedule.get(f.sequence, [])

    def close(self) -> None:
        pass


def walker(x: float, conf: float = 0.9) -> Detection:
    return Detection(bbox=(x, 60.0, x + 24.0, 130.0), confidence=conf)


class Collector:
    def __init__(self) -> None:
        self.events = []

    def __call__(self, event) -> None:
        self.events.append(event)

    def by_type(self, kind: str):
        return [e for e in self.events if e.event == kind]


def test_one_person_produces_open_update_close_lifecycle() -> None:
    collector = Collector()
    schedule = {i: [walker(10 + i * 4)] for i in range(20)}
    service = TrackingService(
        ScriptedDetector(schedule), tracker_params={"min_hits": 1, "max_age": 5}
    )
    service.event_handlers.append(collector)

    for seq in range(20):
        service.on_frame(frame(seq, seq / 30))
    # Walk out of frame → max_age closes the track.
    for seq in range(20, 27):
        service.on_frame(frame(seq, seq / 30))

    opened = collector.by_type(EVENT_OPENED)
    assert len(opened) == 1
    assert opened[0].track_key == "cam1:1"
    updates = collector.by_type(EVENT_UPDATED)
    assert len(updates) >= 10
    assert all(e.track_key == "cam1:1" for e in opened + updates)
    assert collector.by_type(EVENT_CLOSED), "track must close after max_age without detections"


def test_occlusion_gap_does_not_reopen_a_new_track() -> None:
    collector = Collector()
    schedule = {i: [walker(10 + i * 4)] for i in range(10)}
    # 6-frame scripted gap (occlusion), then the person re-appears nearby.
    schedule |= {i: [walker(50 + (i - 16) * 4)] for i in range(16, 26)}
    service = TrackingService(
        ScriptedDetector(schedule),
        tracker_params={"min_hits": 1, "max_age": 12},
    )
    service.event_handlers.append(collector)
    for seq in range(26):
        service.on_frame(frame(seq, seq / 30))

    opened = collector.by_type(EVENT_OPENED)
    assert len(opened) == 1, "brief occlusion must not fragment into two tracks"
    assert not any(e.attributes.get("reason") == "max_age" for e in collector.by_type(EVENT_CLOSED))


def test_two_simultaneous_people_get_distinct_track_keys() -> None:
    collector = Collector()
    schedule = {i: [walker(10 + i * 2), walker(200 - i * 2)] for i in range(15)}
    service = TrackingService(ScriptedDetector(schedule), tracker_params={"min_hits": 1})
    service.event_handlers.append(collector)
    for seq in range(15):
        service.on_frame(frame(seq, seq / 30))

    keys = {e.track_key for e in collector.by_type(EVENT_OPENED)}
    assert len(keys) == 2
    assert all(k.startswith("cam1:") for k in keys)


def test_service_close_flushes_live_tracks_as_closed() -> None:
    collector = Collector()
    schedule = {i: [walker(10 + i)] for i in range(8)}
    service = TrackingService(ScriptedDetector(schedule), tracker_params={"min_hits": 1})
    service.event_handlers.append(collector)
    for seq in range(8):
        service.on_frame(frame(seq, seq / 30))

    assert not collector.by_type(EVENT_CLOSED)
    service.close()
    closed = collector.by_type(EVENT_CLOSED)
    assert len(closed) == 1 and closed[0].attributes["reason"] == "service_close"


def test_metrics_count_detection_latency_and_fps() -> None:
    service = TrackingService(ScriptedDetector({i: [walker(i)] for i in range(30)}))
    for seq in range(30):
        service.on_frame(frame(seq, seq / 30))
    stats = service.stats()
    assert stats["frames_seen"] == 30
    assert stats["frames_detected"] == 30
    assert stats["detection_fps"] > 0
    assert stats["inference_latency_ms"] >= 0
    assert stats["tracks_opened"] == 1
    assert stats["active_tracks"] == 1


def test_active_tracks_shape_for_dashboard_polling() -> None:
    service = TrackingService(ScriptedDetector({i: [walker(5 + i)] for i in range(6)}),
                              tracker_params={"min_hits": 1})
    for seq in range(6):
        service.on_frame(frame(seq, seq / 30))
    active = service.active_tracks("cam1")
    assert len(active) == 1
    entry = active[0]
    assert entry["track_key"] == "cam1:1"
    assert len(entry["bbox"]) == 4 and entry["confirmed"] is True


# --- persistence sink (offline parts: sampling + op shaping) -----------------


def test_sink_samples_updates_and_shapes_ops(monkeypatch) -> None:
    sink = BackendTrackSink("http://backend.invalid", auto_flush_thread=False, keyframe_every=3)
    posted = []

    def fake_post(url, json=None):
        posted.append(json)
        class R:
            status_code = 200

            def raise_for_status(self):
                pass

        return R()

    monkeypatch.setattr(sink._client, "post", fake_post)

    from services.tracking.events import TrackEvent

    def ev(kind, key, ts):
        return TrackEvent(
            event=kind, camera_id="c", track_key=key, local_track_id=int(key.split(":")[1]),
            ts=ts, frame_sequence=ts, bbox=(1, 2, 3, 4), confidence=0.9, confirmed=True,
            attributes={},
        )

    sink.on_event(ev(EVENT_OPENED, "c:1", 0.0))
    for ts in range(1, 7):  # updates 1..6; every 3rd kept → 2 keyframes
        sink.on_event(ev(EVENT_UPDATED, "c:1", float(ts)))
    sink.on_event(ev(EVENT_CLOSED, "c:1", 7.0))
    n = sink.flush()
    assert n == 4, "open + sampled(2) + close"
    ops = posted[0]["ops"]
    assert [o["op"] for o in ops] == ["open", "update", "update", "close"]
    assert all(isinstance(o["ts"], str) and "T" in o["ts"] for o in ops), "timestamps must be ISO wall-clock"


@pytest.mark.parametrize("bad", [0, -1])
def test_update_every_n_frames_validated(bad: int) -> None:
    with pytest.raises(ValueError):
        TrackingService(ScriptedDetector({}), update_every_n_frames=bad)
