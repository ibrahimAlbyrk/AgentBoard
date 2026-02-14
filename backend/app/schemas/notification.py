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
    project_id: UUID | None = None
    created_at: datetime


class NotificationMarkRead(BaseModel):
    notification_ids: list[UUID] | None = None
    mark_all: bool = False


class NotificationType:
    """All valid notification type constants."""
    TASK_ASSIGNED = "task_assigned"
    TASK_UPDATED = "task_updated"
    TASK_MOVED = "task_moved"
    TASK_DELETED = "task_deleted"
    TASK_COMMENT = "task_comment"
    TASK_REACTION = "task_reaction"
    MENTIONED = "mentioned"
    SUBTASK_CREATED = "subtask_created"
    SUBTASK_DELETED = "subtask_deleted"
    WATCHER_ADDED = "watcher_added"
    WATCHER_REMOVED = "watcher_removed"
    ASSIGNEE_ADDED = "assignee_added"
    ASSIGNEE_REMOVED = "assignee_removed"
    COMMENT_DELETED = "comment_deleted"

    ALL = {
        TASK_ASSIGNED, TASK_UPDATED, TASK_MOVED, TASK_DELETED,
        TASK_COMMENT, TASK_REACTION, MENTIONED,
        SUBTASK_CREATED, SUBTASK_DELETED,
        WATCHER_ADDED, WATCHER_REMOVED, ASSIGNEE_ADDED, ASSIGNEE_REMOVED,
        COMMENT_DELETED,
    }


class NotificationPreferences(BaseModel):
    task_assigned: bool = True
    task_updated: bool = True
    task_moved: bool = True
    task_deleted: bool = True
    task_comment: bool = True
    task_reaction: bool = True
    mentioned: bool = True
    subtask_created: bool = True
    subtask_deleted: bool = True
    watcher_added: bool = True
    watcher_removed: bool = True
    assignee_added: bool = True
    assignee_removed: bool = True
    comment_deleted: bool = True
    self_notifications: bool = True
    desktop_enabled: bool = False
    muted_projects: list[str] = []
    email_enabled: bool = False
    email_digest: str = "off"  # off, instant, daily
