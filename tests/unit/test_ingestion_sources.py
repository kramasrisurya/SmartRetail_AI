"""Unit tests for the three FrameSource adapters + ONVIF stub.

None of these require live RTSP hardware: FileSource reads real (PyAV-written)
local clips; SimulatedSource is fully synthetic; RTSPSource is exercised only
for URL/transport validation and error mapping. Flakiness-free in CI.
"""

from __future__ import annotations

import numpy as np
import pytest

from services.ingestion.factory import build_source
from services.ingestion.sources.base import SourceDisconnectedError
from services.ingestion.sources.file_source import FileSource
from services.ingestion.sources.rtsp_source import RTSPSource
from services.ingestion.sources.simulated_source import SimulatedSource


def test_file_source_reads_frames_with_pts(tiny_video) -> None:
    source = FileSource(tiny_video)
    source.start()
    try:
        raw = source.read_frame()
        assert raw is not None
        assert raw.data.ndim == 3 and raw.data.shape[2] == 3
        assert raw.data.dtype == np.uint8
        assert raw.pts_seconds is not None
        assert raw.pts_seconds >= 0.0

        # PTS of subsequent frames is increasing (exact container timing).
        pts = []
        while (raw := source.read_frame()) is not None:
            assert raw.pts_seconds is not None
            pts.append(raw.pts_seconds)
        assert pts and all(b >= a for a, b in zip(pts, pts[1:]))
    finally:
        source.stop()


def test_file_source_clean_eof_then_reopen_loops(tiny_video) -> None:
    source = FileSource(tiny_video)
    n_pass1 = n_pass2 = 0
    source.start()
    first_generation = source.generation
    while source.read_frame() is not None:
        n_pass1 += 1
    source.stop()
    assert n_pass1 > 0

    # Second pass (as a pipeline would do at end-of-stream) yields the same
    # number of frames again, and generation advanced to signal the epoch.
    source.start()
    assert source.generation == first_generation + 1
    while source.read_frame() is not None:
        n_pass2 += 1
    source.stop()
    assert n_pass2 == n_pass1


def test_file_source_missing_file_raises_disconnected() -> None:
    source = FileSource("C:/definitely/not/a/file.mp4")
    with pytest.raises(SourceDisconnectedError):
        source.start()


def test_file_source_decode_error_maps_to_disconnected(tmp_path) -> None:
    bogus = tmp_path / "truncated.mp4"
    bogus.write_bytes(b"\x00\x01\x02not an mp4\xff\xfe")
    source = FileSource(bogus)
    with pytest.raises(SourceDisconnectedError):
        source.start()


def test_simulated_source_deterministic_and_sized() -> None:
    source = SimulatedSource(width=64, height=48, fps=15)
    source.start()
    try:
        first = source.read_frame()
        second = source.read_frame()
        assert first is not None and second is not None
        assert first.data.shape == (48, 64, 3)
        # Deterministic scene + exact virtual PTS at the configured rate.
        assert first.pts_seconds == pytest.approx(0.0, abs=1e-6)
        assert second.pts_seconds - first.pts_seconds == pytest.approx(1 / 15, abs=1e-6)
        assert np.any(first.data != second.data), "scene must evolve between frames"
    finally:
        source.stop()


def test_rtsp_source_validates_url_and_transport() -> None:
    with pytest.raises(ValueError):
        RTSPSource("http://not-rtsp.example/stream")
    with pytest.raises(ValueError):
        RTSPSource("rtsp://cam/stream", transport="quic")
    source = RTSPSource("rtsp://cam.example:554/ch0", transport="tcp")
    assert source.transport == "tcp"


def test_rtsp_source_unreachable_maps_to_disconnected() -> None:
    # Pointless to probe a real camera: connecting to a port that is closed
    # should raise a SourceDisconnectedError quickly enough via the retry logic.
    source = RTSPSource("rtsp://127.0.0.1:1/stream", open_timeout_seconds=0.5)
    with pytest.raises(SourceDisconnectedError):
        source.start()


def test_onvif_discovery_degrades_without_libraries() -> None:
    from services.ingestion.sources import onvif

    onvif._WSDiscovery = None  # simulate optional dependency absent
    try:
        devices = onvif.discover_onvif_devices(timeout_seconds=0.1)
        assert devices == []
    finally:
        del onvif


def test_factory_maps_configs_to_sources() -> None:
    from services.ingestion.camera_config import CameraConfig

    assert isinstance(build_source(CameraConfig(id="1", source_type="file", file_path="x.mp4")), FileSource)
    assert isinstance(build_source(CameraConfig(id="2", source_type="rtsp", rtsp_url="rtsp://c/x")), RTSPSource)
    assert isinstance(build_source(CameraConfig(id="3", source_type="simulation", resolution=(32, 32))), SimulatedSource)

    with pytest.raises(ValueError):
        build_source(CameraConfig(id="4", source_type="file"))  # no file_path
    with pytest.raises(ValueError):
        build_source(CameraConfig(id="5", source_type="rtsp"))  # no rtsp_url
    with pytest.raises(ValueError):
        build_source(CameraConfig(id="6", source_type="onvif-unknown"))


def test_camera_config_from_api_payload() -> None:
    from services.ingestion.camera_config import CameraConfig

    cfg = CameraConfig.from_api_payload(
        {"id": 7, "name": "CAM-D1", "source_type": "file", "file_path": "datasets/processed/demo_clip.mp4",
         "resolution": "640x360", "fps": 15, "processing_fps": 10, "scale_factor": 0.5}
    )
    assert cfg.id == "7"
    assert cfg.resolution == (640, 360)
    assert cfg.scale_factor == 0.5
    assert cfg.target_fps == 10