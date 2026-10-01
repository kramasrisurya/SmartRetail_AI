"""Unit tests: auth/RBAC/audit/metrics (Phase 19)."""

from __future__ import annotations

import pytest

from services.security import (
    ROLE_PERMISSIONS,
    Authorizer,
    TokenVerifier,
    audit,
    audit_log_entries,
    has_permission,
    hash_password,
    issue_token,
    metric_increment,
    metric_set,
    render_prometheus,
    verify_password,
)


def test_password_hash_roundtrip_and_wrong_password():
    stored = hash_password("s3cret!")
    assert verify_password("s3cret!", stored)
    assert not verify_password("wrong", stored)
    assert stored != hash_password("s3cret!"), "salt must make hashes unique"


def test_token_issue_verify_expiry_and_kind():
    v = TokenVerifier()
    tok = issue_token("op1", "security_operator", ttl_seconds=60)
    claims = v.verify(tok)
    assert claims and claims["sub"] == "op1" and claims["role"] == "security_operator"
    expired = issue_token("op1", "security_operator", ttl_seconds=-5)
    assert v.verify(expired) is None
    refresh = issue_token("op1", "security_operator", kind="refresh")
    assert v.verify(refresh) is None, "refresh token is not an access token"
    assert v.verify(refresh, kinds=("access", "refresh")) is not None


def test_token_tampering_and_revocation():
    v = TokenVerifier()
    tok = issue_token("u", "admin")
    body, sig = tok.split(".")
    tampered = body + ".forged"
    assert v.verify(tampered) is None
    v.revoke(tok)
    assert v.verify(tok) is None


def test_rbac_matrix_boundaries():
    assert has_permission("security_operator", "resolve_alerts")
    assert not has_permission("security_operator", "manage_users")
    assert not has_permission("view_only", "view_live_video")
    assert has_permission("super_admin", "anything_at_all")


def test_authorizer_require_raises_without_permission():
    claims = {"sub": "u", "role": "analyst"}
    az = Authorizer(claims)
    az.require("view_analytics")
    with pytest.raises(PermissionError):
        az.require("manage_cameras")


def test_audit_log_records_and_filters():
    audit("op9", "alert.resolve", "alert", 42, {"note": "receipt shown"})
    audit("op9", "camera.patch", "camera", 7)
    audit("op2", "evidence.view", "alert", 42)
    mine = audit_log_entries(actor="op9", limit=10)
    assert all(r["actor"] == "op9" for r in mine) and len(mine) >= 2
    alerts = audit_log_entries(entity_type="alert", limit=10)
    assert {r["entity_id"] for r in alerts} >= {"42"}
    latest = audit_log_entries(limit=1)[0]
    assert latest["action"] in {"alert.resolve", "camera.patch", "evidence.view"}


def test_metrics_prometheus_rendering():
    metric_increment("smartretail_alerts_total", labels='level="high"')
    metric_increment("smartretail_alerts_total", labels='level="high"')
    metric_set("smartretail_camera_health", 1, labels='camera="3"')
    text = render_prometheus()
    assert 'smartretail_alerts_total{level="high"} 2' in text
    assert 'smartretail_camera_health{camera="3"} 1' in text
    # every rendered line must be valid prometheus-ish: name{labels} value
    for line in text.strip().splitlines():
        name = line.split("{")[0].split(" ")[0]
        assert name.replace("_", "").isalnum()


def test_roles_seed_alignment():
    """The matrix must cover every seeded role code (Phase 2 baseline)."""
    expected = {"super_admin", "org_admin", "store_manager", "security_manager",
                "security_operator", "analyst", "auditor", "view_only"}
    assert set(ROLE_PERMISSIONS) == expected
