"""Optional pose hook (spec module 13) for wrist keypoints.

When MediaPipe is installed and a person crop yields wrist landmarks, the
association layer uses the wrist point as the primary hand-proximity signal.
Like the Phase 6 hooks this degrades gracefully: ``AVAILABLE`` flips False on
missing dependencies and ``wrist_point`` returns None - the documented bbox
heuristic takes over transparently (see association.py).
"""

from __future__ import annotations

import logging

import numpy as np

logger = logging.getLogger(__name__)

try:  # pragma: no cover - depends on host packages
    import mediapipe as _mp

    _POSE = _mp.solutions.pose.Pose(static_image_mode=True, model_complexity=0)
    AVAILABLE = True
except Exception as exc:
    _mp = None
    _POSE = None
    AVAILABLE = False
    logger.info("mediapipe unavailable (%s); pose wrist hook disabled", type(exc).__name__)

# MediaPipe pose landmark indices.
LEFT_WRIST = 15
RIGHT_WRIST = 16


def wrist_point(person_crop_rgb: np.ndarray) -> tuple[float, float] | None:
    """Most-visible wrist landmark in crop-pixel coords, or None."""
    if not AVAILABLE:
        return None
    try:  # pragma: no cover - depends on host packages
        result = _POSE.process(person_crop_rgb)
        if not result.pose_landmarks:
            return None
        h, w = person_crop_rgb.shape[:2]
        lm = result.pose_landmarks.landmark
        left, right = lm[LEFT_WRIST], lm[RIGHT_WRIST]
        chosen = left if left.visibility >= right.visibility else right
        if chosen.visibility < 0.5:
            return None
        return (chosen.x * w, chosen.y * h)
    except Exception:
        logger.exception("pose wrist extraction failed")
        return None


def close() -> None:  # pragma: no cover
    if _POSE is not None:
        try:
            _POSE.close()
        except Exception:
            pass
