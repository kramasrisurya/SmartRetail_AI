"""ONVIF camera discovery (spec §5 "ONVIF camera discovery").

Nice-to-have stub. ``discover_onvif_devices`` performs WS-Discovery broadcast on
the local network to find ONVIF-compliant cameras and resolves each to a
``(name, host, rtsp_url, capabilities)`` record. It uses ``wsdiscovery`` /
``onvif-zeep`` when available and degrades gracefully (empty list + a logged
warning) otherwise, so the rest of Phase 4 never blocks on hardware being
present in CI or development.

A discovered device feeds the pipeline through :class:`RTSPSource` using its
RTSP URL — no separate onvif source type is needed.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass

logger = logging.getLogger(__name__)

try:  # pragma: no cover - optional dependency, not installed in CI by default
    from wsdiscovery.discovery import ThreadedWSDiscovery as _WSDiscovery  # type: ignore[import-not-found]
except Exception:  # pragma: no cover
    _WSDiscovery = None  # type: ignore[assignment]

try:  # pragma: no cover
    from onvif import ONVIFCamera  # type: ignore[import-not-found]  # noqa: F401
except Exception:  # pragma: no cover
    ONVIFCamera = None  # type: ignore[assignment]


@dataclass(frozen=True)
class OnvifDevice:
    name: str
    host: str
    rtsp_url: str | None
    capabilities: dict


def discover_onvif_devices(timeout_seconds: float = 5.0) -> list[OnvifDevice]:
    """Scan the local network for ONVIF cameras (blocking).

    Returns an empty list (with a warning) when the ONVIF/WS-Discovery
    libraries are not installed or no devices answer — both are fine for local
    development and CI, which exercise the pipeline through file and simulated
    sources instead.
    """
    if _WSDiscovery is None:
        logger.warning("wsdiscovery unavailable — skipping ONVIF discovery (install wsdiscovery for hardware)")
        return []
    wsd = _WSDiscovery()
    devices: list[OnvifDevice] = []
    try:
        wsd.start()
        wsd.searchServices(timeout=timeout_seconds)
        for service in wsd.getServices():
            try:
                host = str(service.getXAddrs()[0]) if service.getXAddrs() else ""
                rtsp_url = None
                for scope in service.getScopes() or []:
                    if "rtsp" in scope.lower():
                        rtsp_url = scope.split(";")[-1].replace("rtsp://", "rtsp://", 1)
                        break
                devices.append(
                    OnvifDevice(
                        name=service.getEPR() or host,
                        host=host,
                        rtsp_url=rtsp_url,
                        capabilities={"types": service.getTypes()},
                    )
                )
            except Exception:
                logger.warning("skipping unparsable ONVIF service response", exc_info=True)
    finally:
        wsd.stop()
    logger.info("ONVIF discovery found %d device(s)", len(devices))
    return devices