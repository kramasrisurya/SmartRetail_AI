"""SmartRetail AI — Video Ingestion Service (Phase 4).

Connects to camera sources (RTSP streams, ONVIF-discovered devices, local video
files, synthetic feeds), decodes frames, applies reliability features (bounded
buffering with oldest-frame dropping, adaptive frame rate, resolution
adaptation, reconnection with exponential backoff) and hands timestamped frames
downstream to the detection pipeline. See ``README.md`` and
``docs/architecture/overview.md`` for the hand-off contract.
"""

from services.ingestion.frame import Frame  # noqa: F401