# backend/app/models/layer.py
from sqlalchemy import Column, String, Integer, ForeignKey, Float, JSON, Enum
from .base import BaseModel
from sqlalchemy.orm import relationship
class Layer(BaseModel):
    __tablename__ = "layers"

    design_id = Column(String(36), ForeignKey("designs.id", ondelete="CASCADE"), nullable=False)
    layer_type = Column(Enum("background", "person", "object", "logo", "text", "shape", "decoration"), nullable=False)
    name = Column(String(100))
    # Fabric.js object properties (position, size, rotation, etc.) stored as JSON
    properties = Column(JSON, nullable=False, default=dict)
    object_key = Column(String(500), nullable=True)  # reference to PNG in S3
    text_content = Column(String(5000), nullable=True)  # for text layers
    font_family = Column(String(100), nullable=True)
    font_size = Column(Integer, nullable=True)
    color = Column(String(20), nullable=True)

    design = relationship("Design", back_populates="layers")