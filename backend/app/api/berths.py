from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.database import get_db
from app.models import Berth
from app.schemas import BerthCreate, BerthUpdate, BerthResponse

router = APIRouter(prefix="/api/v1/berths", tags=["Berths"])

# 1. READ LIST
@router.get("", response_model=List[BerthResponse], status_code=status.HTTP_200_OK)
def get_berths(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(Berth).offset(skip).limit(limit).all()

# 2. READ SINGLE
@router.get("/{berth_id}", response_model=BerthResponse, status_code=status.HTTP_200_OK)
def get_berth(berth_id: UUID, db: Session = Depends(get_db)):
    berth = db.query(Berth).filter(Berth.id == berth_id).first()
    if not berth:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Berth with ID '{berth_id}' not found"
        )
    return berth

# 3. CREATE
@router.post("", response_model=BerthResponse, status_code=status.HTTP_201_CREATED)
def create_berth(payload: BerthCreate, db: Session = Depends(get_db)):
    existing = db.query(Berth).filter(Berth.berth_number == payload.berth_number).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Berth number '{payload.berth_number}' already exists."
        )
    new_berth = Berth(**payload.model_dump())
    db.add(new_berth)
    db.commit()
    db.refresh(new_berth)
    return new_berth

# 4. UPDATE
@router.put("/{berth_id}", response_model=BerthResponse, status_code=status.HTTP_200_OK)
def update_berth(berth_id: UUID, payload: BerthUpdate, db: Session = Depends(get_db)):
    berth = db.query(Berth).filter(Berth.id == berth_id).first()
    if not berth:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Berth with ID '{berth_id}' not found"
        )
    
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(berth, field, value)

    db.commit()
    db.refresh(berth)
    return berth

# 5. DELETE
@router.delete("/{berth_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_berth(berth_id: UUID, db: Session = Depends(get_db)):
    berth = db.query(Berth).filter(Berth.id == berth_id).first()
    if not berth:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Berth with ID '{berth_id}' not found"
        )
    db.delete(berth)
    db.commit()
    return None