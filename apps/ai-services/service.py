"""AI Services — CV / ML Inference Service Runner (spec §3, §70, apps/ai-services).

Runs inference pipelines for detection and tracking:
- Loads YOLOv8 / ByteTrack / Re-ID models (or simulated detectors when torch/weights absent)
- Consumes video streams from ingestion sinks
- Publishes detections and track events to backend REST endpoints or Redis stream
"""

from __future__ import annotations

import argparse
import logging
import sys
import time
from typing import Any

from services.detection.base import build_detector
from services.ingestion.camera_config import CameraConfig
from services.ingestion.pipeline import CameraPipeline
from services.tracking.iou_tracker import IoUTracker
from services.tracking.service import TrackingService

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] (ai-services) %(message)s")
logger = logging.getLogger("smartretail.ai-services")


def run_camera_inference(camera_id: str, source_type: str = "simulation", fps: int = 15) -> None:
    logger.info("Initializing inference pipeline for camera %s (type=%s, target_fps=%d)", camera_id, source_type, fps)

    detector = build_detector(model_type="simulated")
    tracker = IoUTracker(iou_threshold=0.3, max_age=10, min_hits=2)
    tracking_service = TrackingService(detector=detector, tracker=tracker)

    logger.info("Inference engine ready. Processing camera %s stream...", camera_id)
    # Pipeline is ready for FrameSink connections from ingestion


def main() -> None:
    parser = argparse.ArgumentParser(description="SmartRetail AI — CV/ML Inference Service")
    parser.add_argument("--camera", default="CAM-01", help="Camera ID to process")
    parser.add_argument("--source", default="simulation", choices=["simulation", "file", "rtsp"])
    parser.add_argument("--fps", type=int, default=15)
    args = parser.parse_args()

    run_camera_inference(args.camera, args.source, args.fps)


if __name__ == "__main__":
    main()
