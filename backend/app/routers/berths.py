from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.rbac import Permission, require_permissions
from app.schemas import (
    BerthAssignRequest,
    BerthCreate,
    BerthResponse,
    BerthUpdate,
    MessageResponse,
)
from app.services import berth_service

router = APIRouter(prefix="/api/v1/berths", tags=["Berths"])


@router.get("", response_model=List[BerthResponse])
def list_berths(
    group_id: Optional[UUID] = Query(default=None),
    status_filter: Optional[str] = Query(default=None, alias="status"),
    search: Optional[str] = Query(default=None),
    current_user: User = Depends(require_permissions(Permission.BERTH_READ)),
    db: Session = Depends(get_db),
):
    return berth_service.list_berths(
        db,
        current_user,
        group_id=group_id,
        status_filter=status_filter,
        search=search,
    )


@router.get("/{berth_id}", response_model=BerthResponse)
def get_berth(
    berth_id: UUID,
    current_user: User = Depends(require_permissions(Permission.BERTH_READ)),
    db: Session = Depends(get_db),
):
    return berth_service.get_berth(db, current_user, berth_id)


@router.post("", response_model=BerthResponse, status_code=status.HTTP_201_CREATED)
def create_berth(
    payload: BerthCreate,
    request: Request,
    current_user: User = Depends(require_permissions(Permission.BERTH_CREATE)),
    db: Session = Depends(get_db),
):
    return berth_service.create_berth(db, current_user, payload, request)


@router.put("/{berth_id}", response_model=BerthResponse)
@router.patch("/{berth_id}", response_model=BerthResponse)
def update_berth(
    berth_id: UUID,
    payload: BerthUpdate,
    request: Request,
    current_user: User = Depends(require_permissions(Permission.BERTH_UPDATE)),
    db: Session = Depends(get_db),
):
    return berth_service.update_berth(db, current_user, berth_id, payload, request)


@router.patch("/{berth_id}/assign", response_model=BerthResponse)
def assign_berth(
    berth_id: UUID,
    payload: BerthAssignRequest,
    request: Request,
    current_user: User = Depends(require_permissions(Permission.BERTH_ASSIGN)),
    db: Session = Depends(get_db),
):
    return berth_service.assign_berth(db, current_user, berth_id, payload, request)


@router.delete("/{berth_id}", response_model=MessageResponse)
def delete_berth(
    berth_id: UUID,
    request: Request,
    current_user: User = Depends(require_permissions(Permission.BERTH_DELETE)),
    db: Session = Depends(get_db),
):
    berth_service.delete_berth(db, current_user, berth_id, request)
    return MessageResponse(message="Berth deleted successfully.")