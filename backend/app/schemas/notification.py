from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    type: str
    title: str
    message: str
    is_read: bool
    data: dict[str, Any] | None = None
    created_at: datetime


class NotificationMarkRead(BaseModel):
    notification_ids: list[UUID] | None = None
    mark_all: bool = False
