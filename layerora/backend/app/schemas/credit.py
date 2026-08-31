from pydantic import BaseModel
from typing import Optional
from decimal import Decimal

class CreditBalance(BaseModel):
    user_id: str
    free_daily_remaining: int
    purchased_balance: int
    total_balance: int

class CreditPackageCreate(BaseModel):
    name: str
    credits: int
    price: Decimal
    currency: str = "usd"
    active: bool = True

class CreditPackageOut(CreditPackageCreate):
    id: str

class PurchaseRequest(BaseModel):
    package_id: str
    payment_method: str = "razorpay"

class PurchaseResponse(BaseModel):
    order_id: str
    amount: Decimal
    currency: str
    key: str