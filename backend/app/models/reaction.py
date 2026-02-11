import uuid
from datetime import UTC, datetime

from sqlalchemy import DateTime, ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Reaction(Base):
    __tablename__ = "reactions"
    __table_args__ = (
        UniqueConstraint(
            "entity_type", "entity_id", "emoji", "user_id",
            name="uq_reaction_entity_emoji_user",
        ),
        UniqueConstraint(
            "entity_type", "entity_id", "emoji", "agent_id",
            name="uq_reaction_entity_emoji_agent",
        ),
        Index("ix_reactions_entity", "entity_type", "entity_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    entity_type: Mapped[str] = mapped_column(String(20))  # "task" | "comment"
    entity_id: Mapped[uuid.UUID] = mapped_column()
    emoji: Mapped[str] = mapped_column(String(32))
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE")
    )
    agent_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("agents.id", ondelete="CASCADE")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )

    user = relationship("User", foreign_keys=[user_id])
    agent = relationship("Agent", foreign_keys=[agent_id])
