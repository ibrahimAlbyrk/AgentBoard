import uuid
from datetime import UTC, datetime

from sqlalchemy import Boolean, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base, TZDateTime


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text)
    slug: Mapped[str] = mapped_column(
        String(200), unique=True, index=True
    )
    owner_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE")
    )
    icon: Mapped[str | None] = mapped_column(String(50))
    color: Mapped[str | None] = mapped_column(String(20))
    is_archived: Mapped[bool] = mapped_column(
        Boolean, default=False, index=True
    )

    created_at: Mapped[datetime] = mapped_column(
        TZDateTime(), default=lambda: datetime.now(UTC)
    )
    updated_at: Mapped[datetime] = mapped_column(
        TZDateTime(),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )

    owner = relationship("User", back_populates="owned_projects")
    members = relationship(
        "ProjectMember", back_populates="project", cascade="all, delete-orphan"
    )
    statuses = relationship(
        "Status", back_populates="project", cascade="all, delete-orphan"
    )
    labels = relationship(
        "Label", back_populates="project", cascade="all, delete-orphan"
    )
    tasks = relationship(
        "Task", back_populates="project", cascade="all, delete-orphan"
    )
    boards = relationship(
        "Board", back_populates="project", cascade="all, delete-orphan"
    )
    agents = relationship(
        "Agent", back_populates="project", cascade="all, delete-orphan"
    )

    @property
    def member_count(self) -> int:
        return len(self.members)

    @property
    def task_count(self) -> int:
        return len(self.tasks)
