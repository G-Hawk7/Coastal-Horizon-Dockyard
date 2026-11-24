from typing import List, Optional
from uuid import UUID

from fastapi import HTTPException, Request, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.models import DockyardGroup, GroupMember, User
from app.rbac import ROLE_ADMIN, ensure_group_owner, get_group_membership
from app.schemas import (
    GroupCreateRequest,
    GroupMemberAddRequest,
    GroupMemberResponse,
    GroupMemberUpdateRequest,
    GroupResponse,
    GroupUpdateRequest,
)
from app.services.audit_service import log_audit_event


def serialize_group(
    group: DockyardGroup, current_user: Optional[User] = None
) -> GroupResponse:
    members_out: List[GroupMemberResponse] = []
    for m in group.members:
        if not m.user:
            continue
        members_out.append(
            GroupMemberResponse(
                id=m.id,
                user_id=m.user_id,
                username=m.user.username,
                full_name=m.user.full_name,
                email=m.user.email,
                can_create=m.can_create,
                can_update=m.can_update,
                can_assign=m.can_assign,
                created_at=m.created_at,
            )
        )

    my_permissions = {
        "is_owner": False,
        "can_create": False,
        "can_update": False,
        "can_assign": False,
        "can_manage_members": False,
        "can_delete_group": False,
    }
    if current_user is not None:
        if group.owner_id == current_user.id:
            my_permissions = {
                "is_owner": True,
                "can_create": True,
                "can_update": True,
                "can_assign": True,
                "can_manage_members": True,
                "can_delete_group": True,
            }
        else:
            matched = next((m for m in group.members if m.user_id == current_user.id), None)
            if matched:
                my_permissions = {
                    "is_owner": False,
                    "can_create": matched.can_create,
                    "can_update": matched.can_update,
                    "can_assign": matched.can_assign,
                    "can_manage_members": False,
                    "can_delete_group": False,
                }
            elif current_user.role == ROLE_ADMIN:
                my_permissions = {
                    "is_owner": False,
                    "can_create": True,
                    "can_update": True,
                    "can_assign": True,
                    "can_manage_members": False,
                    "can_delete_group": False,
                }

    return GroupResponse(
        id=group.id,
        name=group.name,
        description=group.description,
        owner_id=group.owner_id,
        owner_username=group.owner.username if group.owner else "unknown",
        member_count=len(members_out),
        members=members_out,
        my_permissions=my_permissions,
        created_at=group.created_at,
        updated_at=group.updated_at,
    )


def list_groups(db: Session, current_user: User) -> List[GroupResponse]:
    if current_user.role == ROLE_ADMIN:
        groups = db.query(DockyardGroup).order_by(DockyardGroup.created_at.desc()).all()
    else:
        member_group_ids = [
            m.group_id
            for m in db.query(GroupMember.group_id)
            .filter(GroupMember.user_id == current_user.id)
            .all()
        ]
        if member_group_ids:
            groups = (
                db.query(DockyardGroup)
                .filter(
                    or_(
                        DockyardGroup.owner_id == current_user.id,
                        DockyardGroup.id.in_(member_group_ids),
                    )
                )
                .order_by(DockyardGroup.created_at.desc())
                .all()
            )
        else:
            groups = (
                db.query(DockyardGroup)
                .filter(DockyardGroup.owner_id == current_user.id)
                .order_by(DockyardGroup.created_at.desc())
                .all()
            )
    return [serialize_group(g, current_user) for g in groups]


def get_group(db: Session, current_user: User, group_id: UUID) -> GroupResponse:
    group = db.query(DockyardGroup).filter(DockyardGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found.")

    if current_user.role != ROLE_ADMIN and group.owner_id != current_user.id:
        membership = get_group_membership(db, group.id, current_user.id)
        if not membership:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to view this group.",
            )

    return serialize_group(group, current_user)


def create_group(
    db: Session, current_user: User, payload: GroupCreateRequest, request: Request
) -> GroupResponse:
    group = DockyardGroup(
        name=payload.name.strip(),
        description=payload.description.strip() if payload.description else None,
        owner_id=current_user.id,
    )
    db.add(group)
    db.commit()
    db.refresh(group)

    log_audit_event(
        db,
        action="GROUP_CREATED",
        request=request,
        user=current_user,
        target_type="group",
        target_id=str(group.id),
        details=f"Created dockyard group '{group.name}'.",
    )
    return serialize_group(group, current_user)


def update_group(
    db: Session,
    current_user: User,
    group_id: UUID,
    payload: GroupUpdateRequest,
    request: Request,
) -> GroupResponse:
    group = db.query(DockyardGroup).filter(DockyardGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found.")

    ensure_group_owner(current_user, group)

    if payload.name is not None:
        group.name = payload.name.strip()
    if payload.description is not None:
        group.description = payload.description.strip()

    db.commit()
    db.refresh(group)

    log_audit_event(
        db,
        action="GROUP_UPDATED",
        request=request,
        user=current_user,
        target_type="group",
        target_id=str(group.id),
        details=f"Updated dockyard group '{group.name}'.",
    )
    return serialize_group(group, current_user)


def delete_group(
    db: Session, current_user: User, group_id: UUID, request: Request
) -> None:
    group = db.query(DockyardGroup).filter(DockyardGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found.")

    ensure_group_owner(current_user, group)

    group_name = group.name
    db.delete(group)
    db.commit()

    log_audit_event(
        db,
        action="GROUP_DELETED",
        request=request,
        user=current_user,
        target_type="group",
        target_id=str(group_id),
        details=f"Deleted dockyard group '{group_name}'.",
    )


def add_group_member(
    db: Session,
    current_user: User,
    group_id: UUID,
    payload: GroupMemberAddRequest,
    request: Request,
) -> GroupResponse:
    group = db.query(DockyardGroup).filter(DockyardGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found.")

    ensure_group_owner(current_user, group)

    identifier = payload.username.strip()
    target_user = (
        db.query(User)
        .filter(
            or_(
                func.lower(User.username) == identifier.lower(),
                func.lower(User.email) == identifier.lower(),
            )
        )
        .first()
    )
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User '{identifier}' not found.",
        )

    if target_user.id == group.owner_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The group owner already has full permissions.",
        )

    existing = get_group_membership(db, group.id, target_user.id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"User '{target_user.username}' is already a member of this group.",
        )

    member = GroupMember(
        group_id=group.id,
        user_id=target_user.id,
        can_create=payload.can_create,
        can_update=payload.can_update,
        can_assign=payload.can_assign,
    )
    db.add(member)
    db.commit()
    db.refresh(group)

    log_audit_event(
        db,
        action="GROUP_MEMBER_ADDED",
        request=request,
        user=current_user,
        target_type="group",
        target_id=str(group.id),
        details=(
            f"Added '{target_user.username}' to '{group.name}' "
            f"(create={payload.can_create}, update={payload.can_update}, assign={payload.can_assign})."
        ),
    )
    return serialize_group(group, current_user)


def update_group_member(
    db: Session,
    current_user: User,
    group_id: UUID,
    member_user_id: UUID,
    payload: GroupMemberUpdateRequest,
    request: Request,
) -> GroupResponse:
    group = db.query(DockyardGroup).filter(DockyardGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found.")

    ensure_group_owner(current_user, group)

    member = get_group_membership(db, group.id, member_user_id)
    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group member not found.",
        )

    if payload.can_create is not None:
        member.can_create = payload.can_create
    if payload.can_update is not None:
        member.can_update = payload.can_update
    if payload.can_assign is not None:
        member.can_assign = payload.can_assign

    db.commit()
    db.refresh(group)

    log_audit_event(
        db,
        action="GROUP_MEMBER_UPDATED",
        request=request,
        user=current_user,
        target_type="group",
        target_id=str(group.id),
        details=(
            f"Updated permissions for member {member_user_id} in '{group.name}' "
            f"(create={member.can_create}, update={member.can_update}, assign={member.can_assign})."
        ),
    )
    return serialize_group(group, current_user)


def remove_group_member(
    db: Session,
    current_user: User,
    group_id: UUID,
    member_user_id: UUID,
    request: Request,
) -> GroupResponse:
    group = db.query(DockyardGroup).filter(DockyardGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found.")

    ensure_group_owner(current_user, group)

    member = get_group_membership(db, group.id, member_user_id)
    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group member not found.",
        )

    db.delete(member)
    db.commit()
    db.refresh(group)

    log_audit_event(
        db,
        action="GROUP_MEMBER_REMOVED",
        request=request,
        user=current_user,
        target_type="group",
        target_id=str(group.id),
        details=f"Removed member {member_user_id} from '{group.name}'.",
    )
    return serialize_group(group, current_user)