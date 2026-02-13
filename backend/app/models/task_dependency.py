from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base, TZDateTime


class TaskDependency(Base):
    __tablename__ = "task_dependencies"

    task_id: Mapped[UUID] = mapped_column(
        ForeignKey("tasks.id", ondelete="CASCADE"), primary_key=True
    )
    depends_on_id: Mapped[UUID] = mapped_column(
        ForeignKey("tasks.id", ondelete="CASCADE"), primary_key=True
    )
    created_at: Mapped[datetime] = mapped_column(
        TZDateTime(), default=lambda: datetime.now(UTC)
    )

    task = relationship(
        "Task", foreign_keys=[task_id], back_populates="dependencies"
    )
    depends_on = relationship(
        "Task", foreign_keys=[depends_on_id], back_populates="dependents"
    )
