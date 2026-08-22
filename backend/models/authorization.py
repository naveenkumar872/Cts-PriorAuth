import enum
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.models.base import Base


class AuthStatus(str, enum.Enum):
    """Lifecycle status of an authorization request."""
    pending = "pending"
    in_review = "in_review"
    approved = "approved"
    denied = "denied"


class Priority(str, enum.Enum):
    """Clinical urgency priority of an authorization request."""
    low = "low"
    medium = "medium"
    high = "high"
    urgent = "urgent"


class AuthorizationRequest(Base):
    """The central table linking patient, provider, and service for a prior authorization request."""

    __tablename__ = "authorization_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Foreign keys with explicit ondelete behaviour
    patient_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("patients.id", ondelete="CASCADE"),
        nullable=False,
    )
    provider_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("providers.id", ondelete="RESTRICT"),
        nullable=False,
    )
    service_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("services.id", ondelete="RESTRICT"),
        nullable=False,
    )

    diagnosis: Mapped[str] = mapped_column(String(500), nullable=False)
    clinical_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    status: Mapped[AuthStatus] = mapped_column(
        Enum(AuthStatus, native_enum=False, length=20),
        nullable=False,
        default=AuthStatus.pending,
        server_default=AuthStatus.pending.value,
    )
    priority: Mapped[Priority] = mapped_column(
        Enum(Priority, native_enum=False, length=10),
        nullable=False,
        default=Priority.low,
        server_default=Priority.low.value,
    )

    submitted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        server_default=func.now(),
        nullable=False,
    )

    # -----------------------------------------------------------------------
    # Parent relationships (many-to-one, no cascade — parents are independent)
    # -----------------------------------------------------------------------
    patient: Mapped["Patient"] = relationship(  # noqa: F821
        "Patient",
        back_populates="authorization_requests",
        lazy="selectin",
    )
    provider: Mapped["Provider"] = relationship(  # noqa: F821
        "Provider",
        back_populates="authorization_requests",
        lazy="selectin",
    )
    service: Mapped["Service"] = relationship(  # noqa: F821
        "Service",
        back_populates="authorization_requests",
        lazy="selectin",
    )

    # -----------------------------------------------------------------------
    # Child relationships — cascade="all, delete-orphan" so that deleting
    # an AuthorizationRequest also deletes all its dependent rows.
    # -----------------------------------------------------------------------
    documents: Mapped[list["Document"]] = relationship(  # noqa: F821
        "Document",
        back_populates="authorization_request",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    ai_decisions: Mapped[list["AIDecision"]] = relationship(  # noqa: F821
        "AIDecision",
        back_populates="authorization_request",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    nurse_reviews: Mapped[list["NurseReview"]] = relationship(  # noqa: F821
        "NurseReview",
        back_populates="authorization_request",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    authorization_decisions: Mapped[list["AuthorizationDecision"]] = relationship(  # noqa: F821
        "AuthorizationDecision",
        back_populates="authorization_request",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    __table_args__ = (
        # Individual FK indexes
        Index("ix_auth_requests_patient_id", "patient_id"),
        Index("ix_auth_requests_provider_id", "provider_id"),
        Index("ix_auth_requests_service_id", "service_id"),
        # Status and priority are queried individually and together (dashboard)
        Index("ix_auth_requests_status", "status"),
        Index("ix_auth_requests_priority", "priority"),
        Index("ix_auth_requests_status_priority", "status", "priority"),
    )

    def __repr__(self) -> str:
        return (
            f"<AuthorizationRequest id={self.id} "
            f"status={self.status} priority={self.priority}>"
        )
