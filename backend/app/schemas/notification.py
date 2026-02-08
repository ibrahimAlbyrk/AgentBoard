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


class NotificationPreferences(BaseModel):
    task_assigned: bool = True
    task_updated: bool = True
    task_moved: bool = True
    task_deleted: bool = True
    task_comment: bool = True
    self_notifications: bool = True
    desktop_enabled: bool = False
    muted_projects: list[str] = []
    email_enabled: bool = False
    email_digest: str = "off"  # off, instant
