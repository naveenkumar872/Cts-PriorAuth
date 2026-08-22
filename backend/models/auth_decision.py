import enum
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Enum, ForeignKey, Index, Integer, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.models.base import Base


class FinalDecision(str, enum.Enum):
    """Final outcome decision for an authorization request.

    Note: these are final authorization outcomes, distinct from AuthStatus
    which tracks the request lifecycle (pending → in_review → approved/denied).
    """
    approved = "approved"
    denied = "denied"
    appealed = "appealed"
    cancelled = "cancelled"


class AuthorizationDecision(Base):
    """The final decision record for a prior authorization request, made by a staff member."""

    __tablename__ = "authorization_decisions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    authorization_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("authorization_requests.id", ondelete="CASCADE"),
        nullable=False,
    )
    decided_by: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )

    decision: Mapped[FinalDecision] = mapped_column(
        Enum(FinalDecision, native_enum=False, length=15),
        nullable=False,
    )
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    decided_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        server_default=func.now(),
        nullable=False,
    )

    # -----------------------------------------------------------------------
    # Relationships
    # -----------------------------------------------------------------------
    authorization_request: Mapped["AuthorizationRequest"] = relationship(  # noqa: F821
        "AuthorizationRequest",
        back_populates="authorization_decisions",
        lazy="selectin",
    )
    decider: Mapped["User"] = relationship(  # noqa: F821
        "User",
        back_populates="authorization_decisions",
        lazy="selectin",
    )

    __table_args__ = (
        Index("ix_auth_decisions_authorization_id", "authorization_id"),
        Index("ix_auth_decisions_decided_by", "decided_by"),
    )

    def __repr__(self) -> str:
        return (
            f"<AuthorizationDecision id={self.id} "
            f"decision={self.decision} "
            f"auth_id={self.authorization_id}>"
        )
