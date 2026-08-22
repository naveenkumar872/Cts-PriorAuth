from typing import Optional

from sqlalchemy import Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.models.base import Base, TimestampMixin


class Service(TimestampMixin, Base):
    """A clinical service or procedure that can be subject to prior authorization."""

    __tablename__ = "services"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    code: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # -----------------------------------------------------------------------
    # Relationships
    # -----------------------------------------------------------------------
    authorization_requests: Mapped[list["AuthorizationRequest"]] = relationship(  # noqa: F821
        "AuthorizationRequest",
        back_populates="service",
        lazy="selectin",
    )

    __table_args__ = (
        Index("ix_services_code", "code"),
    )

    def __repr__(self) -> str:
        return f"<Service id={self.id} code={self.code!r} name={self.name!r}>"
