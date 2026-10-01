"""Source adapters package.

Common interface (:class:`FrameSource`), the three concrete adapters
(``RTSPSource``, ``FileSource``, ``SimulatedSource``) and the ONVIF discovery
stub. The rest of the pipeline never knows which kind of camera it is talking
to.
"""

from services.ingestion.sources.base import (  # noqa: F401
    FrameSource,
    SourceDisconnectedError,
    SourceError,
)
from services.ingestion.sources.file_source import FileSource  # noqa: F401
from services.ingestion.sources.rtsp_source import RTSPSource  # noqa: F401
from services.ingestion.sources.simulated_source import SimulatedSource  # noqa: F401