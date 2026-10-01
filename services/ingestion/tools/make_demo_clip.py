"""Generate the demo video clip the Phase 4 demo and CAM-D1 use.

Writes ``datasets/processed/demo_clip.mp4`` (git-ignored) by default — a short,
deterministic synthetic clip of moving shapes at 640x360 / 15 fps so the
file-based ingestion pipeline has something realistic to ingest.

Usage (from the repository root):

    python -m services.ingestion.tools.make_demo_clip [--seconds 10] [-o <file>]
"""

from __future__ import annotations

import argparse
from pathlib import Path

try:
    import av
except (ImportError, OSError):
    av = None

try:
    import cv2
except (ImportError, OSError):
    cv2 = None

import numpy as np

ROOT = Path(__file__).resolve().parents[3]
DEFAULT_OUTPUT = ROOT / "datasets" / "processed" / "demo_clip.mp4"


def make_clip(path: str | Path, *, seconds: int = 10, fps: int = 15, width: int = 640, height: int = 360) -> None:
    """Encode a deterministic moving-shape clip with PyAV or OpenCV."""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    frames = seconds * fps

    if av is not None:
        try:
            container = av.open(str(path), "w")
            stream = container.add_stream("mpeg4", rate=fps)
            stream.width = width
            stream.height = height
            stream.pix_fmt = "yuv420p"

            for i in range(frames):
                img = _render_synthetic_frame(i, fps, width, height)
                frame = av.VideoFrame.from_ndarray(img, format="bgr24")
                for packet in stream.encode(frame):
                    container.mux(packet)
            for packet in stream.encode():
                container.mux(packet)
            container.close()
            print(f"wrote demo clip: {path} ({frames} frames @ {fps} fps, {width}x{height}) [PyAV]")
            return
        except Exception as e:
            # Fall back to cv2 if av encounters runtime/codec error
            pass

    if cv2 is not None:
        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        out = cv2.VideoWriter(str(path), fourcc, fps, (width, height))
        for i in range(frames):
            img = _render_synthetic_frame(i, fps, width, height)
            out.write(img)
        out.release()
        print(f"wrote demo clip: {path} ({frames} frames @ {fps} fps, {width}x{height}) [OpenCV]")
        return

    raise RuntimeError("Neither PyAV nor OpenCV is available for video encoding.")


def _render_synthetic_frame(i: int, fps: int, width: int, height: int) -> np.ndarray:
    img = np.full((height, width, 3), 24, dtype="uint8")  # dark shop floor
    # drifting gradient bar mimics a person walking across the aisles.
    bar_x = int((width - 0.1 * width) * (i % fps) / fps)
    img[:, bar_x:bar_x + int(0.1 * width), :] = (200, 180, 40)  # blue shirt
    # wandering disc mimics a rolling trolley.
    cx = int(0.8 * width) if (i // fps) % 2 == 0 else int(0.2 * width)
    cy = int((0.3 + 0.6 * (i % fps) / fps) * height)
    for dy in range(-24, 25):
        for dx in range(-24, 25):
            y, x = cy + dy, cx + dx
            if 0 <= y < height and 0 <= x < width and dy * dy + dx * dx <= 24 * 24:
                img[y, x] = (60, 60, 220)
    return img


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("-o", "--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--seconds", type=int, default=10, help="clip length in seconds")
    parser.add_argument("--fps", type=int, default=15)
    parser.add_argument("--width", type=int, default=640)
    parser.add_argument("--height", type=int, default=360)
    args = parser.parse_args()
    make_clip(args.output, seconds=args.seconds, fps=args.fps, width=args.width, height=args.height)


if __name__ == "__main__":
    main()