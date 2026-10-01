"""Single-camera tracking service (Phase 5).

See :mod:`services.tracking.service` for the frame consumer and
:mod:`services.tracking.iou_tracker` for the association core.
"""

from services.tracking.events import EVENT_CLOSED, EVENT_OPENED, EVENT_UPDATED, TrackEvent
from services.tracking.iou_tracker import SingleCameraTracker, TrackState, iou_matrix
from services.tracking.service import TrackingService

__all__ = [
    "EVENT_CLOSED",
    "EVENT_OPENED",
    "EVENT_UPDATED",
    "SingleCameraTracker",
    "TrackEvent",
    "TrackState",
    "TrackingService",
    "iou_matrix",
]
