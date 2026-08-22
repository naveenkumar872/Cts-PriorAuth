from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.models.base import Base


class Document(Base):
    """A supporting document attached to a prior authorization request."""

    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    authorization_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("authorization_requests.id", ondelete="CASCADE"),
        nullable=False,
    )
    document_type: Mapped[str] = mapped_column(String(100), nullable=False)
    file_url: Mapped[str] = mapped_column(String(1000), nullable=False)

    uploaded_by: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        server_default=func.now(),
        nullable=False,
    )

    # -----------------------------------------------------------------------
    # Relationships
    # -----------------------------------------------------------------------
    authorization_request: Mapped["AuthorizationRequest"] = relationship(  # noqa: F821
        "AuthorizationRequest",
        back_populates="documents",
        lazy="selectin",
    )
    uploader: Mapped["User"] = relationship(  # noqa: F821
        "User",
        back_populates="uploaded_documents",
        lazy="selectin",
    )

    __table_args__ = (
        Index("ix_documents_authorization_id", "authorization_id"),
        Index("ix_documents_uploaded_by", "uploaded_by"),
    )

    def __repr__(self) -> str:
        return (
            f"<Document id={self.id} type={self.document_type!r} "
            f"auth_id={self.authorization_id}>"
        )
