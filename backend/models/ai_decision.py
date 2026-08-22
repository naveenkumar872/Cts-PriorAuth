import enum
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Index,
    Integer,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.models.base import Base


class AIRecommendation(str, enum.Enum):
    """AI triage recommendation for an authorization request."""
    approve = "approve"
    deny = "deny"
    escalate = "escalate"


class AIDecision(Base):
    """AI-generated triage decision for a prior authorization request."""

    __tablename__ = "ai_decisions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    authorization_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("authorization_requests.id", ondelete="CASCADE"),
        nullable=False,
    )

    recommendation: Mapped[AIRecommendation] = mapped_column(
        Enum(AIRecommendation, native_enum=False, length=15),
        nullable=False,
    )
    # Float between 0.0 and 1.0; enforced at app layer and via DB check constraint.
    confidence_score: Mapped[float] = mapped_column(Float, nullable=False)
    reasoning: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        server_default=func.now(),
        nullable=False,
    )

    # -----------------------------------------------------------------------
    # Relationships
    # -----------------------------------------------------------------------
    authorization_request: Mapped["AuthorizationRequest"] = relationship(  # noqa: F821
        "AuthorizationRequest",
        back_populates="ai_decisions",
        lazy="selectin",
    )

    __table_args__ = (
        Index("ix_ai_decisions_authorization_id", "authorization_id"),
        CheckConstraint(
            "confidence_score >= 0.0 AND confidence_score <= 1.0",
            name="ck_ai_decisions_confidence_score_range",
        ),
    )

    def __repr__(self) -> str:
        return (
            f"<AIDecision id={self.id} "
            f"recommendation={self.recommendation} "
            f"confidence={self.confidence_score}>"
        )
