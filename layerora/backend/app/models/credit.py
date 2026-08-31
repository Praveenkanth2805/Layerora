from sqlalchemy import Column, String, Integer, ForeignKey, Enum, JSON
from sqlalchemy.orm import relationship

from .base import BaseModel

import enum


class CreditTransactionType(str, enum.Enum):
    FREE_DAILY = "free_daily"
    PURCHASED = "purchased"
    CONSUMPTION = "consumption"
    REFUND = "refund"
    ADMIN_ADJUST = "admin_adjust"


class CreditTransaction(BaseModel):
    __tablename__ = "credit_transactions"

    user_id = Column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )

    amount = Column(Integer, nullable=False)

    type = Column(
        Enum(CreditTransactionType),
        nullable=False
    )

    description = Column(String(500), nullable=True)

    reference_id = Column(
        String(100),
        nullable=True
    )

    # Python attribute = transaction_metadata
    # Database column = metadata
    transaction_metadata = Column(
        "metadata",
        JSON,
        nullable=True
    )

    user = relationship(
        "User",
        back_populates="credit_transactions"
    )