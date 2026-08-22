from typing import Optional

from sqlalchemy import Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.models.base import Base, TimestampMixin


class Provider(TimestampMixin, Base):
    """A healthcare provider (individual or organization) who submits authorization requests."""

    __tablename__ = "providers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    organization: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    license_number: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        unique=True,
    )

    # -----------------------------------------------------------------------
    # Relationships
    # -----------------------------------------------------------------------
    authorization_requests: Mapped[list["AuthorizationRequest"]] = relationship(  # noqa: F821
        "AuthorizationRequest",
        back_populates="provider",
        lazy="selectin",
    )

    __table_args__ = (
        Index("ix_providers_license_number", "license_number"),
    )

    def __repr__(self) -> str:
        return f"<Provider id={self.id} name={self.name!r} license={self.license_number!r}>"
