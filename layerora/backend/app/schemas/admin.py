from pydantic import BaseModel
from typing import List, Optional

class AdminConfigUpdate(BaseModel):
    guest_free_image_limit: Optional[int] = None
    daily_free_extractions: Optional[int] = None
    daily_free_ask_ai: Optional[int] = None
    max_designs_free: Optional[int] = None
    upload_max_size_mb: Optional[int] = None

class UserAdminUpdate(BaseModel):
    is_active: bool

from pydantic import BaseModel
from typing import Optional, List
from decimal import Decimal
from datetime import datetime

# ... existing

class PaymentOut(BaseModel):
    id: str
    user_email: str
    amount: Decimal
    currency: str
    status: str
    credits_purchased: int
    paid_at: Optional[datetime]
    created_at: datetime

class AIUsageStats(BaseModel):
    total_jobs: int
    avg_processing_time: float
    failures: int

class ConfigUpdate(BaseModel):
    guest_free_image_limit: Optional[int] = None
    daily_free_extractions: Optional[int] = None
    daily_free_ask_ai: Optional[int] = None
    max_designs_free: Optional[int] = None
    upload_max_size_mb: Optional[int] = None
    # add more as needed

class ConfigOut(BaseModel):
    key: str
    value: str
    description: Optional[str]