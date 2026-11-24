from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.rbac import Permission, require_permissions
from app.schemas import (
    GroupCreateRequest,
    GroupMemberAddRequest,
    GroupMemberUpdateRequest,
    GroupResponse,
    GroupUpdateRequest,
    MessageResponse,
)
from app.services import group_service

router = APIRouter(prefix="/api/v1/groups", tags=["Dockyard Groups"])


@router.get("", response_model=List[GroupResponse])
def list_groups(
    current_user: User = Depends(require_permissions(Permission.GROUP_READ)),
    db: Session = Depends(get_db),
):
    return group_service.list_groups(db, current_user)


@router.get("/{group_id}", response_model=GroupResponse)
def get_group(
    group_id: UUID,
    current_user: User = Depends(require_permissions(Permission.GROUP_READ)),
    db: Session = Depends(get_db),
):
    return group_service.get_group(db, current_user, group_id)


@router.post("", response_model=GroupResponse, status_code=status.HTTP_201_CREATED)
def create_group(
    payload: GroupCreateRequest,
    request: Request,
    current_user: User = Depends(require_permissions(Permission.GROUP_CREATE)),
    db: Session = Depends(get_db),
):
    return group_service.create_group(db, current_user, payload, request)


@router.patch("/{group_id}", response_model=GroupResponse)
def update_group(
    group_id: UUID,
    payload: GroupUpdateRequest,
    request: Request,
    current_user: User = Depends(require_permissions(Permission.GROUP_MANAGE)),
    db: Session = Depends(get_db),
):
    return group_service.update_group(db, current_user, group_id, payload, request)


@router.delete("/{group_id}", response_model=MessageResponse)
def delete_group(
    group_id: UUID,
    request: Request,
    current_user: User = Depends(require_permissions(Permission.GROUP_MANAGE)),
    db: Session = Depends(get_db),
):
    group_service.delete_group(db, current_user, group_id, request)
    return MessageResponse(message="Group deleted successfully.")


@router.post("/{group_id}/members", response_model=GroupResponse, status_code=status.HTTP_201_CREATED)
def add_member(
    group_id: UUID,
    payload: GroupMemberAddRequest,
    request: Request,
    current_user: User = Depends(require_permissions(Permission.GROUP_MANAGE)),
    db: Session = Depends(get_db),
):
    return group_service.add_group_member(db, current_user, group_id, payload, request)


@router.patch("/{group_id}/members/{member_user_id}", response_model=GroupResponse)
def update_member(
    group_id: UUID,
    member_user_id: UUID,
    payload: GroupMemberUpdateRequest,
    request: Request,
    current_user: User = Depends(require_permissions(Permission.GROUP_MANAGE)),
    db: Session = Depends(get_db),
):
    return group_service.update_group_member(
        db, current_user, group_id, member_user_id, payload, request
    )


@router.delete("/{group_id}/members/{member_user_id}", response_model=GroupResponse)
def remove_member(
    group_id: UUID,
    member_user_id: UUID,
    request: Request,
    current_user: User = Depends(require_permissions(Permission.GROUP_MANAGE)),
    db: Session = Depends(get_db),
):
    return group_service.remove_group_member(db, current_user, group_id, member_user_id, request)