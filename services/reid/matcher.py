"""Handoff matching: embedding similarity x temporal plausibility (§10).

When a track ends on camera A, candidates are tracks that *started* recently
on cameras adjacent to A (constrained by the Phase 3 relationship graph before
any expensive comparison - which is also an accuracy win, since spatially
implausible shoppers are excluded outright).

Combined score = ``w_embedding * cosine`` + ``w_temporal * temporal``, where
temporal = 1 - gap/max_gap (a walk between neighboring cameras takes time;
instant or very-late appearances are less plausible).

Decisions preserve uncertainty (§104):
- best score >= threshold and clearly ahead → :attr:`MATCH`;
- top two within ``ambiguity_margin`` → :attr:`AMBIGUOUS` with both retained
  (runner-up stored, never silently discarded);
- nothing plausible → :attr:`NONE` - a wrong forced match is worse than an
  honestly incomplete journey.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum

import numpy as np


class Decision(Enum):
    MATCH = "match"
    AMBIGUOUS = "ambiguous"
    NONE = "none"


@dataclass
class TrackSummary:
    """Everything the matcher needs about one single-camera track."""

    track_key: str
    camera_id: str          # backend camera id as string
    started_at: float       # monotonic seconds
    ended_at: float | None
    person_ref: str | None = None       # scripted identity / stable local ref
    appearance: np.ndarray | None = None  # aggregated, normalized vector
    db_track_id: int | None = None      # set once persisted
    person_id: int | None = None        # set after fusion


@dataclass
class HandoffDecision:
    status: Decision
    target: TrackSummary | None = None
    confidence: float = 0.0
    runner_up: TrackSummary | None = None
    scores: dict[str, float] = field(default_factory=dict)


class HandoffMatcher:
    def __init__(
        self,
        *,
        w_embedding: float = 0.7,
        w_temporal: float = 0.3,
        match_threshold: float = 0.75,
        ambiguity_margin: float = 0.05,
        max_gap_seconds: float = 30.0,
    ) -> None:
        total = w_embedding + w_temporal
        self.w_embedding = w_embedding / total
        self.w_temporal = w_temporal / total
        self.match_threshold = float(match_threshold)
        self.ambiguity_margin = float(ambiguity_margin)
        self.max_gap_seconds = float(max_gap_seconds)

    # -- scoring -------------------------------------------------------------

    def temporal_score(self, gap_seconds: float) -> float:
        """1 at zero gap → 0 at max_gap; negative gaps are impossible walks."""
        if gap_seconds < 0:
            return 0.0
        return max(0.0, 1.0 - gap_seconds / self.max_gap_seconds)

    def combined_score(self, emb_a: np.ndarray | None, emb_b: np.ndarray | None,
                       gap_seconds: float) -> float:
        emb = 0.0 if emb_a is None or emb_b is None else float(np.dot(emb_a, emb_b))
        return self.w_embedding * emb + self.w_temporal * self.temporal_score(gap_seconds)

    # -- decision ---------------------------------------------------------------

    def decide(self, ended: TrackSummary,
               candidates: list[tuple[TrackSummary, float]]) -> HandoffDecision:
        """Pick among ``(candidate, start_ts)`` pairs for an ended track."""
        scored: list[tuple[float, TrackSummary]] = []
        for cand, start_ts in candidates:
            if ended.ended_at is None:
                continue
            gap = start_ts - ended.ended_at
            score = self.combined_score(ended.appearance, cand.appearance, gap)
            if gap > self.max_gap_seconds or gap < 0:
                continue
            scored.append((score, cand))
        if not scored:
            return HandoffDecision(status=Decision.NONE)
        scored.sort(key=lambda sc: -sc[0])
        best_score, best = scored[0]
        scores = {c.track_key: round(s, 4) for s, c in scored[:5]}
        if len(scored) > 1 and (best_score - scored[1][0]) < self.ambiguity_margin:
            return HandoffDecision(
                status=Decision.AMBIGUOUS, target=best, confidence=round(min(best_score, 0.70), 4),
                runner_up=scored[1][1], scores=scores,
            )
        if best_score >= self.match_threshold:
            return HandoffDecision(
                status=Decision.MATCH, target=best, confidence=round(best_score, 4), scores=scores
            )
        return HandoffDecision(status=Decision.NONE, confidence=round(best_score, 4), scores=scores)
