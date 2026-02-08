import uuid
from datetime import UTC, datetime

from sqlalchemy import DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class TaskAssignee(Base):
    __tablename__ = "task_assignees"
    __table_args__ = (
        UniqueConstraint("task_id", "user_id", name="uq_task_assignee_user"),
        UniqueConstraint("task_id", "agent_id", name="uq_task_assignee_agent"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )
    task_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tasks.id", ondelete="CASCADE")
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE")
    )
    agent_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("agents.id", ondelete="CASCADE")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )

    task = relationship("Task", back_populates="assignees")
    user = relationship("User", foreign_keys=[user_id])
    agent = relationship("Agent", foreign_keys=[agent_id])
