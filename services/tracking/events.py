"""Track lifecycle events emitted by the tracking service.

Downstream consumers (persistence sink now; Phase 7+ interaction logic and the
dashboard later) subscribe via plain callables. Events are intentionally
small, JSON-serializable records so they can also cross Redis pub/sub
unchanged.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

EVENT_OPENED = "track.opened"
EVENT_UPDATED = "track.updated"
EVENT_CLOSED = "track.closed"


@dataclass(frozen=True)
class TrackEvent:
    """One lifecycle transition of a single-camera track.

    ``track_key`` is globally unique per process run —
    ``"{camera_id}:{local_track_id}"`` — and is what persistence idempotently
    keys on (safe redelivery after reconnects). ``ts`` is the frame's capture
    time on the monotonic clock; ``wall_ts`` the corresponding UTC wall-clock
    datetime (ISO string once serialized).
    """

    event: str            # EVENT_OPENED / EVENT_UPDATED / EVENT_CLOSED
    camera_id: str
    track_key: str
    local_track_id: int
    ts: float             # monotonic capture seconds
    frame_sequence: int
    bbox: tuple[float, float, float, float]
    confidence: float
    confirmed: bool
    attributes: dict[str, Any]

    def to_payload(self) -> dict[str, Any]:
        return {
            "event": self.event,
            "camera_id": self.camera_id,
            "track_key": self.track_key,
            "local_track_id": self.local_track_id,
            "ts": self.ts,
            "frame_sequence": self.frame_sequence,
            "bbox": list(self.bbox),
            "confidence": round(self.confidence, 4),
            "confirmed": self.confirmed,
            "attributes": self.attributes,
        }
