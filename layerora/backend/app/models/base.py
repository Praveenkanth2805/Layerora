from uuid import uuid4

from sqlalchemy import Column, DateTime, String, func
from sqlalchemy.orm import declarative_base, declared_attr


Base = declarative_base()


class TimestampMixin:
    created_at = Column(
        DateTime,
        server_default=func.now(),
        nullable=False,
    )

    updated_at = Column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class BaseModel(Base, TimestampMixin):
    __abstract__ = True

    @declared_attr
    def __tablename__(cls):
        return cls.__name__.lower() + "s"

    id = Column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid4()),
    )