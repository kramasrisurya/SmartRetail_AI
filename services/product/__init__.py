"""Product detection & identification (spec §8, Phase 6).

Turns raw frame regions into linked catalog entries with honest confidence and
full method attribution (embedding / barcode / OCR), so Phase 15 can explain
*why* the system believes a product was identified - not just that it was.

Modules:
- ``embeddings``  visual feature extractors (deterministic histogram default;
  CLIP lazy-loaded when the optional dependency exists)
- ``barcode`` / ``ocr``  optional high-confidence override hooks (graceful
  degradation when pyzbar/zbar or tesseract are not installed)
- ``identifier``  catalog vector index + top-K matching + method combination
- ``simulated``   scripted deterministic product appearances (A123/B222 demo)
- ``vision``      real-model localizer feeding the same identifier
- ``service``     frame consumer emitting batched persistence events
"""

from services.product.embeddings import (
    ClipEmbeddingExtractor,
    EmbeddingExtractor,
    HistogramEmbeddingExtractor,
    cosine_similarity,
    l2_normalize,
)
from services.product.identifier import CatalogIndex, IdentifiedCandidate, IdentificationResult, ProductIdentifier

__all__ = [
    "CatalogIndex",
    "ClipEmbeddingExtractor",
    "EmbeddingExtractor",
    "HistogramEmbeddingExtractor",
    "IdentifiedCandidate",
    "IdentificationResult",
    "ProductIdentifier",
    "cosine_similarity",
    "l2_normalize",
]
