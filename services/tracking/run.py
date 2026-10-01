"""Phase 5 demo runner: ingestion pipeline -> detection -> tracking.

Wires the full in-process path end to end and prints live stats:

    python -m services.tracking.run --scenario services/tracking/scenarios/demo_two_people.json
    python -m services.tracking.run --mode yolo --camera 12   # real model, seeded camera

Simulation mode replays a scripted scenario through a real SimulatedSource +
CameraPipeline so timestamps, pacing, and drops behave exactly as production.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import time
from pathlib import Path

import numpy as np

from services.detection.base import build_detector
from services.ingestion.camera_config import CameraConfig
from services.ingestion.factory import build_source
from services.ingestion.pipeline import CameraPipeline
from services.tracking.service import TrackingService

logger = logging.getLogger(__name__)


def _scenario_frame_source(scenario_path: Path):
    """Drive the tracking service directly from scripted frames (no wall clock)."""
    data = json.loads(scenario_path.read_text(encoding="utf-8"))
    fps = int(data.get("fps", 30))
    w, h = data.get("resolution", [320, 180])
    detector = build_detector(mode="simulation", scenario_path=str(scenario_path))
    # Scenarios declare their own tracker tolerances (e.g. a scripted occlusion
    # longer than the default max_age must not fragment the track).
    service = TrackingService(detector, tracker_params=dict(data.get("tracker", {})))

    def run() -> dict:
        duration = float(data.get("duration_s", 10.0))
        total = int(duration * fps)
        for seq in range(total):
            frame = _make_frame("sim", seq, seq / fps, w, h)
            service.on_frame(frame)
        stats = service.stats()
        service.close()
        return stats

    return service, run


def _make_frame(camera_id: str, seq: int, ts: float, w: int, h: int):
    from services.ingestion.frame import Frame

    data = np.zeros((h, w, 3), dtype=np.uint8)
    return Frame(camera_id=camera_id, sequence=seq, capture_ts=ts, received_ts=ts + 0.001, data=data)


async def _run_live(args: argparse.Namespace) -> None:
    """Real pipeline path (file/simulation source) with per-frame detection."""
    detector = build_detector(
        mode=args.mode,
        scenario_path=args.scenario,
        detection_model=args.model,
        confidence_threshold=args.confidence,
    )
    cfg = CameraConfig(
        id=args.camera or "sim",
        source_type="simulation" if not args.video else "file",
        file_path=args.video,
        resolution=(320, 180),
        fps=args.fps,
        loop=not args.no_loop,
    )
    service = TrackingService(detector)
    pipe = CameraPipeline(config=cfg, source=build_source(cfg), sink=service)
    pipe.start()
    try:
        deadline = time.monotonic() + args.duration
        while time.monotonic() < deadline:
            await asyncio.sleep(1.0)
            print(f"pipeline={pipe.stats()}  tracking={service.stats()}")
    finally:
        pipe.stop()
        service.close()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--mode", choices=["simulation", "yolo"], default="simulation")
    parser.add_argument("--scenario", type=Path, help="Scenario JSON for simulation mode")
    parser.add_argument("--video", type=Path, help="Video file for file-source mode")
    parser.add_argument("--model", default=None, help="YOLO model name (default yolov8n.pt)")
    parser.add_argument("--confidence", type=float, default=0.35)
    parser.add_argument("--fps", type=int, default=30)
    parser.add_argument("--camera", default=None, help="Backend camera id to attribute tracks to")
    parser.add_argument("--duration", type=float, default=10.0)
    parser.add_argument("--no-loop", action="store_true")
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s %(message)s")

    if args.scenario and not args.video:
        service, run = _scenario_frame_source(args.scenario)
        stats = run()
        print(json.dumps(stats, indent=2))
        return
    asyncio.run(_run_live(args))


if __name__ == "__main__":
    main()
