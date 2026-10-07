"""Edge-to-Cloud Kafka Event & Track Producer (Phase 1).

Pushes lightweight JSON metadata (detections, tracks, anomalies) from local edge
cameras to an asynchronous message broker (Kafka topic). Raw video upload is
strictly prohibited.

Key Features:
- Packages payloads conforming to the `EdgeEnvelope` wire contract.
- Message keying by `camera_id` to guarantee per-camera partition ordering.
- Buffering with periodic flush or max-batch-size threshold.
- Non-blocking asynchronous & thread-safe dispatch.
"""

from __future__ import annotations

import asyncio
import json
import logging
import threading
import time
import uuid
from datetime import UTC, datetime
from typing import Any

from aiokafka import AIOKafkaProducer

logger = logging.getLogger(__name__)


def _now_iso() -> str:
    return datetime.now(UTC).isoformat()


class KafkaEdgeProducer:
    """Thread-safe, batched Kafka producer for edge inference services."""

    def __init__(
        self,
        bootstrap_servers: str = "localhost:9092",
        topic: str = "smartretail.edge.events",
        edge_id: str = "edge-node-01",
        *,
        flush_interval_seconds: float = 1.0,
        max_buffer: int = 128,
        keyframe_every: int = 5,
        security_protocol: str = "PLAINTEXT",
    ) -> None:
        self.bootstrap_servers = bootstrap_servers
        self.topic = topic
        self.edge_id = edge_id
        self.flush_interval = flush_interval_seconds
        self.max_buffer = max_buffer
        self.keyframe_every = max(1, keyframe_every)
        self.security_protocol = security_protocol

        self._track_buffer: list[dict[str, Any]] = []
        self._event_buffer: list[dict[str, Any]] = []
        self._lock = threading.Lock()
        self._stop = threading.Event()
        self._update_counts: dict[str, int] = {}

        self.messages_published = 0
        self.publish_errors = 0
        self.last_error: str | None = None

        self._loop: asyncio.AbstractEventLoop | None = None
        self._producer: AIOKafkaProducer | None = None
        self._thread: threading.Thread | None = threading.Thread(
            target=self._run_event_loop, name="kafka-edge-producer", daemon=True
        )

    def start(self) -> None:
        if self._thread and not self._thread.is_alive():
            self._thread.start()

    def close(self) -> None:
        self._stop.set()
        if self._loop and self._producer:
            future = asyncio.run_coroutine_threadsafe(self._flush_and_stop(), self._loop)
            try:
                future.result(timeout=5.0)
            except Exception:
                logger.warning("producer close timed out", exc_info=True)

    def _run_event_loop(self) -> None:
        self._loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self._loop)
        self._loop.run_until_complete(self._main_loop())

    async def _main_loop(self) -> None:
        try:
            self._producer = AIOKafkaProducer(
                bootstrap_servers=self.bootstrap_servers,
                security_protocol=self.security_protocol,
                acks="all",
                enable_idempotence=True,
            )
            await self._producer.start()
            logger.info("Kafka edge producer connected to %s on topic %s", self.bootstrap_servers, self.topic)
        except Exception as exc:
            self.last_error = str(exc)
            logger.error("Failed to connect Kafka edge producer: %s", exc)
            return

        try:
            while not self._stop.is_set():
                await asyncio.sleep(self.flush_interval)
                await self._flush_internal()
        finally:
            await self._flush_internal()
            if self._producer:
                await self._producer.stop()

    async def _flush_and_stop(self) -> None:
        await self._flush_internal()
        if self._producer:
            await self._producer.stop()

    def on_track_event(self, event: Any) -> None:
        """Handler conforming to TrackingService event callbacks."""
        op_kind = getattr(event, "event", "")
        track_key = getattr(event, "track_key", "")
        if "update" in op_kind:
            cnt = self._update_counts.get(track_key, 0) + 1
            self._update_counts[track_key] = cnt
            if cnt % self.keyframe_every != 0:
                return

        kind_map = {
            "track.opened": "open",
            "track.updated": "update",
            "track.closed": "close",
        }
        mapped_op = kind_map.get(op_kind, "update")
        cam_id = getattr(event, "camera_id", "1")
        try:
            numeric_cam_id = int("".join(filter(str.isdigit, str(cam_id))) or 1)
        except Exception:
            numeric_cam_id = 1

        op: dict[str, Any] = {
            "op": mapped_op,
            "track_key": track_key,
            "camera_id": numeric_cam_id,
            "ts": _now_iso(),
            "bbox": [round(float(v), 2) for v in getattr(event, "bbox", [0, 0, 0, 0])],
            "confidence": round(float(getattr(event, "confidence", 0.9)), 4),
            "confirmed": bool(getattr(event, "confirmed", False)),
        }

        with self._lock:
            self._track_buffer.append(op)
            should_flush = len(self._track_buffer) >= self.max_buffer

        if should_flush and self._loop:
            asyncio.run_coroutine_threadsafe(self._flush_internal(), self._loop)

    def on_generic_event(self, payload: dict[str, Any]) -> None:
        """Publish interaction / product / security anomaly events."""
        with self._lock:
            self._event_buffer.append(payload)
            should_flush = len(self._event_buffer) >= self.max_buffer

        if should_flush and self._loop:
            asyncio.run_coroutine_threadsafe(self._flush_internal(), self._loop)

    async def _flush_internal(self) -> None:
        if not self._producer:
            return

        with self._lock:
            tracks_to_send = self._track_buffer[:]
            self._track_buffer.clear()
            events_to_send = self._event_buffer[:]
            self._event_buffer.clear()

        if tracks_to_send:
            await self._publish_envelope(
                kind="tracks",
                payload={"ops": tracks_to_send},
                camera_key=str(tracks_to_send[0].get("camera_id", "1")),
            )

        if events_to_send:
            await self._publish_envelope(
                kind="events",
                payload={"events": events_to_send},
                camera_key=str(events_to_send[0].get("camera_id", "1")),
            )

    async def _publish_envelope(self, kind: str, payload: dict[str, Any], camera_key: str) -> None:
        envelope = {
            "schema_version": 1,
            "kind": kind,
            "message_id": f"msg-{uuid.uuid4().hex[:16]}",
            "edge_id": self.edge_id,
            "produced_at": _now_iso(),
            "payload": payload,
        }
        raw_bytes = json.dumps(envelope).encode("utf-8")
        try:
            assert self._producer is not None
            await self._producer.send_and_wait(
                self.topic,
                value=raw_bytes,
                key=camera_key.encode("utf-8"),
            )
            self.messages_published += 1
            self.last_error = None
        except Exception as exc:
            self.publish_errors += 1
            self.last_error = str(exc)
            logger.warning("Failed to publish edge envelope to Kafka: %s", exc)
