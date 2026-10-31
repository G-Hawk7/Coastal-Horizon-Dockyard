import uuid
from sqlalchemy import Column, String, Numeric, DateTime, text
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base

class Berth(Base):
    __tablename__ = "berths"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    berth_number = Column(String(50), unique=True, nullable=False, index=True)
    max_length_meters = Column(Numeric(6, 2), nullable=False)
    max_draft_meters = Column(Numeric(5, 2), nullable=False)
    status = Column(String(30), default="AVAILABLE", nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=text("NOW()"))
    updated_at = Column(DateTime(timezone=True), server_default=text("NOW()"), onupdate=text("NOW()"))