import uuid
from datetime import UTC, datetime

from sqlalchemy import Boolean, ForeignKey, JSON, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base, TZDateTime


class APIKey(Base):
    __tablename__ = "api_keys"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE")
    )
    key_hash: Mapped[str] = mapped_column(
        String(255), unique=True, index=True
    )
    name: Mapped[str] = mapped_column(String(100))
    prefix: Mapped[str] = mapped_column(String(20), index=True)
    scopes: Mapped[dict | None] = mapped_column(JSON)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    last_used_at: Mapped[datetime | None] = mapped_column(
        TZDateTime()
    )
    expires_at: Mapped[datetime | None] = mapped_column(
        TZDateTime()
    )
    created_at: Mapped[datetime] = mapped_column(
        TZDateTime(), default=lambda: datetime.now(UTC)
    )

    user = relationship("User", back_populates="api_keys")
