import uuid
from datetime import UTC, datetime

from sqlalchemy import (
    DateTime,
    Float,
    ForeignKey,
    Index,
    JSON,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Task(Base):
    __tablename__ = "tasks"
    __table_args__ = (
        Index("ix_tasks_status_position", "status_id", "position"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE")
    )
    board_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("boards.id", ondelete="CASCADE")
    )
    title: Mapped[str] = mapped_column(String(500))
    description: Mapped[dict | None] = mapped_column(JSON)
    description_text: Mapped[str | None] = mapped_column(Text)
    status_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("statuses.id", ondelete="RESTRICT")
    )
    priority: Mapped[str] = mapped_column(String(20), default="none")
    creator_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE")
    )
    agent_creator_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("agents.id", ondelete="SET NULL")
    )
    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("tasks.id", ondelete="SET NULL")
    )
    due_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    position: Mapped[float] = mapped_column(Float, default=0.0)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True)
    )

    cover_type: Mapped[str | None] = mapped_column(String(20))
    cover_value: Mapped[str | None] = mapped_column(String(500))
    cover_size: Mapped[str | None] = mapped_column(String(10))

    project = relationship("Project", back_populates="tasks")
    board = relationship("Board", back_populates="tasks")
    status = relationship("Status", back_populates="tasks")
    creator = relationship("User", foreign_keys=[creator_id])
    agent_creator = relationship("Agent", foreign_keys=[agent_creator_id])
    parent = relationship(
        "Task", remote_side="Task.id", back_populates="children"
    )
    children = relationship("Task", back_populates="parent")
    labels = relationship(
        "TaskLabel", back_populates="task", cascade="all, delete-orphan"
    )
    comments = relationship(
        "Comment", back_populates="task", cascade="all, delete-orphan"
    )
    dependencies = relationship(
        "TaskDependency",
        foreign_keys="TaskDependency.task_id",
        back_populates="task",
        cascade="all, delete-orphan",
    )
    dependents = relationship(
        "TaskDependency",
        foreign_keys="TaskDependency.depends_on_id",
        back_populates="depends_on",
        cascade="all, delete-orphan",
    )
    attachments = relationship(
        "Attachment", back_populates="task", cascade="all, delete-orphan"
    )
    watchers = relationship(
        "TaskWatcher", back_populates="task", cascade="all, delete-orphan"
    )
    assignees = relationship(
        "TaskAssignee", back_populates="task", cascade="all, delete-orphan"
    )
    checklists = relationship(
        "Checklist",
        back_populates="task",
        cascade="all, delete-orphan",
        order_by="Checklist.position",
    )
    custom_field_values = relationship(
        "CustomFieldValue",
        back_populates="task",
        cascade="all, delete-orphan",
    )
