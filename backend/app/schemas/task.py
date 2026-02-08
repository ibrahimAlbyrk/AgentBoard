from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

from .attachment import AttachmentResponse
from .label import LabelResponse
from .status import StatusResponse
from .user import UserBrief


class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=500)
    description: str | None = None
    status_id: UUID | None = None
    priority: Literal["none", "low", "medium", "high", "urgent"] = "none"
    assignee_id: UUID | None = None
    label_ids: list[UUID] = []
    due_date: datetime | None = None
    parent_id: UUID | None = None


class TaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    status_id: UUID | None = None
    priority: Literal["none", "low", "medium", "high", "urgent"] | None = None
    assignee_id: UUID | None = None
    label_ids: list[UUID] | None = None
    due_date: datetime | None = None


class TaskResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    project_id: UUID
    board_id: UUID
    title: str
    description: str | None = None
    status: StatusResponse
    priority: str
    assignee: UserBrief | None = None
    creator: UserBrief
    labels: list[LabelResponse]
    attachments: list[AttachmentResponse] = []
    due_date: datetime | None = None
    position: float
    parent_id: UUID | None = None
    comments_count: int = 0
    created_at: datetime
    updated_at: datetime | None = None
    completed_at: datetime | None = None

    @model_validator(mode="before")
    @classmethod
    def resolve_labels(cls, data):
        """Convert TaskLabel join objects to Label objects for serialization."""
        if hasattr(data, "labels"):
            raw = data.labels
            if raw and hasattr(raw[0], "label"):
                data.__dict__["labels"] = [tl.label for tl in raw if tl.label]
        return data


class TaskMove(BaseModel):
    status_id: UUID
    position: float | None = None


class TaskReorder(BaseModel):
    position: float


class BulkTaskUpdate(BaseModel):
    task_ids: list[UUID]
    updates: dict


class BulkTaskMove(BaseModel):
    task_ids: list[UUID]
    status_id: UUID


class BulkTaskDelete(BaseModel):
    task_ids: list[UUID]


class DashboardTaskResponse(TaskResponse):
    project_name: str = ""


class MyTasksSummary(BaseModel):
    overdue_count: int = 0
    due_today_count: int = 0
    due_this_week_count: int = 0
    total_assigned: int = 0


class MyTasksResponse(BaseModel):
    summary: MyTasksSummary
    tasks: list[DashboardTaskResponse]
