"""Visual feature extractors for product identification (Phase 6).

Two interchangeable backends behind one interface:

- :class:`HistogramEmbeddingExtractor` - deterministic, dependency-light
  (numpy + cv2) HSV color-histogram plus spatial-layout features. Not as
  discriminative as a learned model, but stable, fast, and fully testable on
  synthetic images - which is what makes the matching logic itself CI-verifiable.
- :class:`ClipEmbeddingExtractor` - a pretrained CLIP-style image encoder via
  the optional ``open_clip`` package, imported lazily so the platform never
  requires torch at rest. This is the production-grade default when available.

All vectors are L2-normalized; similarity is cosine (dot product).
"""

from __future__ import annotations

from typing import Any, Protocol, runtime_checkable

import cv2
import numpy as np


def l2_normalize(vec: np.ndarray) -> np.ndarray:
    norm = float(np.linalg.norm(vec))
    if norm <= 0:
        out = np.zeros_like(vec, dtype=float)
        out[:] = 1e-9
        return out
    return vec.astype(float) / norm


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    return float(np.dot(a, b))


@runtime_checkable
class EmbeddingExtractor(Protocol):
    """Anything that maps an RGB uint8 region to a normalized feature vector."""

    def embed(self, image: np.ndarray) -> np.ndarray: ...

    def close(self) -> None: ...


class HistogramEmbeddingExtractor:
    """Deterministic appearance embedding: HSV histogram + layout energy.

    Feature blocks (concatenated, L2-normalized):
    - 16-bin H x 4-bin S 2-D histogram over the whole region (color identity)
    - 3 horizontal-strip mean-V values (vertical layout cue)
    - Sobel gradient magnitude mean (texture/label density cue)

    Deterministic by construction; identical inputs yield identical vectors,
    which the identification tests rely on.
    """

    def __init__(self, hue_bins: int = 16, sat_bins: int = 4) -> None:
        self.hue_bins = hue_bins
        self.sat_bins = sat_bins

    def embed(self, image: np.ndarray) -> np.ndarray:
        if image is None or image.size == 0 or image.ndim != 3 or image.shape[2] != 3:
            raise ValueError("expected a non-empty RGB uint8 image of shape (h, w, 3)")
        hsv = cv2.cvtColor(image[..., ::-1], cv2.COLOR_RGB2HSV)  # RGB -> BGR -> HSV
        h_hist = cv2.calcHist([hsv], [0, 1], None, [self.hue_bins, self.sat_bins], [0, 180, 0, 256])
        h_part = h_hist.flatten() / max(1.0, h_hist.sum())
        h, w = hsv.shape[:2]
        strip_h = max(1, h // 3)
        v_parts = np.array(
            [hsv[i * strip_h:(i + 1) * strip_h, :, 2].mean() / 255.0 for i in range(3)],
            dtype=float,
        )
        gray = cv2.cvtColor(image[..., ::-1], cv2.COLOR_BGR2GRAY)
        sobel = cv2.Sobel(gray, cv2.CV_32F, 1, 1, ksize=3)
        grad_part = np.array([min(float(np.abs(sobel).mean()) / 64.0, 1.0)])
        vec = np.concatenate([h_part, v_parts, grad_part])
        return l2_normalize(vec)

    def close(self) -> None:
        pass

    @property
    def info(self) -> dict[str, Any]:
        return {"kind": "histogram", "hue_bins": self.hue_bins, "sat_bins": self.sat_bins}


class ClipEmbeddingExtractor:
    """CLIP-style image embedding via optional ``open_clip`` (lazy import)."""

    def __init__(self, model_name: str = "ViT-B-32", pretrained: str = "openai", device: str | None = None) -> None:
        try:
            import open_clip  # noqa: PLC0415 - deliberate lazy import
            import torch  # noqa: PLC0415
        except ImportError as exc:  # pragma: no cover - depends on env
            raise ImportError(
                "ClipEmbeddingExtractor requires the optional 'open_clip' and 'torch' "
                "dependencies; install them or use HistogramEmbeddingExtractor."
            ) from exc
        self._torch = torch
        model, _, preprocess = open_clip.create_model_and_transforms(model_name, pretrained=pretrained)
        self._model = model.eval()
        self._preprocess = preprocess
        self._device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        self._model.to(self._device)

    def embed(self, image: np.ndarray) -> np.ndarray:
        from PIL import Image  # noqa: PLC0415

        pil = Image.fromarray(image)
        tensor = self._preprocess(pil).unsqueeze(0).to(self._device)
        with self._torch.no_grad():
            features = self._model.encode_image(tensor)
        return l2_normalize(features.squeeze(0).cpu().numpy())

    def close(self) -> None:
        pass

    @property
    def info(self) -> dict[str, Any]:
        return {"kind": "clip"}
