from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
from uuid import UUID
from datetime import datetime

class BerthBase(BaseModel):
    berth_number: str = Field(..., min_length=2, max_length=50, examples=["B-101"])
    max_length_meters: float = Field(..., gt=0, examples=[250.0])
    max_draft_meters: float = Field(..., gt=0, examples=[14.5])
    status: str = Field(default="AVAILABLE", examples=["AVAILABLE"])

class BerthCreate(BerthBase):
    pass

class BerthUpdate(BaseModel):
    berth_number: Optional[str] = Field(None, min_length=2, max_length=50)
    max_length_meters: Optional[float] = Field(None, gt=0)
    max_draft_meters: Optional[float] = Field(None, gt=0)
    status: Optional[str] = None

class BerthResponse(BerthBase):
    id: UUID
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)