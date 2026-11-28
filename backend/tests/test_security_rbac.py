import sys
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from pathlib import Path

import jwt
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

# Ensure backend/ is on sys.path when running pytest from any directory
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.config import JWT_ALGORITHM, JWT_SECRET_KEY
from app.database import SessionLocal
from app.main import app
from app.models import AuditLog, Berth, DockyardGroup, GroupMember, User, UserSession
from app.rbac import ensure_berth_access, ensure_group_create_berth_access, ensure_group_owner
from app.schemas import UserLoginRequest
from app.security import (
    create_access_token,
    hash_password,
    validate_password_strength,
    verify_password,
)

client = TestClient(app)


def _auth_header(user: User) -> dict[str, str]:
    token = create_access_token(str(user.id), user.role)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="module")
def test_env():
    """Create isolated test users, a shared group, and berths, then clean up completely."""
    db = SessionLocal()
    tag = uuid.uuid4().hex[:8]
    password = "TestPassword1!"
    pw_hash = hash_password(password)

    admin1 = User(
        username=f"pytest_adm1_{tag}",
        email=f"pytest_adm1_{tag}@coastalhorizon.test",
        full_name="Pytest Admin One",
        password_hash=pw_hash,
        role="admin",
    )
    admin2 = User(
        username=f"pytest_adm2_{tag}",
        email=f"pytest_adm2_{tag}@coastalhorizon.test",
        full_name="Pytest Admin Two",
        password_hash=pw_hash,
        role="admin",
    )
    owner = User(
        username=f"pytest_own_{tag}",
        email=f"pytest_own_{tag}@coastalhorizon.test",
        full_name="Pytest Group Owner",
        password_hash=pw_hash,
        role="user",
    )
    updater = User(
        username=f"pytest_upd_{tag}",
        email=f"pytest_upd_{tag}@coastalhorizon.test",
        full_name="Pytest Updater Member",
        password_hash=pw_hash,
        role="user",
    )
    assigner = User(
        username=f"pytest_asg_{tag}",
        email=f"pytest_asg_{tag}@coastalhorizon.test",
        full_name="Pytest Assigner Member",
        password_hash=pw_hash,
        role="user",
    )
    outsider = User(
        username=f"pytest_out_{tag}",
        email=f"pytest_out_{tag}@coastalhorizon.test",
        full_name="Pytest Outsider User",
        password_hash=pw_hash,
        role="user",
    )

    users = [admin1, admin2, owner, updater, assigner, outsider]
    db.add_all(users)
    db.flush()

    group = DockyardGroup(
        name=f"Pytest Group {tag}",
        description="Automated RBAC test group",
        owner_id=owner.id,
    )
    db.add(group)
    db.flush()

    m_updater = GroupMember(
        group_id=group.id,
        user_id=updater.id,
        can_create=True,
        can_update=True,
        can_assign=False,
    )
    m_assigner = GroupMember(
        group_id=group.id,
        user_id=assigner.id,
        can_create=False,
        can_update=False,
        can_assign=True,
    )
    db.add_all([m_updater, m_assigner])

    private_berth = Berth(
        berth_number=f"PT-PRIV-{tag.upper()}",
        max_length_meters=Decimal("180.00"),
        max_draft_meters=Decimal("10.50"),
        status="AVAILABLE",
        owner_id=owner.id,
        group_id=None,
    )
    shared_berth = Berth(
        berth_number=f"PT-SHRD-{tag.upper()}",
        max_length_meters=Decimal("220.00"),
        max_draft_meters=Decimal("12.00"),
        status="AVAILABLE",
        owner_id=owner.id,
        group_id=group.id,
    )
    db.add_all([private_berth, shared_berth])
    db.commit()

    yield {
        "db": db,
        "password": password,
        "admin1": admin1,
        "admin2": admin2,
        "owner": owner,
        "updater": updater,
        "assigner": assigner,
        "outsider": outsider,
        "group": group,
        "private_berth": private_berth,
        "shared_berth": shared_berth,
    }

    # Teardown: remove all temporary test rows so Supabase stays clean
    user_ids = [u.id for u in users]
    usernames = [u.username for u in users]
    db.query(Berth).filter(Berth.id.in_([private_berth.id, shared_berth.id])).delete(
        synchronize_session=False
    )
    db.query(GroupMember).filter(GroupMember.group_id == group.id).delete(
        synchronize_session=False
    )
    db.query(DockyardGroup).filter(DockyardGroup.id == group.id).delete(
        synchronize_session=False
    )
    db.query(UserSession).filter(UserSession.user_id.in_(user_ids)).delete(
        synchronize_session=False
    )
    db.query(AuditLog).filter(
        (AuditLog.user_id.in_(user_ids)) | (AuditLog.username.in_(usernames))
    ).delete(synchronize_session=False)
    db.query(User).filter(User.id.in_(user_ids)).delete(synchronize_session=False)
    db.commit()
    db.close()


# ---------------- 1. Password Hashing & Strength ----------------

def test_password_hashing_and_strength_validation():
    hashed = hash_password("StrongPass99!")
    assert hashed != "StrongPass99!"
    assert verify_password("StrongPass99!", hashed) is True
    assert verify_password("WrongPass99!", hashed) is False
    assert validate_password_strength("weak") is not None
    assert validate_password_strength("StrongPass99!") is None


# ---------------- 2. JWT Authentication (Missing, Expired, Tampered, Valid) ----------------

def test_missing_token_returns_401():
    res = client.get("/api/v1/auth/me")
    assert res.status_code == 401


def test_expired_token_returns_401(test_env):
    owner = test_env["owner"]
    expired_payload = {
        "sub": str(owner.id),
        "role": owner.role,
        "type": "access",
        "iat": int((datetime.now(timezone.utc) - timedelta(minutes=20)).timestamp()),
        "exp": int((datetime.now(timezone.utc) - timedelta(minutes=5)).timestamp()),
    }
    expired_token = jwt.encode(expired_payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {expired_token}"})
    assert res.status_code == 401
    assert "expired" in res.json()["detail"].lower()


def test_tampered_token_returns_401(test_env):
    token = create_access_token(str(test_env["owner"].id), "user")
    tampered = token[:-4] + "XXXX"
    res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {tampered}"})
    assert res.status_code == 401


def test_valid_login_sets_httponly_refresh_cookie(test_env):
    owner = test_env["owner"]
    fields = set(UserLoginRequest.model_fields.keys())
    id_field = next(
        (k for k in ("identifier", "username_or_email", "username", "email") if k in fields),
        next(k for k in fields if k != "password"),
    )
    res = client.post(
        "/api/v1/auth/login",
        json={id_field: owner.username, "password": test_env["password"]},
    )
    assert res.status_code == 200
    assert "access_token" in res.json()
    assert "chd_refresh_token" in res.cookies


# ---------------- 3. Ownership Enforcement ----------------

def test_user_cannot_read_or_delete_another_users_private_berth(test_env):
    outsider = test_env["outsider"]
    berth = test_env["private_berth"]
    headers = _auth_header(outsider)

    res_read = client.get(f"/api/v1/berths/{berth.id}", headers=headers)
    assert res_read.status_code in (403, 404)

    res_del = client.delete(f"/api/v1/berths/{berth.id}", headers=headers)
    assert res_del.status_code in (403, 404)


# ---------------- 4. Shared-Group Granular Permission Matrix ----------------

def test_group_permission_matrix_enforced(test_env):
    db = test_env["db"]
    owner = test_env["owner"]
    updater = test_env["updater"]
    assigner = test_env["assigner"]
    group = test_env["group"]
    shared_berth = test_env["shared_berth"]

    # Updater has create + update, but NOT assign or delete
    ensure_group_create_berth_access(db, updater, group)
    ensure_berth_access(db, updater, shared_berth, "update")
    with pytest.raises(HTTPException) as exc_u_assign:
        ensure_berth_access(db, updater, shared_berth, "assign")
    assert exc_u_assign.value.status_code == 403

    # Assigner has assign, but NOT create, update, or delete
    ensure_berth_access(db, assigner, shared_berth, "assign")
    with pytest.raises(HTTPException) as exc_a_create:
        ensure_group_create_berth_access(db, assigner, group)
    assert exc_a_create.value.status_code == 403

    with pytest.raises(HTTPException) as exc_a_update:
        ensure_berth_access(db, assigner, shared_berth, "update")
    assert exc_a_update.value.status_code == 403

    # Non-owner member cannot delete shared berth or delete group via HTTP API
    res_del_berth = client.delete(
        f"/api/v1/berths/{shared_berth.id}", headers=_auth_header(updater)
    )
    assert res_del_berth.status_code == 403

    res_del_group = client.delete(
        f"/api/v1/groups/{group.id}", headers=_auth_header(updater)
    )
    assert res_del_group.status_code == 403

    # Owner passes owner-only check
    ensure_group_owner(owner, group)


# ---------------- 5. Admin RBAC, Safety Guardrails & Immediate Ban Rejection ----------------

def test_normal_user_blocked_from_admin_endpoints(test_env):
    res = client.get("/api/v1/admin/stats", headers=_auth_header(test_env["owner"]))
    assert res.status_code == 403


def test_admin_cannot_change_own_role_or_ban_another_admin(test_env):
    admin1 = test_env["admin1"]
    admin2 = test_env["admin2"]
    headers = _auth_header(admin1)

    res_self_role = client.patch(
        f"/api/v1/admin/users/{admin1.id}/role",
        json={"role": "user"},
        headers=headers,
    )
    assert res_self_role.status_code == 403

    res_ban_admin = client.post(
        f"/api/v1/admin/users/{admin2.id}/ban",
        json={"reason": "Should be blocked"},
        headers=headers,
    )
    assert res_ban_admin.status_code == 403


def test_banned_user_rejected_immediately_on_next_request(test_env):
    admin1 = test_env["admin1"]
    outsider = test_env["outsider"]

    # Outsider starts with a valid token
    outsider_headers = _auth_header(outsider)
    assert client.get("/api/v1/auth/me", headers=outsider_headers).status_code == 200

    # Admin bans outsider
    ban_res = client.post(
        f"/api/v1/admin/users/{outsider.id}/ban",
        json={"reason": "Automated security verification"},
        headers=_auth_header(admin1),
    )
    assert ban_res.status_code == 200

    # Exact same unexpired JWT is rejected immediately on the next request
    blocked_res = client.get("/api/v1/auth/me", headers=outsider_headers)
    assert blocked_res.status_code == 403
    assert "banned" in blocked_res.json()["detail"].lower()

    # Unban restores access
    unban_res = client.post(
        f"/api/v1/admin/users/{outsider.id}/unban",
        headers=_auth_header(admin1),
    )
    assert unban_res.status_code == 200
    assert client.get("/api/v1/auth/me", headers=outsider_headers).status_code == 200


# ---------------- 6. Brute-Force Failed Login Tracking & Lockout ----------------

def test_repeated_failed_logins_trigger_lockout(test_env):
    db = test_env["db"]
    outsider = test_env["outsider"]
    fields = set(UserLoginRequest.model_fields.keys())
    id_field = next(
        (k for k in ("identifier", "username_or_email", "username", "email") if k in fields),
        next(k for k in fields if k != "password"),
    )

    statuses = []
    for _ in range(6):
        res = client.post(
            "/api/v1/auth/login",
            json={id_field: outsider.username, "password": "DefinitelyWrongPassword9!"},
        )
        statuses.append(res.status_code)

    db.expire_all()
    refreshed = db.query(User).filter(User.id == outsider.id).first()
    assert refreshed.failed_login_attempts >= 5 or refreshed.locked_until is not None
    assert statuses[0] == 401
    assert statuses[-1] in (401, 403, 423, 429)