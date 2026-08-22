from datetime import datetime

from sqlalchemy import DateTime, Integer, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    """SQLAlchemy 2.0 declarative base for all ORM models."""
    pass


class TimestampMixin:
    """Mixin that adds created_at and updated_at columns to any model.

    Both columns are set at the database level:
    - created_at: set once on INSERT via server_default=func.now()
    - updated_at: set on INSERT and refreshed on UPDATE via onupdate=func.now()

    TiDB/MySQL note: onupdate is handled by SQLAlchemy on ORM-issued UPDATEs.
    For DB-level ON UPDATE CURRENT_TIMESTAMP, the column is defined that way
    in the Alembic migration DDL automatically via SQLAlchemy's server_onupdate.
    """

    # TiDB/MySQL: DATETIME (no timezone) — values are stored/returned as UTC.
    # SQLAlchemy's DateTime(timezone=False) maps to DATETIME in MySQL/TiDB.
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
