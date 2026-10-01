"""Optional barcode hook (spec §103 "OCR / Barcode").

A successfully read barcode is close to ground truth, so when available it is
treated as a very-high-confidence override of the probabilistic embedding
match rather than just another vote. pyzbar needs the native zbar shared
library, which is frequently absent (especially on Windows) - so this module
degrades gracefully: :data:`AVAILABLE` flips False and ``decode_barcode``
returns ``None`` instead of raising, keeping the pipeline honest about *why*
it did not use the hook.
"""

from __future__ import annotations

import logging

import numpy as np

logger = logging.getLogger(__name__)

try:  # pragma: no cover - depends on host libraries
    from pyzbar.pyzbar import decode as _pyzbar_decode

    AVAILABLE = True
except Exception as exc:  # ImportError or missing zbar DLL
    _pyzbar_decode = None
    AVAILABLE = False
    logger.info("pyzbar unavailable (%s); barcode hook disabled", type(exc).__name__)


def decode_barcode(image_rgb: np.ndarray) -> str | None:
    """Return the first decodable barcode string in the region, else None."""
    if not AVAILABLE:
        return None
    try:  # pragma: no cover - depends on host libraries
        results = _pyzbar_decode(image_rgb)
        for item in results:
            data = item.data.decode("utf-8", errors="replace").strip()
            if data:
                return data
    except Exception:
        logger.exception("barcode decode failed")
    return None
