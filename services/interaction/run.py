"""Demo runner: replay the §101 pick/hold/return beats through the engine.

    python -m services.interaction.run --scenario services/interaction/scenarios/demo_pick_hold_return.json
"""

from __future__ import annotations

import argparse
import json
import logging
from pathlib import Path

import numpy as np

from services.interaction.association import PersonObservation, ProductObservation
from services.interaction.belief import ShelfRegistry
from services.interaction.engine import InteractionEngine


def _bbox_at(path: list[dict], t: float):
    entries = sorted(((float(p["t"]), p["bbox"]) for p in path), key=lambda e: e[0])
    if t <= entries[0][0]:
        return None if entries[0][1] is None else tuple(entries[0][1])
    for (t0, b0), (t1, b1) in zip(entries, entries[1:]):
        if t0 <= t <= t1:
            if b0 is None or b1 is None:
                return None
            span = (t1 - t0) or 1e-9
            f = (t - t0) / span
            return tuple(b0[i] + (b1[i] - b0[i]) * f for i in range(4))  # type: ignore[return-value]
    last_t, last_b = entries[-1]
    return None if last_b is None else tuple(last_b)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--scenario", type=Path, required=True)
    parser.add_argument("--camera", default="cam-aisle")
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO)

    data = json.loads(args.scenario.read_text(encoding="utf-8"))
    fps = int(data.get("fps", 30))
    shelves = ShelfRegistry()
    for name, rect in data.get("shelves", {}).items():
        shelves.add(args.camera, name, tuple(rect))

    engine = InteractionEngine(shelves=shelves)
    events: list[dict] = []
    engine.event_handlers.append(events.append)

    persons_raw = data.get("persons", [])
    products_raw = data.get("products", [])

    total = int(float(data.get("duration_s", 10)) * fps)
    # Seed shelf beliefs from each product's first position.
    for raw in products_raw:
        first = next(p for p in sorted(raw["path"], key=lambda p: float(p["t"])))
        if first.get("bbox") is not None:
            center = ((first["bbox"][0] + first["bbox"][2]) / 2, (first["bbox"][1] + first["bbox"][3]) / 2)
            region = shelves.shelf_at(args.camera, center)
            if region:
                key = f"{args.camera}:{raw['sku']}"
                engine.observe_shelf(key, args.camera, center, region)

    for tick in range(total):
        t = tick / fps
        persons = []
        for raw in persons_raw:
            bbox = _bbox_at(raw["path"], t)
            if bbox is not None:
                persons.append(
                    PersonObservation(
                        track_key=f"{args.camera}:p-{raw['id']}",
                        bbox=bbox,
                        confidence=float(raw.get("confidence", 0.9)),
                    )
                )
        products = []
        for raw in products_raw:
            bbox = _bbox_at(raw["path"], t)
            if bbox is not None:
                products.append(
                    ProductObservation(
                        instance_key=f"{args.camera}:{raw['sku']}",
                        sku=raw.get("sku"),
                        bbox=bbox,
                        confidence=float(raw.get("confidence", 0.9)),
                        identified=bool(raw.get("sku")),
                    )
                )
        engine.process_tick(args.camera, ts=t, frame_sequence=tick, persons=persons, products=products)

    print(json.dumps([e | {"confidence": round(e["confidence"], 3)} for e in events], indent=2))
    assert not isinstance(np, type(None))


if __name__ == "__main__":
    main()
