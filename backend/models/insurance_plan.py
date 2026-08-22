from sqlalchemy import Boolean, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.models.base import Base, TimestampMixin


class InsurancePlan(TimestampMixin, Base):
    """An insurance plan offered by a provider/payer."""

    __tablename__ = "insurance_plans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    provider: Mapped[str] = mapped_column(String(255), nullable=False)
    plan_type: Mapped[str] = mapped_column(String(100), nullable=False)
    active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default="1",
    )

    # -----------------------------------------------------------------------
    # Relationships
    # -----------------------------------------------------------------------
    patients: Mapped[list["Patient"]] = relationship(  # noqa: F821
        "Patient",
        back_populates="insurance_plan",
        lazy="selectin",
    )
    policies: Mapped[list["Policy"]] = relationship(  # noqa: F821
        "Policy",
        back_populates="insurance_plan",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<InsurancePlan id={self.id} name={self.name!r}>"
