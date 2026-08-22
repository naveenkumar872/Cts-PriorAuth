import enum
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Enum, ForeignKey, Index, Integer, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.models.base import Base


class NurseDecision(str, enum.Enum):
    """Decision outcome from a nurse's review of an authorization request."""
    approve = "approve"
    deny = "deny"
    escalate = "escalate"
    request_info = "request_info"


class NurseReview(Base):
    """A nurse's clinical review of a prior authorization request."""

    __tablename__ = "nurse_reviews"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    authorization_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("authorization_requests.id", ondelete="CASCADE"),
        nullable=False,
    )
    nurse_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )

    decision: Mapped[NurseDecision] = mapped_column(
        Enum(NurseDecision, native_enum=False, length=20),
        nullable=False,
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    reviewed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        server_default=func.now(),
        nullable=False,
    )

    # -----------------------------------------------------------------------
    # Relationships
    # -----------------------------------------------------------------------
    authorization_request: Mapped["AuthorizationRequest"] = relationship(  # noqa: F821
        "AuthorizationRequest",
        back_populates="nurse_reviews",
        lazy="selectin",
    )
    nurse: Mapped["User"] = relationship(  # noqa: F821
        "User",
        back_populates="nurse_reviews",
        lazy="selectin",
    )

    __table_args__ = (
        Index("ix_nurse_reviews_authorization_id", "authorization_id"),
        Index("ix_nurse_reviews_nurse_id", "nurse_id"),
    )

    def __repr__(self) -> str:
        return (
            f"<NurseReview id={self.id} "
            f"decision={self.decision} "
            f"auth_id={self.authorization_id}>"
        )
