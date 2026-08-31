from sqlalchemy import Column, String, Integer, Numeric, ForeignKey, Enum, DateTime
from sqlalchemy.sql import func
from .base import BaseModel
import enum
from sqlalchemy.orm import relationship 
class PaymentStatus(str, enum.Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"

class Payment(BaseModel):
    __tablename__ = "payments"

    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    order_id = Column(String(100), unique=True, nullable=False)   # Razorpay order ID
    payment_id = Column(String(100), unique=True, nullable=True)  # Razorpay payment ID
    amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(3), default="usd")
    status = Column(Enum(PaymentStatus), default=PaymentStatus.PENDING)
    package_id = Column(String(36), ForeignKey("credit_packages.id"), nullable=True)
    credits_purchased = Column(Integer, nullable=True)
    payment_metadata = Column(
    "metadata",
    String(500),
    nullable=True
)
    paid_at = Column(DateTime, nullable=True)
    user = relationship(
    "User",
    back_populates="payments"
)