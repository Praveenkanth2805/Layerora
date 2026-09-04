from datetime import datetime
from enum import Enum
from typing import Any
from pydantic import BaseModel

class WatermarkMode(str, Enum):
    TEXT = "text"
    CUSTOM = "custom"
    LOGO = "logo"

class WatermarkStatus(str, Enum):
    UPLOADED = "uploaded"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class WatermarkJobUpdate(BaseModel):
    mode: WatermarkMode
    text: str | None = None
    selection: dict[str, Any] | None = None

class WatermarkJobOut(BaseModel):
    id: str
    user_id: str
    original_key: str
    original_url: str | None = None
    mask_key: str | None = None
    result_key: str | None = None
    mode: WatermarkMode | None = None
    text: str | None = None
    selection: dict[str, Any] | None = None
    status: WatermarkStatus
    created_at: datetime
    updated_at: datetime