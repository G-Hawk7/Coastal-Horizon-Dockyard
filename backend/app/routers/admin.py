from typing import Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request, Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.rbac import Permission, require_permissions
from app.schemas import (
    AdminBanRequest,
    AdminBulkBanRequest,
    AdminBulkDeleteRequest,
    AdminOverviewStats,
    AdminRoleUpdateRequest,
    AdminSecuritySummary,
    AdminUserDetailResponse,
    AuditLogResponse,
    BerthResponse,
    GroupResponse,
    PaginatedUsersResponse,
    UserResponse,
)
from app.services import admin_service

router = APIRouter(prefix="/api/v1/admin", tags=["Admin Dashboard"])


# ---------------- Overview & Security ----------------

@router.get("/stats", response_model=AdminOverviewStats)
def get_stats(
    _admin: User = Depends(require_permissions(Permission.ADMIN_STATS)),
    db: Session = Depends(get_db),
):
    return admin_service.get_overview_stats(db)


@router.get("/security", response_model=AdminSecuritySummary)
def get_security_summary(
    _admin: User = Depends(require_permissions(Permission.ADMIN_VIEW_AUDIT)),
    db: Session = Depends(get_db),
):
    return admin_service.get_security_summary_admin(db)


# ---------------- User Management ----------------

@router.get("/users", response_model=PaginatedUsersResponse)
def list_users(
    search: Optional[str] = Query(default=None),
    role: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
    _admin: User = Depends(require_permissions(Permission.ADMIN_MANAGE_USERS)),
    db: Session = Depends(get_db),
):
    return admin_service.list_users_admin(
        db, search=search, role=role, status_filter=status, page=page, page_size=page_size
    )


@router.post("/users/bulk-ban", response_model=Dict[str, int])
def bulk_ban_users(
    payload: AdminBulkBanRequest,
    request: Request,
    admin_user: User = Depends(require_permissions(Permission.ADMIN_MANAGE_USERS)),
    db: Session = Depends(get_db),
):
    return admin_service.bulk_ban_users_admin(
        db, admin_user, payload.user_ids, payload.reason, request
    )


@router.post("/users/bulk-unban", response_model=Dict[str, int])
def bulk_unban_users(
    payload: AdminBulkBanRequest,
    request: Request,
    admin_user: User = Depends(require_permissions(Permission.ADMIN_MANAGE_USERS)),
    db: Session = Depends(get_db),
):
    return admin_service.bulk_unban_users_admin(db, admin_user, payload.user_ids, request)


@router.get("/users/{user_id}", response_model=AdminUserDetailResponse)
def get_user_detail(
    user_id: UUID,
    _admin: User = Depends(require_permissions(Permission.ADMIN_MANAGE_USERS)),
    db: Session = Depends(get_db),
):
    return admin_service.get_user_detail_admin(db, user_id)


@router.post("/users/{user_id}/ban", response_model=UserResponse)
def ban_user(
    user_id: UUID,
    payload: AdminBanRequest,
    request: Request,
    admin_user: User = Depends(require_permissions(Permission.ADMIN_MANAGE_USERS)),
    db: Session = Depends(get_db),
):
    return admin_service.ban_user_admin(db, admin_user, user_id, payload.reason, request)


@router.post("/users/{user_id}/unban", response_model=UserResponse)
def unban_user(
    user_id: UUID,
    request: Request,
    admin_user: User = Depends(require_permissions(Permission.ADMIN_MANAGE_USERS)),
    db: Session = Depends(get_db),
):
    return admin_service.unban_user_admin(db, admin_user, user_id, request)


@router.patch("/users/{user_id}/role", response_model=UserResponse)
def change_user_role(
    user_id: UUID,
    payload: AdminRoleUpdateRequest,
    request: Request,
    admin_user: User = Depends(require_permissions(Permission.ADMIN_MANAGE_USERS)),
    db: Session = Depends(get_db),
):
    return admin_service.change_user_role_admin(db, admin_user, user_id, payload.role, request)


@router.post("/users/{user_id}/revoke-sessions", response_model=Dict[str, int])
def revoke_user_sessions(
    user_id: UUID,
    request: Request,
    admin_user: User = Depends(require_permissions(Permission.ADMIN_MANAGE_USERS)),
    db: Session = Depends(get_db),
):
    return admin_service.revoke_user_sessions_admin(db, admin_user, user_id, request)


# ---------------- Content Moderation ----------------

@router.get("/berths", response_model=List[BerthResponse])
def list_all_berths(
    search: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
    owner: Optional[str] = Query(default=None),
    _admin: User = Depends(require_permissions(Permission.ADMIN_MODERATE_CONTENT)),
    db: Session = Depends(get_db),
):
    return admin_service.list_berths_admin(
        db, search=search, status_filter=status, owner_username=owner
    )


@router.post("/berths/bulk-delete", response_model=Dict[str, int])
def bulk_delete_berths(
    payload: AdminBulkDeleteRequest,
    request: Request,
    admin_user: User = Depends(require_permissions(Permission.ADMIN_MODERATE_CONTENT)),
    db: Session = Depends(get_db),
):
    return admin_service.delete_berths_admin(db, admin_user, payload.ids, request)


@router.delete("/berths/{berth_id}", response_model=Dict[str, int])
def delete_single_berth(
    berth_id: UUID,
    request: Request,
    admin_user: User = Depends(require_permissions(Permission.ADMIN_MODERATE_CONTENT)),
    db: Session = Depends(get_db),
):
    return admin_service.delete_berths_admin(db, admin_user, [berth_id], request)


@router.get("/groups", response_model=List[GroupResponse])
def list_all_groups(
    search: Optional[str] = Query(default=None),
    owner: Optional[str] = Query(default=None),
    _admin: User = Depends(require_permissions(Permission.ADMIN_MODERATE_CONTENT)),
    db: Session = Depends(get_db),
):
    return admin_service.list_groups_admin(db, search=search, owner_username=owner)


@router.post("/groups/bulk-delete", response_model=Dict[str, int])
def bulk_delete_groups(
    payload: AdminBulkDeleteRequest,
    request: Request,
    admin_user: User = Depends(require_permissions(Permission.ADMIN_MODERATE_CONTENT)),
    db: Session = Depends(get_db),
):
    return admin_service.delete_groups_admin(db, admin_user, payload.ids, request)


@router.delete("/groups/{group_id}", response_model=Dict[str, int])
def delete_single_group(
    group_id: UUID,
    request: Request,
    admin_user: User = Depends(require_permissions(Permission.ADMIN_MODERATE_CONTENT)),
    db: Session = Depends(get_db),
):
    return admin_service.delete_groups_admin(db, admin_user, [group_id], request)


# ---------------- Audit Log ----------------

@router.get("/audit-logs", response_model=List[AuditLogResponse])
def list_audit_logs(
    search: Optional[str] = Query(default=None),
    action: Optional[str] = Query(default=None),
    username: Optional[str] = Query(default=None),
    ip_address: Optional[str] = Query(default=None),
    limit: int = Query(default=200, ge=1, le=500),
    _admin: User = Depends(require_permissions(Permission.ADMIN_VIEW_AUDIT)),
    db: Session = Depends(get_db),
):
    return admin_service.list_audit_logs_admin(
        db,
        search=search,
        action=action,
        username=username,
        ip_address=ip_address,
        limit=limit,
    )


# ---------------- Filtered CSV Exports ----------------

@router.get("/export/users")
def export_users(
    request: Request,
    search: Optional[str] = Query(default=None),
    role: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
    admin_user: User = Depends(require_permissions(Permission.ADMIN_EXPORT)),
    db: Session = Depends(get_db),
):
    csv_data = admin_service.export_users_csv(
        db, admin_user, request, search=search, role=role, status_filter=status
    )
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="users_export.csv"'},
    )


@router.get("/export/berths")
def export_berths(
    request: Request,
    search: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
    owner: Optional[str] = Query(default=None),
    admin_user: User = Depends(require_permissions(Permission.ADMIN_EXPORT)),
    db: Session = Depends(get_db),
):
    csv_data = admin_service.export_berths_csv(
        db, admin_user, request, search=search, status_filter=status, owner_username=owner
    )
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="berths_export.csv"'},
    )


@router.get("/export/audit-logs")
def export_audit_logs(
    request: Request,
    search: Optional[str] = Query(default=None),
    action: Optional[str] = Query(default=None),
    username: Optional[str] = Query(default=None),
    ip_address: Optional[str] = Query(default=None),
    admin_user: User = Depends(require_permissions(Permission.ADMIN_EXPORT)),
    db: Session = Depends(get_db),
):
    csv_data = admin_service.export_audit_logs_csv(
        db,
        admin_user,
        request,
        search=search,
        action=action,
        username=username,
        ip_address=ip_address,
    )
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="audit_logs_export.csv"'},
    )