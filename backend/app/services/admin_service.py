import csv
import io
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional
from uuid import UUID

from fastapi import HTTPException, Request, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.models import AuditLog, Berth, DockyardGroup, GroupMember, User, UserSession
from app.rbac import VALID_ROLES, ensure_admin_target_safety
from app.schemas import (
    AdminOverviewStats,
    AdminSecuritySummary,
    AdminUserDetailResponse,
    AuditLogResponse,
    BerthResponse,
    GroupResponse,
    PaginatedUsersResponse,
    SecurityFailedLoginItem,
    SessionResponse,
    UserResponse,
)
from app.services.audit_service import log_audit_event
from app.services.berth_service import serialize_berth
from app.services.group_service import serialize_group


def get_overview_stats(db: Session) -> AdminOverviewStats:
    cutoff = datetime.now(timezone.utc) - timedelta(days=7)
    return AdminOverviewStats(
        total_users=db.query(func.count(User.id)).scalar() or 0,
        banned_users=db.query(func.count(User.id)).filter(User.is_banned.is_(True)).scalar() or 0,
        total_berths=db.query(func.count(Berth.id)).scalar() or 0,
        total_groups=db.query(func.count(DockyardGroup.id)).scalar() or 0,
        new_users_7d=db.query(func.count(User.id)).filter(User.created_at >= cutoff).scalar() or 0,
        new_berths_7d=db.query(func.count(Berth.id)).filter(Berth.created_at >= cutoff).scalar() or 0,
        new_groups_7d=db.query(func.count(DockyardGroup.id)).filter(DockyardGroup.created_at >= cutoff).scalar() or 0,
        failed_logins_7d=(
            db.query(func.count(AuditLog.id))
            .filter(AuditLog.action == "LOGIN_FAILED", AuditLog.created_at >= cutoff)
            .scalar()
            or 0
        ),
    )


def _filtered_users_query(
    db: Session,
    search: Optional[str] = None,
    role: Optional[str] = None,
    status_filter: Optional[str] = None,
):
    query = db.query(User)
    if search:
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                User.username.ilike(term),
                User.email.ilike(term),
                User.full_name.ilike(term),
            )
        )
    if role in VALID_ROLES:
        query = query.filter(User.role == role)
    if status_filter == "banned":
        query = query.filter(User.is_banned.is_(True))
    elif status_filter == "active":
        query = query.filter(User.is_banned.is_(False))
    return query


def list_users_admin(
    db: Session,
    search: Optional[str] = None,
    role: Optional[str] = None,
    status_filter: Optional[str] = None,
    page: int = 1,
    page_size: int = 10,
) -> PaginatedUsersResponse:
    safe_page = max(1, page)
    safe_size = max(1, min(100, page_size))

    query = _filtered_users_query(db, search=search, role=role, status_filter=status_filter)
    total = query.count()
    users = (
        query.order_by(User.created_at.desc())
        .offset((safe_page - 1) * safe_size)
        .limit(safe_size)
        .all()
    )
    return PaginatedUsersResponse(
        items=[UserResponse.model_validate(u) for u in users],
        total=total,
        page=safe_page,
        page_size=safe_size,
    )


def get_user_detail_admin(db: Session, user_id: UUID) -> AdminUserDetailResponse:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    berths = (
        db.query(Berth)
        .filter(Berth.owner_id == user.id)
        .order_by(Berth.created_at.desc())
        .all()
    )

    member_group_ids = [
        m.group_id
        for m in db.query(GroupMember.group_id).filter(GroupMember.user_id == user.id).all()
    ]
    if member_group_ids:
        groups = (
            db.query(DockyardGroup)
            .filter(or_(DockyardGroup.owner_id == user.id, DockyardGroup.id.in_(member_group_ids)))
            .order_by(DockyardGroup.created_at.desc())
            .all()
        )
    else:
        groups = (
            db.query(DockyardGroup)
            .filter(DockyardGroup.owner_id == user.id)
            .order_by(DockyardGroup.created_at.desc())
            .all()
        )

    sessions = (
        db.query(UserSession)
        .filter(UserSession.user_id == user.id)
        .order_by(UserSession.created_at.desc())
        .all()
    )

    recent_activity = (
        db.query(AuditLog)
        .filter(or_(AuditLog.user_id == user.id, AuditLog.username == user.username))
        .order_by(AuditLog.created_at.desc())
        .limit(50)
        .all()
    )

    return AdminUserDetailResponse(
        user=UserResponse.model_validate(user),
        berths=[serialize_berth(b) for b in berths],
        groups=[serialize_group(g, user) for g in groups],
        sessions=[SessionResponse.model_validate(s) for s in sessions],
        recent_activity=[AuditLogResponse.model_validate(a) for a in recent_activity],
    )


def ban_user_admin(
    db: Session,
    admin_user: User,
    target_user_id: UUID,
    reason: str,
    request: Request,
) -> UserResponse:
    target = db.query(User).filter(User.id == target_user_id).first()
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    ensure_admin_target_safety(admin_user, target, "ban")

    target.is_banned = True
    target.ban_reason = reason.strip()
    db.query(UserSession).filter(UserSession.user_id == target.id).update({"is_revoked": True})
    db.commit()
    db.refresh(target)

    log_audit_event(
        db,
        action="USER_BANNED",
        request=request,
        user=admin_user,
        target_type="user",
        target_id=str(target.id),
        details=f"Banned user '{target.username}'. Reason: {target.ban_reason}",
    )
    return UserResponse.model_validate(target)


def unban_user_admin(
    db: Session, admin_user: User, target_user_id: UUID, request: Request
) -> UserResponse:
    target = db.query(User).filter(User.id == target_user_id).first()
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    target.is_banned = False
    target.ban_reason = None
    target.failed_login_attempts = 0
    target.locked_until = None
    db.commit()
    db.refresh(target)

    log_audit_event(
        db,
        action="USER_UNBANNED",
        request=request,
        user=admin_user,
        target_type="user",
        target_id=str(target.id),
        details=f"Unbanned user '{target.username}'.",
    )
    return UserResponse.model_validate(target)


def bulk_ban_users_admin(
    db: Session,
    admin_user: User,
    user_ids: List[UUID],
    reason: Optional[str],
    request: Request,
) -> Dict[str, int]:
    clean_reason = (reason or "Bulk administrative ban").strip()
    targets = db.query(User).filter(User.id.in_(user_ids)).all()
    banned_count = 0
    skipped_count = 0

    for target in targets:
        if target.id == admin_user.id or target.role == "admin":
            skipped_count += 1
            continue
        target.is_banned = True
        target.ban_reason = clean_reason
        db.query(UserSession).filter(UserSession.user_id == target.id).update({"is_revoked": True})
        banned_count += 1

    db.commit()
    log_audit_event(
        db,
        action="USERS_BULK_BANNED",
        request=request,
        user=admin_user,
        target_type="user",
        details=f"Bulk banned {banned_count} users (skipped {skipped_count}). Reason: {clean_reason}",
    )
    return {"updated": banned_count, "skipped": skipped_count}


def bulk_unban_users_admin(
    db: Session, admin_user: User, user_ids: List[UUID], request: Request
) -> Dict[str, int]:
    targets = db.query(User).filter(User.id.in_(user_ids)).all()
    unbanned_count = 0
    for target in targets:
        target.is_banned = False
        target.ban_reason = None
        target.failed_login_attempts = 0
        target.locked_until = None
        unbanned_count += 1

    db.commit()
    log_audit_event(
        db,
        action="USERS_BULK_UNBANNED",
        request=request,
        user=admin_user,
        target_type="user",
        details=f"Bulk unbanned {unbanned_count} users.",
    )
    return {"updated": unbanned_count}


def change_user_role_admin(
    db: Session,
    admin_user: User,
    target_user_id: UUID,
    new_role: str,
    request: Request,
) -> UserResponse:
    target = db.query(User).filter(User.id == target_user_id).first()
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    ensure_admin_target_safety(admin_user, target, "change_role")

    old_role = target.role
    target.role = new_role
    db.commit()
    db.refresh(target)

    log_audit_event(
        db,
        action="ROLE_CHANGED",
        request=request,
        user=admin_user,
        target_type="user",
        target_id=str(target.id),
        details=f"Changed role for '{target.username}' from '{old_role}' to '{new_role}'.",
    )
    return UserResponse.model_validate(target)


def revoke_user_sessions_admin(
    db: Session, admin_user: User, target_user_id: UUID, request: Request
) -> Dict[str, int]:
    target = db.query(User).filter(User.id == target_user_id).first()
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    revoked_count = (
        db.query(UserSession)
        .filter(UserSession.user_id == target.id, UserSession.is_revoked.is_(False))
        .update({"is_revoked": True})
    )
    db.commit()

    log_audit_event(
        db,
        action="ADMIN_SESSIONS_REVOKED",
        request=request,
        user=admin_user,
        target_type="user",
        target_id=str(target.id),
        details=f"Revoked {revoked_count} active sessions for '{target.username}'.",
    )
    return {"revoked": revoked_count}


def _filtered_berths_admin_query(
    db: Session,
    search: Optional[str] = None,
    status_filter: Optional[str] = None,
    owner_username: Optional[str] = None,
):
    query = db.query(Berth)
    if search:
        query = query.filter(Berth.berth_number.ilike(f"%{search.strip()}%"))
    if status_filter:
        query = query.filter(Berth.status == status_filter)
    if owner_username:
        query = query.join(User, Berth.owner_id == User.id).filter(
            User.username.ilike(f"%{owner_username.strip()}%")
        )
    return query


def list_berths_admin(
    db: Session,
    search: Optional[str] = None,
    status_filter: Optional[str] = None,
    owner_username: Optional[str] = None,
) -> List[BerthResponse]:
    berths = (
        _filtered_berths_admin_query(
            db, search=search, status_filter=status_filter, owner_username=owner_username
        )
        .order_by(Berth.created_at.desc())
        .all()
    )
    return [serialize_berth(b) for b in berths]


def delete_berths_admin(
    db: Session, admin_user: User, berth_ids: List[UUID], request: Request
) -> Dict[str, int]:
    berths = db.query(Berth).filter(Berth.id.in_(berth_ids)).all()
    deleted_numbers = [b.berth_number for b in berths]
    for b in berths:
        db.delete(b)
    db.commit()

    log_audit_event(
        db,
        action="ADMIN_BERTH_DELETED",
        request=request,
        user=admin_user,
        target_type="berth",
        details=f"Admin deleted {len(deleted_numbers)} berth(s): {', '.join(deleted_numbers)}",
    )
    return {"deleted": len(deleted_numbers)}


def list_groups_admin(
    db: Session,
    search: Optional[str] = None,
    owner_username: Optional[str] = None,
) -> List[GroupResponse]:
    query = db.query(DockyardGroup)
    if search:
        query = query.filter(DockyardGroup.name.ilike(f"%{search.strip()}%"))
    if owner_username:
        query = query.join(User, DockyardGroup.owner_id == User.id).filter(
            User.username.ilike(f"%{owner_username.strip()}%")
        )
    groups = query.order_by(DockyardGroup.created_at.desc()).all()
    return [serialize_group(g) for g in groups]


def delete_groups_admin(
    db: Session, admin_user: User, group_ids: List[UUID], request: Request
) -> Dict[str, int]:
    groups = db.query(DockyardGroup).filter(DockyardGroup.id.in_(group_ids)).all()
    deleted_names = [g.name for g in groups]
    for g in groups:
        db.delete(g)
    db.commit()

    log_audit_event(
        db,
        action="ADMIN_GROUP_DELETED",
        request=request,
        user=admin_user,
        target_type="group",
        details=f"Admin deleted {len(deleted_names)} group(s): {', '.join(deleted_names)}",
    )
    return {"deleted": len(deleted_names)}


def _filtered_audit_query(
    db: Session,
    search: Optional[str] = None,
    action: Optional[str] = None,
    username: Optional[str] = None,
    ip_address: Optional[str] = None,
):
    query = db.query(AuditLog)
    if action:
        query = query.filter(AuditLog.action == action)
    if username:
        query = query.filter(AuditLog.username.ilike(f"%{username.strip()}%"))
    if ip_address:
        query = query.filter(AuditLog.ip_address.ilike(f"%{ip_address.strip()}%"))
    if search:
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                AuditLog.username.ilike(term),
                AuditLog.action.ilike(term),
                AuditLog.details.ilike(term),
                AuditLog.ip_address.ilike(term),
            )
        )
    return query


def list_audit_logs_admin(
    db: Session,
    search: Optional[str] = None,
    action: Optional[str] = None,
    username: Optional[str] = None,
    ip_address: Optional[str] = None,
    limit: int = 200,
) -> List[AuditLogResponse]:
    safe_limit = max(1, min(500, limit))
    logs = (
        _filtered_audit_query(
            db, search=search, action=action, username=username, ip_address=ip_address
        )
        .order_by(AuditLog.created_at.desc())
        .limit(safe_limit)
        .all()
    )
    return [AuditLogResponse.model_validate(a) for a in logs]


def get_security_summary_admin(db: Session) -> AdminSecuritySummary:
    ip_rows = (
        db.query(
            AuditLog.ip_address,
            func.count(AuditLog.id).label("cnt"),
            func.max(AuditLog.created_at).label("last_seen"),
        )
        .filter(AuditLog.action == "LOGIN_FAILED")
        .group_by(AuditLog.ip_address)
        .order_by(func.count(AuditLog.id).desc())
        .limit(20)
        .all()
    )

    acct_rows = (
        db.query(
            AuditLog.username,
            func.count(AuditLog.id).label("cnt"),
            func.max(AuditLog.created_at).label("last_seen"),
        )
        .filter(AuditLog.action == "LOGIN_FAILED")
        .group_by(AuditLog.username)
        .order_by(func.count(AuditLog.id).desc())
        .limit(20)
        .all()
    )

    recent_failed = (
        db.query(AuditLog)
        .filter(AuditLog.action == "LOGIN_FAILED")
        .order_by(AuditLog.created_at.desc())
        .limit(30)
        .all()
    )

    return AdminSecuritySummary(
        failed_by_ip=[
            SecurityFailedLoginItem(
                key=row.ip_address or "unknown", count=row.cnt, last_attempt=row.last_seen
            )
            for row in ip_rows
        ],
        failed_by_account=[
            SecurityFailedLoginItem(
                key=row.username or "unknown", count=row.cnt, last_attempt=row.last_seen
            )
            for row in acct_rows
        ],
        recent_failed_logs=[AuditLogResponse.model_validate(a) for a in recent_failed],
    )


def export_users_csv(
    db: Session,
    admin_user: User,
    request: Request,
    search: Optional[str] = None,
    role: Optional[str] = None,
    status_filter: Optional[str] = None,
) -> str:
    users = (
        _filtered_users_query(db, search=search, role=role, status_filter=status_filter)
        .order_by(User.created_at.desc())
        .all()
    )
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["id", "username", "email", "full_name", "role", "is_banned", "ban_reason", "created_at"])
    for u in users:
        writer.writerow([u.id, u.username, u.email, u.full_name, u.role, u.is_banned, u.ban_reason or "", u.created_at])

    log_audit_event(
        db,
        action="EXPORT_USERS_CSV",
        request=request,
        user=admin_user,
        target_type="export",
        details=f"Exported {len(users)} users to CSV (role={role}, status={status_filter}, search={search}).",
    )
    return buf.getvalue()


def export_berths_csv(
    db: Session,
    admin_user: User,
    request: Request,
    search: Optional[str] = None,
    status_filter: Optional[str] = None,
    owner_username: Optional[str] = None,
) -> str:
    berths = (
        _filtered_berths_admin_query(
            db, search=search, status_filter=status_filter, owner_username=owner_username
        )
        .order_by(Berth.created_at.desc())
        .all()
    )
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(
        [
            "id",
            "berth_number",
            "max_length_meters",
            "max_draft_meters",
            "status",
            "owner_username",
            "group_name",
            "assigned_to_username",
            "created_at",
        ]
    )
    for b in berths:
        writer.writerow(
            [
                b.id,
                b.berth_number,
                float(b.max_length_meters),
                float(b.max_draft_meters),
                b.status,
                b.owner.username if b.owner else "",
                b.group.name if b.group else "",
                b.assigned_to.username if b.assigned_to else "",
                b.created_at,
            ]
        )

    log_audit_event(
        db,
        action="EXPORT_BERTHS_CSV",
        request=request,
        user=admin_user,
        target_type="export",
        details=f"Exported {len(berths)} berths to CSV (status={status_filter}, owner={owner_username}, search={search}).",
    )
    return buf.getvalue()


def export_audit_logs_csv(
    db: Session,
    admin_user: User,
    request: Request,
    search: Optional[str] = None,
    action: Optional[str] = None,
    username: Optional[str] = None,
    ip_address: Optional[str] = None,
) -> str:
    logs = (
        _filtered_audit_query(
            db, search=search, action=action, username=username, ip_address=ip_address
        )
        .order_by(AuditLog.created_at.desc())
        .limit(1000)
        .all()
    )
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["id", "created_at", "username", "action", "target_type", "target_id", "ip_address", "user_agent", "details"])
    for a in logs:
        writer.writerow(
            [
                a.id,
                a.created_at,
                a.username or "",
                a.action,
                a.target_type or "",
                a.target_id or "",
                a.ip_address or "",
                a.user_agent or "",
                a.details or "",
            ]
        )

    log_audit_event(
        db,
        action="EXPORT_AUDIT_CSV",
        request=request,
        user=admin_user,
        target_type="export",
        details=f"Exported {len(logs)} audit log entries to CSV (action={action}, username={username}, ip={ip_address}).",
    )
    return buf.getvalue()