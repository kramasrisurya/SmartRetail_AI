"""Unit tests for embeddings and the identification pipeline (Phase 6).

Uses synthetic catalog images so the matcher's contract - top-K ordering,
honest unidentified below threshold, ambiguity preserved as candidates, and
barcode/OCR override precedence with method attribution - is verified without
any native vision dependencies.
"""

from __future__ import annotations

import numpy as np
import pytest

import services.product.barcode as barcode_mod
import services.product.ocr as ocr_mod
from services.product.embeddings import HistogramEmbeddingExtractor, cosine_similarity, l2_normalize
from services.product.identifier import CatalogEntry, ProductIdentifier


def solid_color(w=48, h=64, rgb=(200, 30, 30), noise=0) -> np.ndarray:
    rng = np.random.default_rng(7)
    img = np.zeros((h, w, 3), dtype=np.uint8)
    img[:] = rgb
    if noise:
        img = np.clip(img.astype(int) + rng.integers(-noise, noise + 1, img.shape), 0, 255).astype(np.uint8)
    return img


def two_tone(top=(30, 120, 240), bottom=(250, 220, 40), noise=0) -> np.ndarray:
    img = np.zeros((64, 48, 3), dtype=np.uint8)
    img[:32] = top
    img[32:] = bottom
    if noise:
        rng = np.random.default_rng(11)
        img = np.clip(img.astype(int) + rng.integers(-noise, noise + 1, img.shape), 0, 255).astype(np.uint8)
    return img


# --- embedding extractor -------------------------------------------------------


def test_histogram_extractor_is_deterministic_and_normalized() -> None:
    ext = HistogramEmbeddingExtractor()
    img = two_tone()
    v1 = ext.embed(img)
    v2 = ext.embed(img)
    assert np.allclose(v1, v2)
    assert abs(np.linalg.norm(v1) - 1.0) < 1e-9


def test_distinct_appearances_are_far_apart() -> None:
    """Distinct products must sit well apart RELATIVE to same-product noise;
    the extractor's shared layout blocks put a similarity floor under any two
    regions, so the meaningful bound is separation from the noisy-self score."""
    ext = HistogramEmbeddingExtractor()
    red = ext.embed(solid_color(rgb=(200, 20, 20)))
    blue = ext.embed(solid_color(rgb=(20, 40, 220)))
    self_noisy = cosine_similarity(ext.embed(two_tone()), ext.embed(two_tone(noise=30)))
    cross = cosine_similarity(red, blue)
    assert cross < 0.8
    assert cross < self_noisy - 0.05


def test_noisy_variant_of_same_product_stays_close() -> None:
    """§8 partially-occluded / degraded views: lower similarity, not rejection."""
    ext = HistogramEmbeddingExtractor()
    clean = ext.embed(two_tone())
    noisy = ext.embed(two_tone(noise=25))
    assert cosine_similarity(clean, noisy) > cosine_similarity(clean, clean) * 0.5


def test_embed_rejects_bad_input() -> None:
    ext = HistogramEmbeddingExtractor()
    with pytest.raises(ValueError):
        ext.embed(np.zeros((10,), dtype=np.uint8))


# --- identifier ------------------------------------------------------------------


def _extractor() -> HistogramEmbeddingExtractor:
    return HistogramEmbeddingExtractor()


DISTINCT_CATALOG = lambda ext: [  # noqa: E731 — compact fixture builder
    CatalogEntry(sku="A123", vector=ext.embed(two_tone())),
    CatalogEntry(sku="B222", vector=ext.embed(solid_color(rgb=(230, 230, 235)))),
    CatalogEntry(sku="C333", vector=ext.embed(solid_color(rgb=(30, 170, 60)))),
]

AMBIGUOUS_CATALOG = lambda ext: [  # noqa: E731
    CatalogEntry(sku="A123", vector=ext.embed(two_tone())),
    # Near-twin: tiny deterministic perturbation → cosine ~0.9997.
    CatalogEntry(sku="C333", vector=l2_normalize(ext.embed(two_tone()) + 0.02)),
    CatalogEntry(sku="B222", vector=ext.embed(solid_color(rgb=(230, 230, 235)))),
]


def make_identifier(monkeypatch, catalog_builder=None, **kw) -> ProductIdentifier:
    ext = _extractor()
    return ProductIdentifier(ext, (catalog_builder or DISTINCT_CATALOG)(ext), **kw)


def test_clear_match_identifies_with_embedding_method(monkeypatch) -> None:
    monkeypatch.setattr(barcode_mod, "decode_barcode", lambda img: None)
    monkeypatch.setattr(ocr_mod, "read_text", lambda img: "")
    ident = make_identifier(monkeypatch, match_threshold=0.75)
    result = ident.identify(two_tone())
    assert result.identified and result.sku == "A123"
    assert result.method == "embedding"
    assert result.confidence >= 0.75
    payload = result.to_payload()
    assert payload["methods_considered"]["embedding_top"]["sku"] == "A123"


def test_below_threshold_reports_unidentified_not_nearest_neighbor(monkeypatch) -> None:
    monkeypatch.setattr(barcode_mod, "decode_barcode", lambda img: None)
    monkeypatch.setattr(ocr_mod, "read_text", lambda img: "")

    class JunkExtractor:
        """Anti-correlated with the (nonnegative) reference vector."""

        def __init__(self, ref: np.ndarray) -> None:
            self._v = l2_normalize(-ref.astype(float))

        def embed(self, image):
            return self._v

        def close(self):
            pass

    ext = _extractor()
    ref = ext.embed(two_tone())
    ident = ProductIdentifier(
        JunkExtractor(ref),
        [CatalogEntry(sku="A123", vector=ref)],
        match_threshold=0.75,
    )
    result = ident.identify(two_tone())
    assert not result.identified and result.sku is None
    assert result.method == "none"


def test_ambiguous_pair_returns_candidates_without_forcing_choice(monkeypatch) -> None:
    monkeypatch.setattr(barcode_mod, "decode_barcode", lambda img: None)
    monkeypatch.setattr(ocr_mod, "read_text", lambda img: "")
    ident = make_identifier(monkeypatch, AMBIGUOUS_CATALOG, match_threshold=0.75,
                            ambiguity_margin=0.05)
    result = ident.identify(two_tone())
    assert result.method == "ambiguous"
    assert not result.identified
    skus = {c.sku for c in result.candidates}
    assert {"A123", "C333"} <= skus, "both near-twins must surface to reviewers"


def test_barcode_read_overrides_embedding(monkeypatch) -> None:
    calls = {"ocr": False}

    def fake_barcode(img):
        return "4006381333931"

    def fake_ocr(img):
        calls["ocr"] = True
        return ""

    monkeypatch.setattr(barcode_mod, "decode_barcode", fake_barcode)
    monkeypatch.setattr(ocr_mod, "read_text", fake_ocr)
    ident = make_identifier(monkeypatch, barcode_to_sku={"4006381333931": "B222"})
    result = ident.identify(two_tone())
    assert result.identified and result.sku == "B222"
    assert result.method == "barcode" and result.confidence == pytest.approx(0.99)
    assert not calls["ocr"], "a barcode hit must short-circuit the OCR pass"


def test_ocr_sku_token_overrides_embedding(monkeypatch) -> None:
    monkeypatch.setattr(barcode_mod, "decode_barcode", lambda img: None)
    monkeypatch.setattr(ocr_mod, "read_text", lambda img: "coffee beans a123 250g")
    ident = make_identifier(monkeypatch)
    result = ident.identify(two_tone())
    assert result.identified and result.sku == "A123"
    assert result.method == "ocr"
    assert result.confidence == pytest.approx(0.95)


def test_unknown_barcode_falls_through_to_embedding(monkeypatch) -> None:
    monkeypatch.setattr(barcode_mod, "decode_barcode", lambda img: "0000000000000")
    monkeypatch.setattr(ocr_mod, "read_text", lambda img: "")
    ident = make_identifier(monkeypatch, barcode_to_sku={"4006381333931": "B222"})
    result = ident.identify(two_tone())
    assert result.method == "embedding", "unknown code must not hijack the result"


def test_hooks_disabled_flags_are_honored(monkeypatch) -> None:
    monkeypatch.setattr(barcode_mod, "decode_barcode", lambda img: None)
    monkeypatch.setattr(ocr_mod, "read_text", lambda img: "")
    ident = make_identifier(monkeypatch)
    result = ident.identify(two_tone(), run_barcode=False, run_ocr=False)
    assert "barcode" not in result.methods_considered
    assert "ocr_text_sample" not in result.methods_considered
