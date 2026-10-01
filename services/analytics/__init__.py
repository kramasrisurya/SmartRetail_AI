"""Store & customer analytics (Phase 17, §2.2).

Pure aggregation over journeys/tracks/events - a rollup layer, never a new
collection path. Heatmap output is renderer-agnostic (cells + intensity) for
the Phase 20 dashboard. Same underlying signals serve security (Phase 12) and
merchandising here - the reason the event log was built general.
"""

from __future__ import annotations

from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any, Iterable


@dataclass(frozen=True)
class Visit:
    """One completed person journey reduced to what analytics needs."""

    track_key: str
    entered_at: str
    left_at: str
    zone_spans: list[tuple[str, str, str]]  # (zone, enter_iso, exit_iso)
    camera_handoffs: int = 0


def _parse(ts: str) -> datetime:
    return datetime.fromisoformat(ts.replace("Z", "+00:00"))


def traffic_by_bucket(visits: Iterable[Visit], *, bucket: str = "hour") -> dict[str, int]:
    counts: Counter[str] = Counter()
    for v in visits:
        key_fmt = "%Y-%m-%d %H:00" if bucket == "hour" else "%Y-%m-%d"
        counts[_parse(v.entered_at).strftime(key_fmt)] += 1
    return dict(sorted(counts.items()))


def dwell_time_by_zone(visits: Iterable[Visit]) -> dict[str, dict[str, float]]:
    totals: dict[str, list[float]] = defaultdict(list)
    for v in visits:
        per_zone: dict[str, float] = defaultdict(float)
        for zone, enter, exit in v.zone_spans:
            per_zone[zone] += (_parse(exit) - _parse(enter)).total_seconds()
        for zone, seconds in per_zone.items():
            totals[zone].append(seconds)
    out: dict[str, dict[str, float]] = {}
    for zone, samples in totals.items():
        samples_sorted = sorted(samples)
        n = len(samples_sorted)
        out[zone] = {
            "visits": n,
            "avg_s": round(sum(samples) / max(n, 1), 1),
            "median_s": round(samples_sorted[n // 2], 1),
        }
    return out


def popular_areas(dwell: dict[str, dict[str, float]],
                  visits_per_zone: dict[str, int], *,
                  top_n: int = 5) -> dict[str, list[dict[str, Any]]]:
    by_visits = sorted(visits_per_zone.items(), key=lambda kv: -kv[1])[:top_n]
    by_dwell = sorted(
        ((z, d["avg_s"]) for z, d in dwell.items()),
        key=lambda kv: -kv[1],
    )[:top_n]
    return {
        "by_visit_count": [{"zone": z, "visits": n} for z, n in by_visits],
        "by_dwell_time": [{"zone": z, "avg_s": s} for z, s in by_dwell],
        "note": "Visit-count and dwell rankings are deliberately separate - "
                "passed-through vs lingered-in are different signals.",
    }


def product_interaction_counts(events: Iterable[dict[str, Any]]) -> dict[str, dict[str, int]]:
    """pick/hold/return counts per SKU - merchandising's view of the same
    stream Phase 12 scores for loss prevention."""
    counts: dict[str, Counter[str]] = defaultdict(Counter)
    for e in events:
        sku = e.get("sku")
        if not sku:
            continue
        etype = e.get("event_type", "")
        if etype == "product_picked":
            counts[sku]["picked"] += 1
        elif etype == "product_held":
            counts[sku]["held"] += 1
        elif etype == "product_returned":
            counts[sku]["returned"] += 1
    return {sku: dict(c) for sku, c in counts.items()}


def queue_analytics(checkout_spans: Iterable[tuple[str, str, str]], *,
                    register_subzone: str | None = None) -> dict[str, Any]:
    """Wait time ≈ checkout-zone dwell (documented approximation when no
    finer register sub-zone boundary exists)."""
    waits: list[float] = []
    for person, enter, exit in checkout_spans:
        if register_subzone and not person.startswith(register_subzone):
            continue
        waits.append((_parse(exit) - _parse(enter)).total_seconds())
    waits_sorted = sorted(waits)
    n = len(waits_sorted)
    return {
        "queues_observed": n,
        "avg_wait_s": round(sum(waits) / n, 1) if n else 0.0,
        "p90_wait_s": round(waits_sorted[int(n * 0.9)] if n else 0.0, 1),
        "approximation": "checkout-zone dwell used as wait proxy",
    }


class HeatmapGrid:
    def __init__(self, *, min_x: float, min_y: float, max_x: float, max_y: float,
                 cell: float = 4.0) -> None:
        self.min_x, self.min_y = min_x, min_y
        self.cols = max(1, int((max_x - min_x) / cell))
        self.rows = max(1, int((max_y - min_y) / cell))
        self.cell = cell
        self.grid = [[0.0] * self.cols for _ in range(self.rows)]

    def add_point(self, x: float, y: float, weight: float = 1.0) -> None:
        col = min(self.cols - 1, max(0, int((x - self.min_x) / self.cell)))
        row = min(self.rows - 1, max(0, int((y - self.min_y) / self.cell)))
        self.grid[row][col] += weight

    def to_payload(self, *, top_only: bool = False) -> dict[str, Any]:
        cells = [
            {"row": r, "col": c, "x": round(self.min_x + (c + 0.5) * self.cell, 2),
             "y": round(self.min_y + (r + 0.5) * self.cell, 2),
             "intensity": round(v, 2)}
            for r, row in enumerate(self.grid) for c, v in enumerate(row)
            if v > 0 or not top_only
        ]
        peak = max((v for row in self.grid for v in row), default=0.0)
        return {
            "cell_size": self.cell,
            "cols": self.cols,
            "rows": self.rows,
            "peak": round(peak, 2),
            "cells": cells,
        }


def utilization_trend(zone_hour_counts: dict[tuple[str, str], int]) -> list[dict[str, Any]]:
    """Which zones are reliably busiest at which hours (trend ≠ live alert)."""
    agg: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
    for (zone, hour), n in zone_hour_counts.items():
        agg[zone][hour] += n
    out = []
    for zone, by_hour in agg.items():
        peak_hour, peak_n = max(by_hour.items(), key=lambda kv: kv[1])
        out.append({"zone": zone, "peak_hour": peak_hour, "count_at_peak": peak_n})
    return sorted(out, key=lambda d: -d["count_at_peak"])


__all__ = [
    "HeatmapGrid", "Visit", "dwell_time_by_zone", "popular_areas",
    "product_interaction_counts", "queue_analytics", "traffic_by_bucket",
    "utilization_trend",
]
