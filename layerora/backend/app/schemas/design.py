from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from enum import Enum

class DesignStatus(str, Enum):
    DRAFT = "draft"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class LayerType(str, Enum):
    BACKGROUND = "background"
    PERSON = "person"
    OBJECT = "object"
    LOGO = "logo"
    TEXT = "text"
    SHAPE = "shape"
    DECORATION = "decoration"

class LayerCreate(BaseModel):
    layer_type: LayerType
    name: str
    properties: Dict[str, Any]
    object_key: str | None = None
    text_content: str | None = None
    font_family: str | None = None
    font_size: int | None = None
    color: str | None = None

class LayerOut(LayerCreate):
    id: str
    design_id: str

class DesignCreate(BaseModel):
    name: str = "Untitled"
    canvas_width: int = 1024
    canvas_height: int = 1024

class DesignOut(BaseModel):
    id: str
    user_id: str
    name: str
    canvas_width: int
    canvas_height: int
    status: DesignStatus
    thumbnail_key: str | None
    layers: List[LayerOut] = []
    created_at: str
    updated_at: str