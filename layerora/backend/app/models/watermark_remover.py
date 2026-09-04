from enum import Enum as PyEnum
from sqlalchemy import Column, ForeignKey, String, Text, Enum, JSON
from sqlalchemy.orm import relationship
from .base import BaseModel

class WatermarkMode(str, PyEnum):
    TEXT = "text"
    CUSTOM = "custom"
    LOGO = "logo"

class WatermarkStatus(str, PyEnum):
    UPLOADED = "uploaded"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class WatermarkJob(BaseModel):
    __tablename__ = "watermark_jobs"

    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    original_key = Column(String(500), nullable=False)
    mask_key = Column(String(500), nullable=True)
    result_key = Column(String(500), nullable=True)
    mode = Column(Enum(WatermarkMode), nullable=True)
    text = Column(Text, nullable=True)
    selection = Column(JSON, nullable=True)
    status = Column(Enum(WatermarkStatus), default=WatermarkStatus.UPLOADED, nullable=False)

    user = relationship("User", back_populates="watermark_jobs")