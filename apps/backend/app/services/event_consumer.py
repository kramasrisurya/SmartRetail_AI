"""Kafka consumer that ingests edge-to-cloud envelopes into PostgreSQL.

Edge devices publish lightweight JSON metadata (never raw video) to a Kafka
topic. This consumer drains the topic at the database's pace, so a burst of
foot traffic is absorbed by the broker instead of saturating the REST API.

Delivery semantics
------------------
* **At-least-once.** Offsets are committed only after the database commit. A
  crash between commit and offset commit redelivers the batch; ``message_id``
  de-duplication (Redis, best effort) and idempotent track upserts bound the
  effect.
* **Poison messages go to the dead-letter topic.** Anything that can never
  succeed (bad JSON, schema violation, unknown camera) is republished to
  ``KAFKA_DLQ_TOPIC`` with the failure reason in headers, then skipped, so one
  bad message cannot wedge a partition.
* **Transient failures are retried, never skipped.** Database or broker errors
  rewind the partition to the first unprocessed offset and back off
  exponentially. Nothing is dropped while the database is down.
* **Per-partition ordering.** Producers key by camera, so a track's
  ``open`` always precedes its ``update``/``close``.

Scale out by running more replicas (``python -m app.worker``); partitions are
rebalanced across the consumer group automatically.
"""

from __future__ import annotations

import asyncio
import contextlib
import json
import logging
import ssl
import time
from collections.abc import Callable
from dataclasses import asdict, dataclass
from typing import Any

from aiokafka import AIOKafkaConsumer, AIOKafkaProducer, TopicPartition
from aiokafka.admin import AIOKafkaAdminClient, NewTopic
from aiokafka.errors import KafkaError, TopicAlreadyExistsError
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.schemas.events import EdgeEnvelope, EventBatch
from app.api.v1.schemas.tracks import TrackBatch
from app.core import redis as redis_store
from app.core.config import Settings, get_settings
from app.services.ingest import UnknownCameraError, apply_track_ops, persist_event_batch

logger = logging.getLogger("smartretail.consumer")

SessionFactory = Callable[[], AsyncSession]


class PermanentMessageError(Exception):
    """The message can never be processed successfully; dead-letter it."""


@dataclass
class ConsumerStats:
    connected: bool = False
    processed: int = 0
    duplicates: int = 0
    dead_lettered: int = 0
    transient_failures: int = 0
    reconnects: int = 0
    last_error: str | None = None
    last_message_at: float | None = None


def _dedupe_key(message_id: str) -> str:
    return f"edge:msg:{message_id}"


async def process_message(
    raw: bytes | str | None,
    *,
    session_factory: SessionFactory,
    dedupe_ttl_seconds: int = 3600,
) -> str:
    """Validate and persist one envelope.

    Returns ``"processed"`` or ``"duplicate"``. Raises
    :class:`PermanentMessageError` for messages that must be dead-lettered; any
    other exception is transient and the caller retries the message.
    """
    if not raw:
        raise PermanentMessageError("empty message body")
    try:
        decoded = json.loads(raw)
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise PermanentMessageError(f"invalid JSON: {exc}") from exc

    try:
        envelope = EdgeEnvelope.model_validate(decoded)
        body: EventBatch | TrackBatch
        if envelope.kind == "events":
            body = EventBatch.model_validate(envelope.payload)
        else:
            body = TrackBatch.model_validate(envelope.payload)
    except ValidationError as exc:
        raise PermanentMessageError(f"schema violation: {exc.errors(include_url=False)[:3]}") from exc

    key = _dedupe_key(envelope.message_id)
    try:
        if await redis_store.was_seen(key):
            return "duplicate"
    except Exception:
        logger.debug("dedupe lookup unavailable; processing without it", exc_info=True)

    async with session_factory() as session:
        try:
            if isinstance(body, EventBatch):
                await persist_event_batch(session, body)
            else:
                await apply_track_ops(session, body)
        except UnknownCameraError as exc:
            await session.rollback()
            raise PermanentMessageError(str(exc)) from exc

    try:
        await redis_store.mark_seen(key, dedupe_ttl_seconds)
    except Exception:
        logger.debug("dedupe mark unavailable", exc_info=True)
    return "processed"


def kafka_client_kwargs(settings: Settings) -> dict[str, Any]:
    """Connection/security kwargs shared by consumer, producer and admin client."""
    kwargs: dict[str, Any] = {
        "bootstrap_servers": settings.kafka_bootstrap_servers,
        "security_protocol": settings.kafka_security_protocol,
    }
    if settings.kafka_security_protocol.upper() in {"SSL", "SASL_SSL"}:
        kwargs["ssl_context"] = ssl.create_default_context()
    if settings.kafka_sasl_mechanism:
        kwargs.update(
            sasl_mechanism=settings.kafka_sasl_mechanism,
            sasl_plain_username=settings.kafka_sasl_username,
            sasl_plain_password=settings.kafka_sasl_password,
        )
    return kwargs


class EdgeEventConsumer:
    """Long-running consumer with reconnect, retry and dead-letter handling."""

    def __init__(self, settings: Settings | None = None, session_factory: SessionFactory | None = None) -> None:
        self._settings = settings or get_settings()
        if session_factory is None:
            from app.db.session import get_session_maker

            session_factory = get_session_maker()
        self._session_factory = session_factory
        self._consumer: AIOKafkaConsumer | None = None
        self._dlq: AIOKafkaProducer | None = None
        self._stopping = asyncio.Event()
        self.stats = ConsumerStats()

    def status(self) -> dict[str, Any]:
        return {"backend": "kafka", "topic": self._settings.kafka_events_topic, **asdict(self.stats)}

    def stop(self) -> None:
        self._stopping.set()

    async def run(self) -> None:
        """Consume until :meth:`stop` is called or the task is cancelled."""
        backoff = self._settings.kafka_retry_backoff_seconds
        while not self._stopping.is_set():
            try:
                await self._connect()
                backoff = self._settings.kafka_retry_backoff_seconds
                await self._consume_loop()
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                self.stats.last_error = f"{type(exc).__name__}: {exc}"
                self.stats.reconnects += 1
                logger.warning("consumer error (%s); retrying in %.1fs", self.stats.last_error, backoff)
                await self._disconnect()
                await self._sleep(backoff)
                backoff = min(backoff * 2, self._settings.kafka_max_retry_backoff_seconds)
        await self._disconnect()

    async def _sleep(self, seconds: float) -> None:
        with contextlib.suppress(TimeoutError):
            await asyncio.wait_for(self._stopping.wait(), timeout=seconds)

    async def _ensure_topics(self) -> None:
        s = self._settings
        if not s.kafka_auto_create_topics:
            return
        admin = AIOKafkaAdminClient(**kafka_client_kwargs(s))
        try:
            await admin.start()
            for name in (s.kafka_events_topic, s.kafka_dlq_topic):
                try:
                    await admin.create_topics(
                        [
                            NewTopic(
                                name=name,
                                num_partitions=s.kafka_topic_partitions,
                                replication_factor=s.kafka_topic_replication_factor,
                            )
                        ]
                    )
                    logger.info("created topic %s (%d partitions)", name, s.kafka_topic_partitions)
                except TopicAlreadyExistsError:
                    pass
        except Exception:
            # Best effort: the broker may forbid it or auto-create may be on.
            logger.warning("topic provisioning skipped", exc_info=True)
        finally:
            await admin.close()

    async def _connect(self) -> None:
        s = self._settings
        await self._ensure_topics()
        kwargs = kafka_client_kwargs(s)
        self._consumer = AIOKafkaConsumer(
            s.kafka_events_topic,
            group_id=s.kafka_consumer_group,
            enable_auto_commit=False,
            auto_offset_reset="earliest",
            max_poll_records=s.kafka_max_poll_records,
            session_timeout_ms=30000,
            **kwargs,
        )
        self._dlq = AIOKafkaProducer(acks="all", enable_idempotence=True, **kwargs)
        await self._consumer.start()
        await self._dlq.start()
        self.stats.connected = True
        logger.info("consuming %s as group %s", s.kafka_events_topic, s.kafka_consumer_group)

    async def _disconnect(self) -> None:
        self.stats.connected = False
        for client in (self._consumer, self._dlq):
            if client is not None:
                try:
                    await client.stop()
                except Exception:
                    logger.debug("error stopping kafka client", exc_info=True)
        self._consumer = None
        self._dlq = None

    async def _consume_loop(self) -> None:
        assert self._consumer is not None
        consumer = self._consumer
        s = self._settings
        while not self._stopping.is_set():
            batches = await consumer.getmany(timeout_ms=s.kafka_poll_timeout_ms, max_records=s.kafka_max_poll_records)
            if not batches:
                continue
            progress: dict[TopicPartition, int] = {}
            try:
                for tp, records in batches.items():
                    for record in records:
                        await self._handle_record(record)
                        progress[tp] = record.offset + 1
                await consumer.commit()
            except Exception:
                # Rewind each partition to its first unprocessed record so that
                # nothing is skipped, and persist the progress already made.
                for tp, records in batches.items():
                    consumer.seek(tp, progress.get(tp, records[0].offset))
                if progress:
                    await consumer.commit(progress)
                self.stats.transient_failures += 1
                raise

    async def _handle_record(self, record: Any) -> None:
        try:
            outcome = await process_message(
                record.value,
                session_factory=self._session_factory,
                dedupe_ttl_seconds=self._settings.consumer_dedupe_ttl_seconds,
            )
        except PermanentMessageError as exc:
            await self._dead_letter(record, str(exc))
            return
        if outcome == "duplicate":
            self.stats.duplicates += 1
        else:
            self.stats.processed += 1
        self.stats.last_message_at = time.time()

    async def _dead_letter(self, record: Any, reason: str) -> None:
        assert self._dlq is not None
        logger.warning(
            "dead-lettering %s[%d]@%d: %s", record.topic, record.partition, record.offset, reason
        )
        headers = [
            ("dlq.reason", reason.encode("utf-8")[:1024]),
            ("dlq.source_topic", record.topic.encode()),
            ("dlq.source_partition", str(record.partition).encode()),
            ("dlq.source_offset", str(record.offset).encode()),
        ]
        try:
            await self._dlq.send_and_wait(
                self._settings.kafka_dlq_topic, value=record.value, key=record.key, headers=headers
            )
        except KafkaError as exc:
            # Never drop a message we failed to park: surface as transient.
            raise RuntimeError(f"dead-letter publish failed: {exc}") from exc
        self.stats.dead_lettered += 1
