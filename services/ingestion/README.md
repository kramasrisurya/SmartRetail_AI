# services/ingestion — Video Ingestion

Responsibility: connect to camera sources (RTSP / ONVIF / file-based feeds),
manage connection lifecycles, decode frames, and publish them downstream to the
detection pipeline. Handles disconnects, retries, and per-camera framing metadata
(camera id, timestamp, stream id).

Planned stack: OpenCV / av (PyAV) for decoding, Redis pub/sub for frame
dispatch.

**Status:** placeholder — no code yet.
