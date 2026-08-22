from typing import Optional

from sqlalchemy import Boolean, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.models.base import Base, TimestampMixin


class Policy(TimestampMixin, Base):
    """An insurance policy governing prior authorization criteria for a plan."""

    __tablename__ = "policies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    insurance_plan_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("insurance_plans.id", ondelete="CASCADE"),
        nullable=False,
    )

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    version: Mapped[str] = mapped_column(String(50), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default="1",
    )

    # -----------------------------------------------------------------------
    # Relationships
    # -----------------------------------------------------------------------
    insurance_plan: Mapped["InsurancePlan"] = relationship(  # noqa: F821
        "InsurancePlan",
        back_populates="policies",
        lazy="selectin",
    )
    rules: Mapped[list["PolicyRule"]] = relationship(
        "PolicyRule",
        back_populates="policy",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    __table_args__ = (
        Index("ix_policies_insurance_plan_id", "insurance_plan_id"),
        # Composite index for "fetch active policies for a plan" query
        Index("ix_policies_plan_active", "insurance_plan_id", "active"),
    )

    def __repr__(self) -> str:
        return f"<Policy id={self.id} name={self.name!r} version={self.version!r}>"


class PolicyRule(Base):
    """A single rule or criterion belonging to a policy."""

    __tablename__ = "policy_rules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    policy_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("policies.id", ondelete="CASCADE"),
        nullable=False,
    )

    rule: Mapped[str] = mapped_column(Text, nullable=False)
    requirement: Mapped[str] = mapped_column(Text, nullable=False)
    source_reference: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # -----------------------------------------------------------------------
    # Relationships
    # -----------------------------------------------------------------------
    policy: Mapped["Policy"] = relationship(
        "Policy",
        back_populates="rules",
        lazy="selectin",
    )

    __table_args__ = (
        Index("ix_policy_rules_policy_id", "policy_id"),
    )

    def __repr__(self) -> str:
        return f"<PolicyRule id={self.id} policy_id={self.policy_id}>"
