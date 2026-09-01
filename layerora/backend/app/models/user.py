# backend/app/models/user.py
from sqlalchemy import Column, String, Boolean, Enum
from sqlalchemy.orm import relationship
from .base import BaseModel
import enum

class AuthProvider(str, enum.Enum):
    GOOGLE = "google"
    EMAIL = "email"

class User(BaseModel):
    __tablename__ = "users"

    email = Column(String(255), unique=True, index=True, nullable=True)
    name = Column(String(100), nullable=True)
    avatar_url = Column(String(500), nullable=True)
    auth_provider = Column(Enum(AuthProvider), nullable=False)
    hashed_password = Column(String(255), nullable=True)  # only for email/password
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    guest_identifier = Column(String(64), unique=True, nullable=True)  # for anonymous

    # Relationships
    designs = relationship("Design", back_populates="user", cascade="all, delete")
    # credit_transactions = relationship("CreditTransaction", back_populates="user")
    credit_transactions = relationship(
    "CreditTransaction",
    back_populates="user",
    cascade="all, delete-orphan",
)
    # credit_purchases = relationship("CreditPurchase", back_populates="user")

    payments = relationship(
        "Payment",
        back_populates="user",
        cascade="all, delete"
)