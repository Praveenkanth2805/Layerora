from sqlalchemy import Column, String, Integer, Numeric, Boolean
from .base import BaseModel

class CreditPackage(BaseModel):
    __tablename__ = "credit_packages"

    name = Column(String(100), nullable=False)
    credits = Column(Integer, nullable=False)
    price = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(3), default="usd")
    active = Column(Boolean, default=True)