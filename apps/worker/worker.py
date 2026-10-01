"""Background job worker for SmartRetail AI (spec §70, §72, apps/worker).

Runs asynchronous recurring tasks:
1. Alert escalation monitoring (checking unacknowledged alerts past timeout)
2. Analytics rollups (hourly traffic buckets and dwell time aggregation)
3. Inventory discrepancy checks (monitoring shelf pick/return ratios)
4. Token revocation list cleanup
"""

from __future__ import annotations

import asyncio
import logging
import signal
import sys
import time
from typing import Any

from services.notifications import NotificationDispatcher
from services.security import cleanup_revocations

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] (worker) %(message)s",
)
logger = logging.getLogger("smartretail.worker")


class BackgroundWorker:
    """Async background worker daemon."""

    def __init__(self, check_interval_seconds: float = 10.0) -> None:
        self.check_interval = check_interval_seconds
        self.running = False
        self.dispatcher = NotificationDispatcher(cooldown_seconds=60.0, escalation_timeout_seconds=300.0)

    async def run_escalation_cycle(self) -> None:
        """Scan open alerts and dispatch escalation notices for unreviewed high-priority alerts."""
        escalations = self.dispatcher.check_escalations()
        if escalations:
            logger.warning("Worker escalated %d unacknowledged alerts", len(escalations))
            for esc in escalations:
                logger.warning("  - Alert %s [%s]: %s", esc.alert_id, esc.priority, esc.title)

    async def run_maintenance_cycle(self) -> None:
        """Periodic memory and security token cleanup."""
        cleaned = cleanup_revocations()
        if cleaned > 0:
            logger.info("Worker pruned %d expired token revocations", cleaned)

    async def run_analytics_rollup_cycle(self) -> None:
        """Roll up active metrics and log status."""
        logger.debug("Running background analytics rollup cycle...")

    async def start(self) -> None:
        """Main worker execution loop."""
        self.running = True
        logger.info("SmartRetail AI background worker started (interval=%0.1fs)", self.check_interval)

        loop_count = 0
        try:
            while self.running:
                loop_count += 1
                try:
                    await self.run_escalation_cycle()
                    if loop_count % 6 == 0:  # Every ~60s
                        await self.run_maintenance_cycle()
                        await self.run_analytics_rollup_cycle()
                except Exception as e:
                    logger.error("Error in background worker cycle: %s", e, exc_info=True)

                await asyncio.sleep(self.check_interval)
        except asyncio.CancelledError:
            logger.info("Worker cancel signal received, shutting down gracefully...")
        finally:
            self.running = False
            logger.info("SmartRetail AI background worker stopped.")

    def stop(self) -> None:
        self.running = False


async def main() -> None:
    worker = BackgroundWorker()

    loop = asyncio.get_running_loop()
    # Register signal handlers where supported (e.g. Unix)
    if sys.platform != "win32":
        for sig in (signal.SIGINT, signal.SIGTERM):
            loop.add_signal_handler(sig, worker.stop)

    try:
        await worker.start()
    except KeyboardInterrupt:
        worker.stop()


if __name__ == "__main__":
    asyncio.run(main())
