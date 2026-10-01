"""Appearance embeddings for person re-identification (§10).

Three interchangeable backends:

- :class:`HashedAppearanceBackend` - simulation mode. Maps a scripted person
  id to a deterministic unit vector (seeded RNG), so the same shopper yields
  cosine ≈ 1.0 across cameras while different shoppers land near-orthogonal.
  This is what makes handoff fusion reproducible in tests and the demo.
- :class:`HistogramAppearanceBackend` - lightweight vision mode: the Phase 6
  histogram extractor applied to person crops; better than nothing, fully
  dependency-light, and honest about its limits.
- :class:`OsnetReidBackend` - production-grade OSNet via optional torchreid,
  imported lazily so CI never needs torch.

Aggregation follows §10: a track's embedding is the mean of per-observation
vectors (well-lit frames dominate less noisy ones), re-normalized after
averaging - a single unlucky frame cannot poison the match.
"""

from __future__ import annotations

import zlib

import numpy as np

from services.product.embeddings import HistogramEmbeddingExtractor, l2_normalize


class AppearanceBackend:
    """Common interface: observation -> normalized appearance vector."""

    def vector_for(self, person_ref: str, crop=None) -> np.ndarray:  # noqa: ANN001
        raise NotImplementedError

    def close(self) -> None:
        pass


class HashedAppearanceBackend(AppearanceBackend):
    """Deterministic pseudo-appearance for scripted persons (simulation)."""

    def __init__(self, dims: int = 32) -> None:
        self.dims = int(dims)

    def vector_for(self, person_ref: str, crop=None) -> np.ndarray:
        seed = zlib.crc32(person_ref.encode("utf-8"))
        rng = np.random.default_rng(seed)
        return l2_normalize(rng.standard_normal(self.dims))


class HistogramAppearanceBackend(AppearanceBackend):
    """Histogram features over an RGB person crop (vision-lite)."""

    def __init__(self) -> None:
        self._extractor = HistogramEmbeddingExtractor()

    def vector_for(self, person_ref: str, crop=None) -> np.ndarray:
        if crop is None:
            raise ValueError("HistogramAppearanceBackend requires an RGB crop")
        return self._extractor.embed(crop)


class OsnetReidBackend(AppearanceBackend):
    """OSNet person-ReID embeddings via optional torchreid (lazy import)."""

    def __init__(self, model_name: str = "osnet_x1_0", device: str | None = None) -> None:
        try:
            import torch  # noqa: PLC0415 - deliberate lazy import
            import torchvision.transforms as T  # noqa: PLC0415
            from torchreid.reid.utils import FeatureExtractor  # noqa: PLC0415
        except ImportError as exc:  # pragma: no cover - depends on env
            raise ImportError(
                "OsnetReidBackend requires optional 'torch', 'torchvision' and 'torchreid'; "
                "install them or use HashedAppearanceBackend/HistogramAppearanceBackend."
            ) from exc
        self._torch = torch
        transform = T.Compose([
            T.Resize((256, 128)),
            T.ToTensor(),
            T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ])
        self._extractor = FeatureExtractor(
            model_name=model_name, device=device or ("cuda" if torch.cuda.is_available() else "cpu"),
            transform=transform,
        )

    def vector_for(self, person_ref: str, crop=None) -> np.ndarray:
        if crop is None:
            raise ValueError("OsnetReidBackend requires an RGB crop")
        features = self._extractor(crop[..., ::-1])  # RGB->BGR per cv2 convention
        vec = np.asarray(features[0] if isinstance(features, list) else features, dtype=float)
        return l2_normalize(vec)
