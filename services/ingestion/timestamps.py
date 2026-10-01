"""Timestamp synchronization (spec §5 "Timestamp synchronization").

Two tools work together to give every downstream frame a precise, monotonic
capture timestamp on the process's monotonically increasing clock:

- :class:`TimelineClock` maps a source's *media* timestamps (container PTS, in
  seconds) onto the monotonic clock by anchoring the first frame at arrival
  time. File-based sources therefore get exact frame timing; because both the
  anchor and the media deltas are known, gaps, drops and per-frame spacing are
  preserved.
- :class:`JitterSmoother` approximates capture time for sources with no usable
  PTS (some RTSP feeds) from arrival time, smoothing network jitter with an
  exponential moving average so per-camera event ordering stays stable.

The pipeline enforces per-camera monotonicity on top of both (clamping), which
is the guarantee Phase 8 (camera handoff) and Phase 11 (journey reconstruction)
depend on.
"""

from __future__ import annotations

_EPS = 1e-4


class TimelineClock:
    """Map a source's PTS timeline onto this process's monotonic clock.

    The first frame of a feed epoch is anchored at its arrival instant, and
    every subsequent frame is placed at ``anchor arrival + (pts - anchor pts)``.
    For file sources this reproduces the container's exact frame timing while
    grounding it on the service's clock, so frames from different cameras/copies
    are comparable and correctly ordered.

    When a feed loops or reconnects (:meth:`on_restart`), the timeline continues
    from the previous epoch's last capture timestamp instead of snapping back to
    zero, preserving cross-epoch monotonicity.
    """

    def __init__(self) -> None:
        self._base: float | None = None
        self._anchor_pts: float | None = None
        self._continued_from: float | None = None

    @property
    def anchored(self) -> bool:
        return self._anchor_pts is not None

    def set_anchor(self, pts_seconds: float, arrival_mono: float) -> None:
        """Anchor a new feed epoch at ``arrival_mono`` for frame-time ``pts``."""
        if self._continued_from is not None:
            base = self._continued_from
            self._continued_from = None
        else:
            base = arrival_mono
        self._base = base
        self._anchor_pts = pts_seconds

    def on_restart(self, latest_capture: float) -> None:
        """Mark that the feed restarted; next epoch continues at ``latest_capture``."""
        self._continued_from = latest_capture
        self._anchor_pts = None

    def to_capture(self, pts_seconds: float) -> float:
        """Map a media PTS to a monotonic-clock capture timestamp."""
        if self._anchor_pts is None or self._base is None:
            raise RuntimeError("TimelineClock.set_anchor() must be called before to_capture()")
        return self._base + (pts_seconds - self._anchor_pts)


class JitterSmoother:
    """Exponentially-smoothed estimate of this process's clock at capture time.

    We cannot observe the true capture instant, so we smooth arrival times and
    nudge the estimate just behind real arrival — this yields a stable
    capture-time approximation that never runs ahead of reality.
    """

    def __init__(self, alpha: float = 0.2) -> None:
        self._alpha = alpha
        self._estimate: float | None = None

    def reset(self) -> None:
        self._estimate = None

    def update(self, now: float) -> float:
        if self._estimate is None:
            self._estimate = now
            return now
        self._estimate += self._alpha * (now - self._estimate)
        # Capture cannot be later than arrival; guard against the estimate
        # drifting past the latest observation in pathological timing.
        return min(self._estimate, now - _EPS)


def clamp_monotonic(candidate: float, last: float) -> float:
    """Return a per-camera monotonic capture timestamp at least ``last + eps``."""
    return max(candidate, last + _EPS)