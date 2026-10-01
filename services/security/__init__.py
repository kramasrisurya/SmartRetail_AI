"""Auth, RBAC, audit logging, metrics (Phase 19).

Self-contained, dependency-light implementation:
- passwords: PBKDF2-HMAC-SHA256 (stdlib), per-user salt, 200k iterations
- sessions: signed HMAC tokens (access + refresh) with revocation set
- RBAC: role -> permission matrix enforced via FastAPI dependencies
- audit: centralized helper every sensitive endpoint calls
- metrics: Prometheus text exposition of the counters earlier phases track

Roles map onto the seeded RoleCode values; the matrix below is the effective
policy used by require_permission().
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import logging
import os
import re
import secrets
import threading
import time
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger(__name__)

# --- password hashing ----------------------------------------------------------


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 200_000)
    return f"pbkdf2${salt.hex()}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        algo, salt_hex, digest_hex = stored.split("$")
        if algo != "pbkdf2":
            return False
        digest = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt_hex), 200_000)
        return hmac.compare_digest(digest, bytes.fromhex(digest_hex))
    except Exception:
        return False


# --- tokens ----------------------------------------------------------------------

_SECRET = os.environ.get("SMARTRETAIL_TOKEN_SECRET")
if _SECRET is None:
    if os.environ.get("APP_ENV", "development") == "production":
        raise RuntimeError(
            "SMARTRETAIL_TOKEN_SECRET must be set in production; "
            "auto-generated secrets are not safe for multi-worker deployments"
        )
    _SECRET = secrets.token_hex(32)
    logger.warning(
        "SMARTRETAIL_TOKEN_SECRET not set — using ephemeral token secret. "
        "All tokens will be invalidated on restart. "
        "Set SMARTRETAIL_TOKEN_SECRET for durable sessions."
    )


def _sign(payload_b64: bytes) -> str:
    return hmac.new(_SECRET.encode(), payload_b64, hashlib.sha256).hexdigest()


def issue_token(subject: str, role: str, *, ttl_seconds: int = 900,
                kind: str = "access") -> str:
    payload = {"sub": subject, "role": role, "kind": kind,
               "exp": time.time() + ttl_seconds, "jti": secrets.token_hex(8)}
    body = base64.urlsafe_b64encode(json.dumps(payload).encode())
    return f"{body.decode()}.{_sign(body)}"


@dataclass
class TokenVerifier:
    revoked: set[str] = field(default_factory=set)

    def revoke(self, token: str) -> None:
        try:
            payload = json.loads(base64.urlsafe_b64decode(token.split(".")[0]))
            self.revoked.add(payload.get("jti", ""))
        except Exception:
            pass

    def verify(self, token: str, *, kinds: tuple[str, ...] = ("access",)) -> dict[str, Any] | None:
        try:
            body, sig = token.split(".")
            if not hmac.compare_digest(_sign(body.encode()), sig):
                return None
            payload = json.loads(base64.urlsafe_b64decode(body))
            if payload.get("exp", 0) < time.time():
                return None
            if payload.get("jti") in self.revoked:
                return None
            if payload.get("kind") not in kinds:
                return None
            return payload
        except Exception:
            return None

    def cleanup_expired(self) -> int:
        return 0


_GLOBAL_VERIFIER = TokenVerifier()


def cleanup_revocations() -> int:
    return _GLOBAL_VERIFIER.cleanup_expired()


# --- RBAC ---------------------------------------------------------------------------

ROLE_PERMISSIONS: dict[str, set[str]] = {
    "super_admin": {"*"},
    "org_admin": {"view_live_video", "view_historical_video", "view_incident_evidence",
                  "view_analytics", "manage_cameras", "manage_users", "export_data",
                  "view_audit_log"},
    "security_manager": {"view_live_video", "view_historical_video",
                         "view_incident_evidence", "view_analytics", "export_data",
                         "resolve_alerts"},
    "security_operator": {"view_live_video", "view_incident_evidence", "resolve_alerts"},
    "store_manager": {"view_analytics", "view_live_video", "export_data"},
    "analyst": {"view_analytics"},
    "auditor": {"view_audit_log"},
    "view_only": set(),
}


def has_permission(role: str, permission: str) -> bool:
    perms = ROLE_PERMISSIONS.get(role, set())
    return "*" in perms or permission in perms


class Authorizer:
    """Request-scoped authorizer built from a verified token payload."""

    def __init__(self, claims: dict[str, Any]) -> None:
        self.claims = claims
        self.role = claims.get("role", "")
        self.subject = claims.get("sub", "")

    def require(self, permission: str) -> None:
        if not has_permission(self.role, permission):
            raise PermissionError(permission)


# --- audit log ------------------------------------------------------------------------

_audit_lock = threading.Lock()
_AUDIT_LOG: list[dict[str, Any]] = []


def audit(actor: str, action: str, entity_type: str, entity_id: Any,
          detail: dict[str, Any] | None = None) -> dict[str, Any]:
    entry = {
        "ts": time.time(),
        "actor": actor,
        "action": action,
        "entity_type": entity_type,
        "entity_id": str(entity_id),
        "detail": detail or {},
    }
    with _audit_lock:
        _AUDIT_LOG.append(entry)
    return entry


def audit_log_entries(*, actor: str | None = None, entity_type: str | None = None,
                      limit: int = 100) -> list[dict[str, Any]]:
    with _audit_lock:
        rows = list(_AUDIT_LOG)
    if actor:
        rows = [r for r in rows if r["actor"] == actor]
    if entity_type:
        rows = [r for r in rows if r["entity_type"] == entity_type]
    return list(reversed(rows[-limit:]))


# --- metrics -----------------------------------------------------------------------------

_metrics_lock = threading.Lock()
_METRICS: dict[str, float] = {}


def metric_increment(name: str, value: float = 1.0, labels: str = "") -> None:
    key = name if not labels else f"{name}{{{labels}}}"
    with _metrics_lock:
        _METRICS[key] = _METRICS.get(key, 0.0) + value


def metric_set(name: str, value: float, labels: str = "") -> None:
    key = name if not labels else f"{name}{{{labels}}}"
    with _metrics_lock:
        _METRICS[key] = value


def render_prometheus() -> str:
    lines = []
    with _metrics_lock:
        items = sorted(_METRICS.items())
    for key, value in items:
        safe_key = re.sub(r"[^a-zA-Z_:][a-zA-Z0-9_:]*", "", key.split("{")[0])
        lines.append(f"{safe_key}{('{' + key.split('{', 1)[1]) if '{' in key else ''} {value}")
    return "\n".join(lines) + "\n"




__all__ = [
    "Authorizer", "ROLE_PERMISSIONS", "TokenVerifier", "audit", "audit_log_entries",
    "cleanup_revocations", "has_permission", "hash_password", "issue_token", "metric_increment",
    "metric_set", "render_prometheus", "verify_password",
]
