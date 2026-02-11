import uuid
from datetime import UTC, datetime

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Board(Base):
    __tablename__ = "boards"
    __table_args__ = (
        UniqueConstraint("project_id", "slug"),
        Index("ix_boards_project_position", "project_id", "position"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE")
    )
    name: Mapped[str] = mapped_column(String(200))
    slug: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text)
    icon: Mapped[str | None] = mapped_column(String(50))
    color: Mapped[str | None] = mapped_column(String(20))
    position: Mapped[int] = mapped_column(Integer, default=0)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )

    project = relationship("Project", back_populates="boards")
    members = relationship(
        "BoardMember", back_populates="board", cascade="all, delete-orphan"
    )
    statuses = relationship(
        "Status", back_populates="board", cascade="all, delete-orphan"
    )
    tasks = relationship(
        "Task", back_populates="board", cascade="all, delete-orphan"
    )
    custom_field_definitions = relationship(
        "CustomFieldDefinition",
        back_populates="board",
        cascade="all, delete-orphan",
    )

    @property
    def member_count(self) -> int:
        return len(self.members)

    @property
    def task_count(self) -> int:
        return len(self.tasks)

    @property
    def status_count(self) -> int:
        return len(self.statuses)
