"""Bounded per-camera frame buffering (spec §5 "Frame buffering" / "Frame
dropping under overload").

:class:`FrameBuffer` is a thread-safe bounded queue with **drop-oldest**
semantics: when full, putting a new frame discards the oldest one (a
``collections.deque(maxlen=...)`` does this natively). For a live surveillance
feed the newest frame is always more valuable than an old one, and the *source*
never blocks on a slow downstream consumer — so a momentarily slow consumer
cannot cause unbounded memory growth or stall capture.

The drop is observable, not silent: :meth:`put` returns the dropped frame and
the pipeline counts it into per-camera drop metrics.
"""

from __future__ import annotations

import threading
from collections import deque
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from services.ingestion.frame import Frame


class FrameBuffer:
    def __init__(self, maxlen: int) -> None:
        if maxlen < 1:
            raise ValueError("maxlen must be >= 1")
        self.maxlen = maxlen
        self._queue: deque[Frame] = deque(maxlen=maxlen)
        self._lock = threading.Lock()
        self._not_empty = threading.Condition(self._lock)
        self._closed = False

    def put(self, frame: Frame) -> Frame | None:
        """Enqueue ``frame``, dropping the oldest when full.

        Returns the frame that was evicted (if any) or ``None``. Dropped frames
        are counted by the pipeline, never silently.
        """
        dropped: Frame | None = None
        with self._lock:
            if self._closed:
                return None
            if len(self._queue) == self.maxlen:
                dropped = self._queue.popleft()
            self._queue.append(frame)
            self._not_empty.notify()
        return dropped

    def get(self, timeout: float = 1.0) -> Frame | None:
        """Block up to ``timeout`` seconds for the newest frame (blocking
        consumer). Returns ``None`` on timeout or when the buffer is closed."""
        with self._not_empty:
            if not self._queue:
                self._not_empty.wait(timeout)
            if not self._queue:
                return None
            return self._queue.popleft()

    def get_nowait(self) -> Frame | None:
        with self._lock:
            if not self._queue:
                return None
            return self._queue.popleft()

    def close(self) -> None:
        with self._lock:
            self._closed = True
            self._queue.clear()
            self._not_empty.notify_all()

    def qsize(self) -> int:
        return len(self._queue)

    def full(self) -> bool:
        return len(self._queue) >= self.maxlen

    def clear(self) -> None:
        with self._lock:
            self._queue.clear()