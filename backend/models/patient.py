from datetime import date
from typing import Optional

from sqlalchemy import Date, ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.models.base import Base, TimestampMixin


class Patient(TimestampMixin, Base):
    """A patient who is the subject of a prior authorization request."""

    __tablename__ = "patients"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    date_of_birth: Mapped[date] = mapped_column(Date, nullable=False)
    gender: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    member_id: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)

    # FK — RESTRICT so the plan cannot be deleted while patients are linked.
    # nullable=True allows plan to be unlinked without deleting the patient.
    insurance_plan_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("insurance_plans.id", ondelete="SET NULL"),
        nullable=True,
    )

    # -----------------------------------------------------------------------
    # Relationships
    # -----------------------------------------------------------------------
    insurance_plan: Mapped[Optional["InsurancePlan"]] = relationship(  # noqa: F821
        "InsurancePlan",
        back_populates="patients",
        lazy="selectin",
    )
    authorization_requests: Mapped[list["AuthorizationRequest"]] = relationship(  # noqa: F821
        "AuthorizationRequest",
        back_populates="patient",
        lazy="selectin",
    )

    __table_args__ = (
        Index("ix_patients_member_id", "member_id"),
        Index("ix_patients_insurance_plan_id", "insurance_plan_id"),
    )

    def __repr__(self) -> str:
        return f"<Patient id={self.id} name={self.name!r} member_id={self.member_id!r}>"
