"""Inventory intelligence + safety analytics (Phase 16, §2.3/§2.4).

Two aggregate-facing subsystems over the same event/journey/spatial
infrastructure as the loss-prevention path:

- **Shelf monitoring**: believed contents (from picked/returned/restock beats)
  vs the shelf's expected set; misplacement candidates emit ProductMisplaced;
  stock-discrepancy is honestly framed as a *signal for a manual check*.
- **Safety**: fall / restricted-entry / abandoned-object / congestion
  detectors tuned SENSITIVE - false alarms are far cheaper than missed falls,
  the deliberate inverse of Phase 12's conservative gates.

All detectors are pure functions over scripted observations so tests pin
exact behavior without video.
"""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass, field
from typing import Any


# --- inventory ---------------------------------------------------------------------


@dataclass
class ShelfLedger:
    """Rolling belief about one shelf's contents."""

    name: str
    expected: dict[str, int] = field(default_factory=dict)   # sku -> qty
    on_shelf: dict[str, int] = field(default_factory=dict)
    last_restock_at: str | None = None
    picks_since_baseline: int = 0

    def apply(self, signal: str, sku: str, qty: int = 1) -> None:
        if signal == "picked":
            self.on_shelf[sku] = max(0, self.on_shelf.get(sku, 0) - qty)
            self.picks_since_baseline += qty
        elif signal == "returned":
            self.on_shelf[sku] = self.on_shelf.get(sku, 0) + qty
        elif signal == "restocked":
            self.on_shelf[sku] = self.on_shelf.get(sku, 0) + qty
            self.picks_since_baseline = 0

    def misplaced_items(self) -> list[str]:
        """Returned-here SKUs that don't belong on this shelf."""
        return [sku for sku in self.on_shelf if sku not in self.expected]

    def discrepancy_signal(self, *, typical_turnover_window_picks: int = 8,
                           factor: float = 2.0) -> bool:
        """More picks than ~expected turnover ⇒ worth a manual check.

        Honest framing: a SIGNAL, not an inventory count - there is no
        ground-truth stock feed in scope.
        """
        return self.picks_since_baseline > typical_turnover_window_picks * factor


class InventoryMonitor:
    def __init__(self, shelves: dict[str, dict[str, int]]) -> None:
        self.ledgers: dict[str, ShelfLedger] = {
            name: ShelfLedger(name=name, expected=dict(expected),
                              on_shelf=dict(expected))
            for name, expected in shelves.items()
        }

    def apply_event(self, *, signal: str, shelf: str | None, sku: str,
                    qty: int = 1, ts_iso: str | None = None) -> list[dict[str, Any]]:
        """Returns any actionable records (misplacement candidates etc.)."""
        out: list[dict[str, Any]] = []
        if signal == "returned" and shelf is not None:
            ledger = self.ledgers.get(shelf)
            if ledger is not None and sku not in ledger.expected and qty > 0:
                # Believed placement of an unexpected item BEFORE applying.
                pre_existing = ledger.misplaced_items()
                _ = pre_existing
                out.append({
                    "event_type": "product_misplaced",
                    "shelf": shelf, "sku": sku,
                    "note": f"{sku} does not belong on {shelf}",
                })
        target = self.ledgers.get(shelf or "")
        if target is not None:
            target.apply(signal, sku, qty)
            if signal == "restocked":
                target.last_restock_at = ts_iso
        else:
            # Pick from an unknown shelf still counts toward that shelf's
            # baseline only if tracked; unknown shelves are ignored silently.
            pass
        return out

    def shelf_status(self, name: str) -> dict[str, Any]:
        led = self.ledgers[name]
        return {
            "shelf": name,
            "expected": led.expected,
            "believed_on_shelf": led.on_shelf,
            "misplaced": led.misplaced_items(),
            "last_restocked_at": led.last_restock_at,
            "discrepancy_signal": led.discrepancy_signal(),
            "note": "Signal for manual check - not a ground-truth stock count.",
        }


# --- safety detectors ---------------------------------------------------------------


def detect_fall(track_points: list[dict[str, float]], *,
                aspect_drop: float = 0.45, min_still_ticks: int = 6) -> bool:
    """Rapid bbox height collapse + sustained low movement ⇒ possible fall.

    Tuned SENSITIVE on purpose (§2.4): false positives cost a glance; false
    negatives cost far more. ``track_points`` items carry h, w, cx, cy per tick.
    """
    if len(track_points) < min_still_ticks + 3:
        return False
    heights = [p["h"] for p in track_points]
    widths = [p["w"] for p in track_points]
    ratios = [w / max(h, 1e-6) for w, h in zip(widths, heights)]
    drop_idx = None
    for i in range(1, len(ratios)):
        if ratios[i] > ratios[i - 1] * (1.0 + max(aspect_drop, 0.1)) and \
                heights[i] < heights[i - 1] * (1.0 - aspect_drop):
            drop_idx = i
            break
    if drop_idx is None:
        return False
    after = track_points[drop_idx:drop_idx + min_still_ticks]
    if len(after) < min_still_ticks:
        return False
    movement = max(
        abs(a["cx"] - after[0]["cx"]) + abs(a["cy"] - after[0]["cy"])
        for a in after
    )
    return movement < 12.0  # px-ish units: person not getting up


def detect_restricted_entry(zone_type: str, authorized: bool) -> bool:
    return zone_type == "restricted" and not authorized


def detect_abandoned_object(*, stationary_ticks: int, associated_with_person: bool,
                            unusual_zone: bool, threshold_ticks: int = 150) -> bool:
    return (
        stationary_ticks >= threshold_ticks
        and not associated_with_person
        and unusual_zone
    )


class CongestionMeter:
    """Rolling density-per-zone; also feeds Phase 17 queue analytics.

    Zones listed in ``emergency_routes`` get a far lower threshold - blocked
    exits are dangerous at two people.
    """

    def __init__(self, *, threshold: int = 8, sustain_ticks: int = 5,
                 emergency_exit_threshold: int = 2,
                 emergency_routes: set[str] | None = None) -> None:
        self.threshold = threshold
        self.sustain = sustain_ticks
        self.exit_threshold = emergency_exit_threshold
        self.emergency_routes = {z.lower() for z in (emergency_routes or set())}
        self._counts: dict[str, list[int]] = defaultdict(list)

    def observe(self, zone: str, people_count: int) -> bool:
        """Record one tick; returns True when an alerting condition fires."""
        series = self._counts[zone]
        series.append(people_count)
        if len(series) > self.sustain * 4:
            del series[: len(series) - self.sustain * 4]
        limit = self.exit_threshold if zone.lower() in self.emergency_routes else self.threshold
        tail = series[-self.sustain:]
        return len(tail) >= self.sustain and all(c >= limit for c in tail)


def detect_rapid_movement(path: list[tuple[float, float, float]],
                          *, walking_speed: float = 1.4) -> bool:
    """Sustained speed well above walking pace ('unusual rapid movement').

    Honestly labeled heuristic - NOT aggression classification (§2.4 'where
    feasible'); path entries are (t_seconds, x, y).
    """
    if len(path) < 3:
        return False
    fast = 0
    for (t0, x0, y0), (t1, x1, y1) in zip(path, path[1:]):
        dt = t1 - t0
        if dt <= 0:
            continue
        speed = (((x1 - x0) ** 2 + (y1 - y0) ** 2) ** 0.5) / dt
        fast += 1 if speed > walking_speed * 2.5 else 0
    return fast >= max(2, len(path) // 2)


__all__ = [
    "CongestionMeter", "InventoryMonitor", "ShelfLedger",
    "detect_abandoned_object", "detect_fall", "detect_rapid_movement",
    "detect_restricted_entry",
]
