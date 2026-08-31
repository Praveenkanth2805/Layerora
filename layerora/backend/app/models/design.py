from enum import Enum as PyEnum

from sqlalchemy import Column, String, Integer, ForeignKey, JSON, Enum
from sqlalchemy.orm import relationship

from .base import BaseModel


class DesignStatus(str, PyEnum):
    DRAFT = "draft"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class Design(BaseModel):
    __tablename__ = "designs"

    user_id = Column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    name = Column(
        String(200),
        default="Untitled",
    )

    canvas_width = Column(
        Integer,
        default=1024,
    )

    canvas_height = Column(
        Integer,
        default=1024,
    )

    editor_state = Column(
        JSON,
        nullable=True,
    )

    thumbnail_key = Column(
        String(500),
        nullable=True,
    )

    status = Column(
        Enum(DesignStatus),
        default=DesignStatus.DRAFT,
        nullable=False,
    )

    user = relationship(
        "User",
        back_populates="designs",
    )

    layers = relationship(
        "Layer",
        back_populates="design",
        cascade="all, delete",
    )