"""Person detection (spec §7, Phase 5).

Two interchangeable detector backends behind one stable interface:

- :class:`services.detection.yolo_detector.YoloPersonDetector` — a real
  pretrained YOLO model restricted to the COCO ``person`` class. Requires the
  optional ``ultralytics`` dependency; imported lazily so the rest of the
  system (and CI) never pays for it unless the real-model path is selected.
- :class:`services.detection.simulated.SimulatedPersonDetector` — a scripted,
  fully deterministic detector driven by a JSON scenario file. This is what
  makes every downstream phase (interaction, events, risk, dashboard) and the
  final §101 demonstration reproducible without depending on a neural model
  correctly detecting a real actor in real video.

Both return :class:`Detection` records in frame-pixel ``xyxy`` coordinates and
share the exact same call shape, so trackers, interaction logic, and tests
never know which backend is active.
"""

from services.detection.base import Detection, PersonDetector, build_detector
from services.detection.simulated import SimulatedPersonDetector

__all__ = ["Detection", "PersonDetector", "SimulatedPersonDetector", "build_detector"]
