import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, Index, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.models.base import Base


class UserRole(str, enum.Enum):
    """Roles that a user can hold in the system."""
    admin = "admin"
    nurse = "nurse"
    physician = "physician"
    auditor = "auditor"


class User(Base):
    """System users — staff who interact with authorization requests."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, native_enum=False, length=20),
        nullable=False,
    )
    # Users table uses only created_at — no updated_at.
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        server_default=func.now(),
        nullable=False,
    )

    # -----------------------------------------------------------------------
    # Relationships — back-populated from child tables.
    # Declared here; cascade is on the child side (AuthorizationRequest).
    # -----------------------------------------------------------------------
    uploaded_documents: Mapped[list["Document"]] = relationship(  # noqa: F821
        "Document",
        back_populates="uploader",
        lazy="selectin",
    )
    nurse_reviews: Mapped[list["NurseReview"]] = relationship(  # noqa: F821
        "NurseReview",
        back_populates="nurse",
        lazy="selectin",
    )
    authorization_decisions: Mapped[list["AuthorizationDecision"]] = relationship(  # noqa: F821
        "AuthorizationDecision",
        back_populates="decider",
        lazy="selectin",
    )

    __table_args__ = (
        Index("ix_users_email", "email"),  # unique index already on column; this is explicit
    )

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email!r} role={self.role}>"
