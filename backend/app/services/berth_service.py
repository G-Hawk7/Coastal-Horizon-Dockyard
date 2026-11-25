from typing import List, Optional
from uuid import UUID

from fastapi import HTTPException, Request, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.models import Berth, DockyardGroup, GroupMember, User
from app.rbac import (
    ROLE_ADMIN,
    ensure_berth_access,
    ensure_group_create_berth_access,
    get_group_membership,
)
from app.schemas import BerthAssignRequest, BerthCreate, BerthResponse, BerthUpdate
from app.services.audit_service import log_audit_event


def serialize_berth(berth: Berth) -> BerthResponse:
    return BerthResponse(
        id=berth.id,
        berth_number=berth.berth_number,
        max_length_meters=float(berth.max_length_meters),
        max_draft_meters=float(berth.max_draft_meters),
        status=berth.status,
        owner_id=berth.owner_id,
        owner_username=berth.owner.username if berth.owner else None,
        group_id=berth.group_id,
        group_name=berth.group.name if berth.group else None,
        assigned_to_id=berth.assigned_to_id,
        assigned_to_username=berth.assigned_to.username if berth.assigned_to else None,
        created_at=berth.created_at,
        updated_at=berth.updated_at,
    )


def _accessible_group_ids(db: Session, user_id: UUID) -> set[UUID]:
    owned = [g.id for g in db.query(DockyardGroup.id).filter(DockyardGroup.owner_id == user_id).all()]
    member = [m.group_id for m in db.query(GroupMember.group_id).filter(GroupMember.user_id == user_id).all()]
    return set(owned + member)


def list_berths(
    db: Session,
    current_user: User,
    group_id: Optional[UUID] = None,
    status_filter: Optional[str] = None,
    search: Optional[str] = None,
) -> List[BerthResponse]:
    query = db.query(Berth)

    if current_user.role != ROLE_ADMIN:
        allowed_groups = _accessible_group_ids(db, current_user.id)
        if group_id is not None:
            if group_id not in allowed_groups:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You do not have access to this group.",
                )
            query = query.filter(Berth.group_id == group_id)
        elif allowed_groups:
            query = query.filter(
                or_(Berth.owner_id == current_user.id, Berth.group_id.in_(list(allowed_groups)))
            )
        else:
            query = query.filter(Berth.owner_id == current_user.id)
    elif group_id is not None:
        query = query.filter(Berth.group_id == group_id)

    if status_filter:
        query = query.filter(Berth.status == status_filter)
    if search:
        query = query.filter(Berth.berth_number.ilike(f"%{search.strip()}%"))

    berths = query.order_by(Berth.created_at.desc()).all()
    return [serialize_berth(b) for b in berths]


def get_berth(db: Session, current_user: User, berth_id: UUID) -> BerthResponse:
    berth = db.query(Berth).filter(Berth.id == berth_id).first()
    if not berth:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Berth not found.")
    ensure_berth_access(db, current_user, berth, "read")
    return serialize_berth(berth)


def create_berth(
    db: Session, current_user: User, payload: BerthCreate, request: Request
) -> BerthResponse:
    clean_number = payload.berth_number.strip()
    existing = (
        db.query(Berth)
        .filter(func.lower(Berth.berth_number) == clean_number.lower())
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Berth '{clean_number}' already exists.",
        )

    group = None
    if payload.group_id is not None:
        group = db.query(DockyardGroup).filter(DockyardGroup.id == payload.group_id).first()
        if not group:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found.")
        ensure_group_create_berth_access(db, current_user, group)

    if payload.assigned_to_id is not None:
        assignee = db.query(User).filter(User.id == payload.assigned_to_id).first()
        if not assignee:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Assigned user not found."
            )
        if group and current_user.role != ROLE_ADMIN and group.owner_id != current_user.id:
            membership = get_group_membership(db, group.id, current_user.id)
            if not membership or not membership.can_assign:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You do not have 'assign' permission in this group.",
                )

    berth = Berth(
        berth_number=clean_number,
        max_length_meters=payload.max_length_meters,
        max_draft_meters=payload.max_draft_meters,
        status=payload.status,
        owner_id=current_user.id,
        group_id=payload.group_id,
        assigned_to_id=payload.assigned_to_id,
    )
    db.add(berth)
    db.commit()
    db.refresh(berth)

    log_audit_event(
        db,
        action="BERTH_CREATED",
        request=request,
        user=current_user,
        target_type="berth",
        target_id=str(berth.id),
        details=f"Created berth {berth.berth_number}.",
    )
    return serialize_berth(berth)


def update_berth(
    db: Session,
    current_user: User,
    berth_id: UUID,
    payload: BerthUpdate,
    request: Request,
) -> BerthResponse:
    berth = db.query(Berth).filter(Berth.id == berth_id).first()
    if not berth:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Berth not found.")

    ensure_berth_access(db, current_user, berth, "update")

    if payload.berth_number is not None:
        clean_number = payload.berth_number.strip()
        conflict = (
            db.query(Berth)
            .filter(func.lower(Berth.berth_number) == clean_number.lower(), Berth.id != berth.id)
            .first()
        )
        if conflict:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Berth '{clean_number}' already exists.",
            )
        berth.berth_number = clean_number

    if payload.max_length_meters is not None:
        berth.max_length_meters = payload.max_length_meters
    if payload.max_draft_meters is not None:
        berth.max_draft_meters = payload.max_draft_meters
    if payload.status is not None:
        berth.status = payload.status

    db.commit()
    db.refresh(berth)

    log_audit_event(
        db,
        action="BERTH_UPDATED",
        request=request,
        user=current_user,
        target_type="berth",
        target_id=str(berth.id),
        details=f"Updated berth {berth.berth_number} (status: {berth.status}).",
    )
    return serialize_berth(berth)


def assign_berth(
    db: Session,
    current_user: User,
    berth_id: UUID,
    payload: BerthAssignRequest,
    request: Request,
) -> BerthResponse:
    berth = db.query(Berth).filter(Berth.id == berth_id).first()
    if not berth:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Berth not found.")

    ensure_berth_access(db, current_user, berth, "assign")

    assignee_label = "unassigned"
    if payload.assigned_to_id is not None:
        assignee = db.query(User).filter(User.id == payload.assigned_to_id).first()
        if not assignee:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Assigned user not found."
            )
        if berth.group_id is not None and current_user.role != ROLE_ADMIN:
            group = db.query(DockyardGroup).filter(DockyardGroup.id == berth.group_id).first()
            is_member = get_group_membership(db, berth.group_id, assignee.id) is not None
            if group and assignee.id != group.owner_id and not is_member:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Assigned user must be a member or owner of the berth's group.",
                )
        assignee_label = assignee.username

    berth.assigned_to_id = payload.assigned_to_id
    db.commit()
    db.refresh(berth)

    log_audit_event(
        db,
        action="BERTH_ASSIGNED",
        request=request,
        user=current_user,
        target_type="berth",
        target_id=str(berth.id),
        details=f"Assigned berth {berth.berth_number} to {assignee_label}.",
    )
    return serialize_berth(berth)


def delete_berth(
    db: Session, current_user: User, berth_id: UUID, request: Request
) -> None:
    berth = db.query(Berth).filter(Berth.id == berth_id).first()
    if not berth:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Berth not found.")

    ensure_berth_access(db, current_user, berth, "delete")

    berth_number = berth.berth_number
    db.delete(berth)
    db.commit()

    log_audit_event(
        db,
        action="BERTH_DELETED",
        request=request,
        user=current_user,
        target_type="berth",
        target_id=str(berth_id),
        details=f"Deleted berth {berth_number}.",
    )