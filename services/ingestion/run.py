"""Phase 4 demo CLI — run ingestion for one or more cameras.

Usage from the repository root:

    python -m services.ingestion.run                        # cameras from the backend API
    python -m services.ingestion.run --camera 6             # a specific backend camera
    python -m services.ingestion.run --source simulation --fps 15 --sink-delay 0.03
    python -m services.ingestion.run --source file --file datasets/processed/demo_clip.mp4

By default camera config is read from the backend (``INGESTION_BACKEND_BASE_URL``),
and per-camera heartbeats are reported to its ``/api/v1/cameras/{id}/heartbeat``
endpoint. ``--sink-delay`` simulates a slow downstream consumer (detection
cost), letting you observe backpressure, dropped-oldest-frame and adaptive-FPS
behaviour in the console.
"""

from __future__ import annotations

import argparse
import logging
import signal
import sys
import threading
import time
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from services.ingestion.camera_config import CameraConfig  # noqa: E402
from services.ingestion.config import IngestionSettings  # noqa: E402
from services.ingestion.factory import build_source  # noqa: E402
from services.ingestion.heartbeat import HeartbeatReporter  # noqa: E402
from services.ingestion.pipeline import CameraPipeline  # noqa: E402
from services.ingestion.sinks import CallbackSink  # noqa: E402

logger = logging.getLogger(__name__)


def _camera_from_backend(backend: str, camera_id: int | None) -> list[dict]:
    """Fetch active file/rtsp/simulation cameras from the backend API."""
    url = f"{backend.rstrip('/')}/api/v1/cameras"
    params: dict = {"page_size": 100}
    if camera_id is not None:
        url = f"{url}/{camera_id}"
        params = {}
    with httpx.Client(timeout=10.0) as client:
        response = client.get(url, params=params)
        response.raise_for_status()
        payload = response.json()
    if camera_id is not None:
        return [payload]
    return [c for c in payload["items"] if c.get("status") not in ("removed", "disabled")]


def _build_configs(args: argparse.Namespace, backend: str) -> list[CameraConfig]:
    if args.source is None:
        payloads = _camera_from_backend(backend, args.camera)
        configs = [CameraConfig.from_api_payload(p) for p in payloads]
        if not configs:
            print("no ingestible cameras returned by the backend", file=sys.stderr)
            raise SystemExit(1)
        # CLI overrides still apply for keys the CLI can express.
        if args.no_loop:
            configs = [_replace(config, loop=False) for config in configs]
        return configs

    return [
        CameraConfig(
            id=str(args.camera) if args.camera is not None else "local",
            name="local-camera",
            source_type=args.source,
            rtsp_url=args.rtsp_url,
            file_path=args.file,
            resolution=(args.width, args.height) if not args.file else None,
            fps=args.fps or 15,
            scale_factor=args.scale_factor,
            loop=not args.no_loop,
        )
    ]


def _replace(config: CameraConfig, **overrides) -> CameraConfig:
    return CameraConfig(**{**config.__dict__, **overrides})


def _sink(delay: float) -> CallbackSink:
    def consume(_frame) -> None:
        if delay > 0:
            time.sleep(delay)

    return CallbackSink(consume)


def _report_row(pipe: CameraPipeline) -> str:
    s = pipe.stats()
    status = "UNHEALTHY" if s["unhealthy"] else "healthy"
    return (
        f" {s['camera_id']:<10} {s['camera_name'][:8]:<8} "
        f"{s['delivered_fps']:>6.1f} {s['latency_ms']:>7.0f} {s['latency_max_ms']:>9.0f} "
        f"{s['dropped']:>6} {s['dropped_ratio'] * 100:>5.1f} "
        f"{s['buffer_used']}/{s['buffer_maxlen']:<3} {status}"
    )


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="SmartRetail AI video ingestion — Phase 4 demo")
    parser.add_argument("--backend", default=None, help="backend base URL (default: INGESTION_BACKEND_BASE_URL)")
    parser.add_argument("--camera", type=int, default=None, help="ingest only this backend camera id")
    parser.add_argument("--source", choices=["rtsp", "file", "simulation"], default=None,
                        help="source type override (used standalone or with --camera)")
    parser.add_argument("--file", default=None, help="video file for a file source")
    parser.add_argument("--rtsp-url", default=None, help="RTSP URL for an rtsp source")
    parser.add_argument("--fps", type=int, default=None, help="override target ingest FPS")
    parser.add_argument("--width", type=int, default=640, help="simulation width")
    parser.add_argument("--height", type=int, default=360, help="simulation height")
    parser.add_argument("--scale-factor", type=float, default=1.0, help="downscale before delivery (0<factor<=1)")
    parser.add_argument("--sink-delay", type=float, default=0.0,
                        help="simulate downstream processing cost (seconds/frame); >0 shows backpressure")
    parser.add_argument("--duration", type=float, default=None, help="run for N seconds then exit")
    parser.add_argument("--stats-interval", type=float, default=1.0, help="console stats refresh interval (s)")
    parser.add_argument("--no-heartbeat", action="store_true", help="do not report heartbeats to the backend")
    parser.add_argument("--no-loop", action="store_true", help="stop at end-of-file instead of looping")
    parser.add_argument("-v", "--verbose", action="store_true", help="enable DEBUG logging")
    args = parser.parse_args(argv)

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s %(levelname)-7s %(name)s %(message)s",
    )

    settings = IngestionSettings()
    backend = (args.backend or settings.backend_base_url).rstrip("/")
    configs = _build_configs(args, backend)

    pipelines: list[CameraPipeline] = []
    for cfg in configs:
        try:
            source = build_source(cfg)
        except ValueError as exc:
            print(f"skip {cfg.id}: {exc}", file=sys.stderr)
            continue
        pipe = CameraPipeline(config=cfg, source=source, sink=_sink(args.sink_delay), settings=settings)
        if not args.no_heartbeat:
            pipe.heartbeat = HeartbeatReporter(
                backend,
                cfg.id,
                pipe.metrics,
                interval_seconds=settings.heartbeat_interval_seconds,
                timeout_seconds=settings.heartbeat_timeout_seconds,
                backoff_base_seconds=settings.heartbeat_backoff_base_seconds,
                latency_warn_ms=settings.latency_warn_threshold_ms,
            )
        pipelines.append(pipe)
        print(f"[{cfg.id}] {cfg.source_type} source -> sink (simulated detection cost={args.sink_delay}s)")

    if not pipelines:
        print("no cameras started", file=sys.stderr)
        return 1

    for pipe in pipelines:
        pipe.start()

    stop_flag = threading.Event()
    if args.duration is not None:
        threading.Timer(args.duration, stop_flag.set).start()
    else:
        signal.signal(signal.SIGINT, lambda *_: stop_flag.set())

    print("\n camera     source    fps     lat ms  max ms  drops  drop%  buf      status")
    try:
        while not stop_flag.is_set():
            for pipe in pipelines:
                print(_report_row(pipe))
                if pipe.metrics.snapshot()["unhealthy"]:
                    print(f"  └─ {pipe.metrics.snapshot()['unhealthy_reason']}")
            print()
            stop_flag.wait(args.stats_interval)
    finally:
        for pipe in pipelines:
            pipe.stop()
        print("ingestion stopped")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())