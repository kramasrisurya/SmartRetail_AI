"""Scripted, fully deterministic person detection (spec §5 "simulation", §7).

A first-class backend — not a toy. It replays a JSON scenario describing
persons and their per-time bounding boxes, so every downstream phase
(interaction, event engine, risk, dashboard) and the final §101 demonstration
can be developed and tested against known-good, controllable input before the
real CV path is tuned.

Scenario format (JSON)::

    {
      "fps": 30,
      "duration_s": 10.0,
      "resolution": [320, 180],
      "persons": [
        {
          "id": "p1",
          "confidence": 0.92,
          "path": [
            {"t": 0.0, "bbox": [10, 40, 34, 110]},
            {"t": 4.0, "bbox": [120, 42, 144, 112]},
            {"t": 4.8, "bbox": null},
            {"t": 6.3, "bbox": [121, 43, 145, 113]},
            {"t": 9.0, "bbox": [270, 44, 294, 114]}
          ]
        }
      ]
    }

Semantics:

- Scenario time is ``frame.capture_ts - t0`` where ``t0`` is the first frame
  the detector sees — a pure function of the input stream, deterministic under
  controlled timestamps (tests) and correct against live monotonic ones.
- Waypoints are linearly interpolated within a **presence segment**.
- A path entry with ``"bbox": null`` marks scripted absence (occlusion /
  out-of-frame): it closes the current segment; detection resumes at the next
  non-null waypoint. Between segments nobody is reported — the script controls
  visibility exactly, which is how occlusion gaps are authored.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from pathlib import Path

from services.detection.base import Detection
from services.ingestion.frame import Frame

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class Waypoint:
    t: float
    bbox: tuple[float, float, float, float]


@dataclass(frozen=True)
class ScriptedPerson:
    id: str
    confidence: float
    segments: tuple[tuple[Waypoint, ...], ...]  # contiguous visible spans


class SimulatedPersonDetector:
    """Deterministic detector replaying a scripted scenario."""

    def __init__(self, persons: list[ScriptedPerson]) -> None:
        self._persons = persons
        self._t0: float | None = None

    @classmethod
    def from_scenario_file(cls, path: str | Path) -> "SimulatedPersonDetector":
        return cls.from_dict(json.loads(Path(path).read_text(encoding="utf-8")))

    @classmethod
    def from_dict(cls, data: dict) -> "SimulatedPersonDetector":
        persons: list[ScriptedPerson] = []
        for raw in data.get("persons", []):
            entries = sorted(
                (
                    (
                        float(p["t"]),
                        tuple(float(v) for v in p["bbox"]) if p.get("bbox") is not None else None,
                    )
                    for p in raw["path"]
                ),
                key=lambda e: e[0],
            )
            segments: list[list[Waypoint]] = []
            current: list[Waypoint] = []
            for t, box in entries:
                if box is None:
                    if current:
                        segments.append(current)
                        current = []
                    continue
                current.append(Waypoint(t=t, bbox=box))
            if current:
                segments.append(current)
            if segments:
                persons.append(
                    ScriptedPerson(
                        id=str(raw["id"]),
                        confidence=float(raw.get("confidence", 0.9)),
                        segments=tuple(tuple(seg) for seg in segments),
                    )
                )
        logger.info("loaded simulated scenario with %d scripted person(s)", len(persons))
        return cls(persons)

    # -- detection ---------------------------------------------------------

    def detect(self, frame: Frame) -> list[Detection]:
        if self._t0 is None:
            self._t0 = frame.capture_ts
        t = frame.capture_ts - self._t0
        out: list[Detection] = []
        for person in self._persons:
            box = self._bbox_at(person, t)
            if box is not None:
                out.append(Detection(bbox=box, confidence=person.confidence,
                                     attributes={"scripted_id": person.id}))
        return out

    def close(self) -> None:
        pass

    @staticmethod
    def _bbox_at(person: ScriptedPerson, t: float) -> tuple[float, float, float, float] | None:
        for segment in person.segments:
            if t < segment[0].t or t > segment[-1].t:
                continue
            for a, b in zip(segment, segment[1:]):
                if a.t <= t <= b.t:
                    span = (b.t - a.t) or 1e-9
                    f = (t - a.t) / span
                    return tuple(a.bbox[i] + (b.bbox[i] - a.bbox[i]) * f for i in range(4))  # type: ignore[return-value]
            return segment[-1].bbox  # exact endpoint hit
        return None
