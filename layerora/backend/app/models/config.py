from sqlalchemy import Column, String, Integer, Boolean
from .base import BaseModel

class Config(BaseModel):
    __tablename__ = "configs"

    key = Column(String(100), unique=True, nullable=False)
    value = Column(String(500), nullable=False)
    description = Column(String(200), nullable=True)
    is_public = Column(Boolean, default=False)  # if client can read