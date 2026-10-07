"""Standalone event-consumer process: ``python -m app.worker``.

Run this as its own deployment so ingestion capacity scales independently of the
API (consumers per group are capped by the topic's partition count). It always
runs the Kafka consumer regardless of ``BROKER_BACKEND``, which exists only to
opt the API process into running the consumer in-process for single-node setups.
"""

from __future__ import annotations

import asyncio
import contextlib
import logging
import signal

from app.core.config import get_settings
from app.core.redis import close_redis
from app.db.session import close_database
from app.services.event_consumer import EdgeEventConsumer


async def _run() -> None:
    settings = get_settings()
    logging.basicConfig(
        level=settings.log_level.upper(),
        format="%(asctime)s [%(levelname)s] (worker) %(name)s: %(message)s",
    )
    consumer = EdgeEventConsumer(settings)

    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        # add_signal_handler is unavailable on Windows event loops; Ctrl+C still
        # surfaces as KeyboardInterrupt there.
        with contextlib.suppress(NotImplementedError):
            loop.add_signal_handler(sig, consumer.stop)

    try:
        await consumer.run()
    finally:
        await close_redis()
        await close_database()


def main() -> None:
    with contextlib.suppress(KeyboardInterrupt):
        asyncio.run(_run())


if __name__ == "__main__":
    main()
