"""Optional OCR hook (spec §103 "OCR / Barcode").

Reads visible product text/labels from a region. A confident SKU-like token
(e.g. ``A123`` printed on the packaging) is treated as a high-confidence
identification override, second only to a barcode read.

pytesseract requires the native tesseract binary; when absent the module
degrades gracefully (``AVAILABLE = False``, ``read_text`` returns "").
"""

from __future__ import annotations

import logging
import re

import numpy as np

logger = logging.getLogger(__name__)

try:  # pragma: no cover - depends on host binaries
    import pytesseract as _pytesseract

    AVAILABLE = True
except Exception as exc:
    _pytesseract = None
    AVAILABLE = False
    logger.info("pytesseract unavailable (%s); OCR hook disabled", type(exc).__name__)

# SKU-like tokens: 2+ letters followed by 2+ digits, or pure alnum of length>=4.
_SKU_PATTERN = re.compile(r"\b[A-Z]{1,4}[0-9]{2,5}\b")


def read_text(image_rgb: np.ndarray) -> str:
    """OCR the region and return raw uppercase text ('' when unavailable)."""
    if not AVAILABLE:
        return ""
    try:  # pragma: no cover - depends on host binaries
        text = _pytesseract.image_to_string(image_rgb)
        return text.upper().strip()
    except Exception:
        logger.exception("ocr failed")
        return ""


def extract_sku_tokens(text: str) -> list[str]:
    """Pull SKU-shaped tokens out of OCR text."""
    return _SKU_PATTERN.findall(text.upper())
