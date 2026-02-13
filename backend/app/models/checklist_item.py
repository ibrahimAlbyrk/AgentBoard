import uuid
from datetime import UTC, datetime

from sqlalchemy import Boolean, Float, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base, TZDateTime


class ChecklistItem(Base):
    __tablename__ = "checklist_items"
    __table_args__ = (
        Index("ix_checklist_items_checklist_position", "checklist_id", "position"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    checklist_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("checklists.id", ondelete="CASCADE")
    )
    title: Mapped[str] = mapped_column(String(500))
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    position: Mapped[float] = mapped_column(Float, default=0.0)
    assignee_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    due_date: Mapped[datetime | None] = mapped_column(TZDateTime())
    completed_at: Mapped[datetime | None] = mapped_column(TZDateTime())

    created_at: Mapped[datetime] = mapped_column(
        TZDateTime(), default=lambda: datetime.now(UTC)
    )
    updated_at: Mapped[datetime] = mapped_column(
        TZDateTime(),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )

    checklist = relationship("Checklist", back_populates="items")
    assignee = relationship("User", foreign_keys=[assignee_id])
