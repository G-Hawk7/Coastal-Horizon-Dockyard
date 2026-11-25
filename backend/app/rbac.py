from typing import Callable, Set
from uuid import UUID

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Berth, DockyardGroup, GroupMember, User
from app.security import decode_access_token

# Role constants
ROLE_USER = "user"
ROLE_ADMIN = "admin"
VALID_ROLES = {ROLE_USER, ROLE_ADMIN}


# Permission constants
class Permission:
    BERTH_CREATE = "berth:create"
    BERTH_READ = "berth:read"
    BERTH_UPDATE = "berth:update"
    BERTH_DELETE = "berth:delete"
    BERTH_ASSIGN = "berth:assign"

    GROUP_CREATE = "group:create"
    GROUP_READ = "group:read"
    GROUP_MANAGE = "group:manage"

    ADMIN_STATS = "admin:stats"
    ADMIN_MANAGE_USERS = "admin:manage_users"
    ADMIN_MODERATE_CONTENT = "admin:moderate_content"
    ADMIN_VIEW_AUDIT = "admin:view_audit"
    ADMIN_EXPORT = "admin:export"


# Role-to-permission mapping enforced server-side
ROLE_PERMISSIONS: dict[str, Set[str]] = {
    ROLE_USER: {
        Permission.BERTH_CREATE,
        Permission.BERTH_READ,
        Permission.BERTH_UPDATE,
        Permission.BERTH_DELETE,
        Permission.BERTH_ASSIGN,
        Permission.GROUP_CREATE,
        Permission.GROUP_READ,
        Permission.GROUP_MANAGE,
    },
    ROLE_ADMIN: {
        Permission.BERTH_CREATE,
        Permission.BERTH_READ,
        Permission.BERTH_UPDATE,
        Permission.BERTH_DELETE,
        Permission.BERTH_ASSIGN,
        Permission.GROUP_CREATE,
        Permission.GROUP_READ,
        Permission.GROUP_MANAGE,
        Permission.ADMIN_STATS,
        Permission.ADMIN_MANAGE_USERS,
        Permission.ADMIN_MODERATE_CONTENT,
        Permission.ADMIN_VIEW_AUDIT,
        Permission.ADMIN_EXPORT,
    },
}

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authentication credentials.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = decode_access_token(credentials.credentials)
        user_id = UUID(payload["sub"])
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Access token has expired.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except (jwt.InvalidTokenError, ValueError, KeyError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or tampered access token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Banned users are rejected immediately on their very next request
    if user.is_banned:
        reason = f" Reason: {user.ban_reason}" if user.ban_reason else ""
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Your account has been banned.{reason}",
        )

    return user


def require_roles(*allowed_roles: str) -> Callable:
    """FastAPI dependency enforcing DB-backed role checks."""

    def dependency(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have the required role to perform this action.",
            )
        return current_user

    return dependency


def require_permissions(*required_permissions: str) -> Callable:
    """FastAPI dependency enforcing fine-grained role permissions."""

    def dependency(current_user: User = Depends(get_current_user)) -> User:
        user_perms = ROLE_PERMISSIONS.get(current_user.role, set())
        missing = [p for p in required_permissions if p not in user_perms]
        if missing:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions for this action.",
            )
        return current_user

    return dependency


def get_group_membership(db: Session, group_id: UUID, user_id: UUID) -> GroupMember | None:
    return (
        db.query(GroupMember)
        .filter(GroupMember.group_id == group_id, GroupMember.user_id == user_id)
        .first()
    )


def ensure_group_owner(user: User, group: DockyardGroup) -> None:
    """Only the group owner can delete, rename, or manage members."""
    if group.owner_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the group owner can perform this action.",
        )


def ensure_group_create_berth_access(db: Session, user: User, group: DockyardGroup) -> None:
    """Check if user can create a berth inside a shared group."""
    if user.role == ROLE_ADMIN or group.owner_id == user.id:
        return
    membership = get_group_membership(db, group.id, user.id)
    if membership and membership.can_create:
        return
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="You do not have 'create' permission in this group.",
    )


def ensure_berth_access(db: Session, user: User, berth: Berth, action: str) -> None:
    """
    Enforce ownership and shared-group permissions on a Berth record.
    action: 'read' | 'update' | 'delete' | 'assign'
    """
    if user.role == ROLE_ADMIN:
        return

    # Record owner always has full access to their own berth
    if berth.owner_id == user.id:
        return

    # Shared group rules
    if berth.group_id is not None:
        group = db.query(DockyardGroup).filter(DockyardGroup.id == berth.group_id).first()
        if group and group.owner_id == user.id:
            return

        membership = get_group_membership(db, berth.group_id, user.id)
        if membership:
            if action == "read":
                return
            if action == "update" and membership.can_update:
                return
            if action == "assign" and membership.can_assign:
                return
            # Group members cannot delete another owner's berth
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"You do not have '{action}' permission for this shared berth.",
            )

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="You do not have permission to access this berth.",
    )


def ensure_admin_target_safety(admin_user: User, target_user: User, action: str) -> None:
    """
    Admin safety rules:
    - An admin cannot change their own role.
    - An admin cannot ban themselves or another admin.
    """
    if action == "change_role" and admin_user.id == target_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admins cannot change their own role.",
        )

    if action == "ban":
        if admin_user.id == target_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admins cannot ban themselves.",
            )
        if target_user.role == ROLE_ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admins cannot ban another admin.",
            )