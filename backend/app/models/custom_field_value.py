import uuid
from datetime import UTC, datetime

from sqlalchemy import (
    Float,
    ForeignKey,
    Index,
    JSON,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base, TZDateTime


class CustomFieldValue(Base):
    __tablename__ = "custom_field_values"
    __table_args__ = (
        UniqueConstraint(
            "task_id", "field_definition_id", name="uq_cfv_task_field"
        ),
        Index("ix_cfv_task", "task_id"),
        Index("ix_cfv_definition", "field_definition_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    task_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tasks.id", ondelete="CASCADE")
    )
    field_definition_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("custom_field_definitions.id", ondelete="CASCADE")
    )
    value_text: Mapped[str | None] = mapped_column(Text)
    value_number: Mapped[float | None] = mapped_column(Float)
    value_json: Mapped[dict | None] = mapped_column(JSON)
    value_date: Mapped[datetime | None] = mapped_column(TZDateTime())
    created_at: Mapped[datetime] = mapped_column(
        TZDateTime(), default=lambda: datetime.now(UTC)
    )
    updated_at: Mapped[datetime] = mapped_column(
        TZDateTime(),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )

    task = relationship("Task", back_populates="custom_field_values")
    field_definition = relationship(
        "CustomFieldDefinition", back_populates="values"
    )
