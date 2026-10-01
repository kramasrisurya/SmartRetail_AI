"""The downstream hand-off contract for Phase 5 (spec §5 frame hand-off).

Chosen transport — **in-process, via the pipeline's :class:`FrameBuffer`, for
local dev and the demo** — a :class:`FrameSink` receives :class:`Frame` objects
straight. This is the simplest thing that works and is exactly what Phase 5
subscribes to when the detection service runs alongside ingestion in the same
process (the default for local development and this demo).

For genuinely separate processes, :class:`RedisFramePublisher` forwards frames
over Redis pub/sub in a fixed wire format so Phase 5 can be started as an
independent service from day one. Wire format documented below.
"""

from __future__ import annotations

import base64
import json
import logging
from typing import Protocol, runtime_checkable

import cv2

from services.ingestion.frame import Frame

logger = logging.getLogger(__name__)


@runtime_checkable
class FrameSink(Protocol):
    """Anything that consumes :class:`Frame` objects (Phase 5 detection)."""

    def on_frame(self, frame: Frame) -> None: ...

    def start(self) -> None: ...

    def close(self) -> None: ...


class NullSink:
    """Dev/null consumer — base case for tests and the demo's fast sink."""

    def on_frame(self, frame: Frame) -> None:
        pass

    def start(self) -> None:
        pass

    def close(self) -> None:
        pass


class CallbackSink:
    """Wrap a plain ``callable`` as a :class:`FrameSink`."""

    def __init__(self, handler) -> None:
        self._handler = handler

    def on_frame(self, frame: Frame) -> None:
        self._handler(frame)

    def start(self) -> None:
        pass

    def close(self) -> None:
        pass


class RedisFramePublisher:
    """Forward frames to a Redis pub/sub channel for a separate Phase 5 process.

    **Wire format** (channel ``smartretail:frames:{camera_id}``):

    One byte message per frame: a UTF-8 JSON document with
    ``camera_id``, ``sequence``, ``capture_ts``, ``received_ts``, ``width``,
    ``height`` and ``jpeg`` (base64-encoded JPEG bytes of the RGB frame). The
    detection service decodes ``jpeg`` and uses ``capture_ts`` for ordering.
    """

    def __init__(self, channel_prefix: str = "smartretail:frames", quality: int = 85, **redis_kwargs) -> None:
        self._prefix = channel_prefix
        self._quality = quality
        self._redis_kwargs = redis_kwargs
        self._client = None

    def start(self) -> None:
        import redis

        self._client = redis.Redis(**self._redis_kwargs)
        self._client.ping()

    def close(self) -> None:
        if self._client is not None:
            try:
                self._client.close()
            except Exception:
                pass
        self._client = None

    def on_frame(self, frame: Frame) -> None:
        if self._client is None:
            raise RuntimeError("RedisFramePublisher.start() must be called first")
        try:
            ok, buf = cv2.imencode(".jpg", frame.data[..., ::-1], [int(cv2.IMWRITE_JPEG_QUALITY), self._quality])
            if not ok:
                logger.warning("JPEG encode failed (camera %s seq %d)", frame.camera_id, frame.sequence)
                return
            message = json.dumps(
                {
                    "camera_id": frame.camera_id,
                    "sequence": frame.sequence,
                    "capture_ts": frame.capture_ts,
                    "received_ts": frame.received_ts,
                    "width": frame.width,
                    "height": frame.height,
                    "jpeg": base64.b64encode(buf.tobytes()).decode("ascii"),
                },
                separators=(",", ":"),
            )
            self._client.publish(f"{self._prefix}:{frame.camera_id}", message)
        except Exception:
            logger.exception("failed to publish frame for camera %s", frame.camera_id)