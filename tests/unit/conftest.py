"""Shared fixtures for unit tests.

Adds the services/ingestion package (and its data) importability under pytest
and provides a `tiny_video` fixture: a real, small MP4 written with PyAV's
bundled FFmpeg, so FileSource tests run without any external media or RTSP
hardware (deterministic in CI on any OS).
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
for path in (ROOT, ROOT / "services"):
    if str(path) not in sys.path:
        sys.path.insert(0, str(path))
if str(ROOT / "apps" / "backend") not in sys.path:
    sys.path.insert(0, str(ROOT / "apps" / "backend"))


@pytest.fixture()
def tiny_video(tmp_path: Path) -> Path:
    """A ~2 s, 8 fps 96x54 MP4 clip with 16 frames."""
    from services.ingestion.tools.make_demo_clip import make_clip

    path = tmp_path / "demo_clip.mp4"
    make_clip(path, seconds=2, fps=8, width=96, height=54)
    return path


@pytest.fixture()
def demo_video(tmp_path: Path) -> Path:
    """A slightly larger clip (320x180 @ 15 fps, 3 s) for loop/drop tests."""
    from services.ingestion.tools.make_demo_clip import make_clip

    path = tmp_path / "demo_320.mp4"
    make_clip(path, seconds=3, fps=15, width=320, height=180)
    return path