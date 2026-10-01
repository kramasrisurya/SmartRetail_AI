"""Running-version metadata.

The commit is captured at Docker build time (GIT_COMMIT build ARG), otherwise
read live from git, otherwise reported as "unknown" so the endpoint works even
outside a repository checkout (e.g. tests).
"""

import logging
import subprocess
from functools import lru_cache

from app.core.config import get_settings

logger = logging.getLogger(__name__)


def _git_commit() -> str:
    settings = get_settings()
    if settings.git_commit:
        return settings.git_commit
    try:
        result = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            capture_output=True,
            text=True,
            timeout=3,
        )
        if result.returncode == 0:
            return result.stdout.strip()
    except Exception:
        logger.debug("Could not determine git commit", exc_info=True)
    return "unknown"


@lru_cache
def get_version_info() -> dict[str, str]:
    settings = get_settings()
    return {"commit": _git_commit(), "build": settings.build_tag}
