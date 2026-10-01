"""Catalog vector index + product identification with method attribution.

The identifier combines three evidence sources, in strict override order:

1. **Barcode** (when the hook reads a SKU) - near ground truth, confidence 0.99.
2. **OCR** (when text yields an exact catalog SKU token) - high confidence 0.95.
3. **Embedding** - cosine similarity against precomputed reference vectors;
   accepted only above ``match_threshold``, otherwise the result is honestly
   *unidentified* (never force-matched to the nearest neighbor).

Ambiguity is preserved, not hidden: when the top two embedding scores are
within ``ambiguity_margin`` of each other, both candidates are returned and the
confidence is capped, so downstream phases (and human reviewers) can resolve
the choice instead of the system silently guessing wrong. Every result carries
its method attribution - the raw material Phase 15 explainability consumes.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

import numpy as np

# Imported as modules (not names) so hook implementations stay swappable and
# tests can monkeypatch them cleanly.
from services.product import barcode as barcode_hook
from services.product import ocr as ocr_hook
from services.product.embeddings import EmbeddingExtractor


@dataclass(frozen=True)
class CatalogEntry:
    sku: str
    name: str = ""
    vector: np.ndarray | None = None  # normalized embedding of a reference image


@dataclass(frozen=True)
class IdentifiedCandidate:
    sku: str
    score: float


@dataclass
class IdentificationResult:
    identified: bool
    sku: str | None
    confidence: float
    method: str  # "barcode" | "ocr" | "embedding" | "ambiguous" | "none"
    candidates: list[IdentifiedCandidate] = field(default_factory=list)
    methods_considered: dict[str, Any] = field(default_factory=dict)

    def to_payload(self) -> dict[str, Any]:
        return {
            "identified": self.identified,
            "sku": self.sku,
            "confidence": round(self.confidence, 4),
            "method": self.method,
            "candidates": [{"sku": c.sku, "score": round(c.score, 4)} for c in self.candidates],
            "methods_considered": self.methods_considered,
        }


class CatalogIndex:
    """Cosine-similarity index over precomputed catalog reference embeddings."""

    def __init__(self, entries: list[CatalogEntry]) -> None:
        with_vectors = [e for e in entries if e.vector is not None]
        if not with_vectors:
            raise ValueError("catalog index requires at least one entry with a vector")
        self.entries = [CatalogEntry(e.sku, e.name, np.asarray(e.vector, dtype=float)) for e in with_vectors]
        self._matrix = np.stack([e.vector for e in self.entries])

    def top_k(self, query: np.ndarray, k: int = 5) -> list[IdentifiedCandidate]:
        scores = self._matrix @ np.asarray(query, dtype=float)
        order = np.argsort(-scores)[: max(1, k)]
        return [IdentifiedCandidate(self.entries[i].sku, float(scores[i])) for i in order]

    def best_score_for(self, sku: str) -> float:
        """Best cosine score across all references belonging to ``sku``."""
        idx = [i for i, e in enumerate(self.entries) if e.sku == sku]
        if not idx:
            return 0.0
        return float(np.max(self._matrix[idx]))


class ProductIdentifier:
    """Identifies one cropped product region against the catalog."""

    def __init__(
        self,
        extractor: EmbeddingExtractor,
        catalog: list[CatalogEntry],
        *,
        match_threshold: float = 0.75,
        ambiguity_margin: float = 0.03,
        barcode_to_sku: dict[str, str] | None = None,
    ) -> None:
        self.extractor = extractor
        self.index = CatalogIndex(catalog)
        self.match_threshold = float(match_threshold)
        self.ambiguity_margin = float(ambiguity_margin)
        # Barcode payload -> SKU mapping (EANs rarely equal internal SKUs).
        self.barcode_to_sku = dict(barcode_to_sku or {})

    def identify(
        self,
        region_rgb: np.ndarray,
        *,
        run_barcode: bool = True,
        run_ocr: bool = True,
    ) -> IdentificationResult:
        considered: dict[str, Any] = {}
        top_k = self.index.top_k(self.extractor.embed(region_rgb), k=5)

        if run_barcode:
            code = barcode_hook.decode_barcode(region_rgb)
            considered["barcode"] = code
            if code and code in self.barcode_to_sku:
                return IdentificationResult(
                    identified=True,
                    sku=self.barcode_to_sku[code],
                    confidence=0.99,
                    method="barcode",
                    candidates=top_k,
                    methods_considered=considered,
                )

        embedding_best = top_k[0] if top_k else None
        considered["embedding_top"] = (
            {"sku": embedding_best.sku, "score": round(embedding_best.score, 4)} if embedding_best else None
        )

        if run_ocr:
            text = ocr_hook.read_text(region_rgb)
            tokens = ocr_hook.extract_sku_tokens(text)
            considered["ocr_text_sample"] = text[:80]
            known_skus = {e.sku for e in self.index.entries}
            hit = next((t for t in tokens if t in known_skus), None)
            if hit:
                return IdentificationResult(
                    identified=True,
                    sku=hit,
                    confidence=0.95,
                    method="ocr",
                    candidates=top_k,
                    methods_considered=considered,
                )

        if embedding_best is None:
            return IdentificationResult(False, None, 0.0, "none", [], considered)

        ambiguous = len(top_k) > 1 and (top_k[0].score - top_k[1].score) < self.ambiguity_margin
        if ambiguous:
            cap = min(top_k[0].score, 0.85)
            return IdentificationResult(
                identified=False,
                sku=None,
                confidence=round(cap, 4),
                method="ambiguous",
                candidates=top_k,
                methods_considered=considered,
            )
        if top_k[0].score >= self.match_threshold:
            return IdentificationResult(
                identified=True,
                sku=top_k[0].sku,
                confidence=round(top_k[0].score, 4),
                method="embedding",
                candidates=top_k,
                methods_considered=considered,
            )
        return IdentificationResult(
            identified=False,
            sku=None,
            confidence=round(top_k[0].score, 4),
            method="none",
            candidates=top_k,
            methods_considered=considered,
        )

    def close(self) -> None:
        self.extractor.close()
