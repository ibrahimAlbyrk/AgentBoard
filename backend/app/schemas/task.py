from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

from .agent import AgentBrief
from .attachment import AttachmentResponse
from .checklist import ChecklistProgress
from .custom_field import CustomFieldValueResponse
from .label import LabelResponse
from .reaction import ReactionSummary
from .status import StatusResponse
from .user import UserBrief


class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=500)
    description: str | dict | None = None
    status_id: UUID | None = None
    priority: Literal["none", "low", "medium", "high", "urgent"] = "none"
    assignee_user_ids: list[UUID] = []
    assignee_agent_ids: list[UUID] = []
    agent_creator_id: UUID | None = None
    label_ids: list[UUID] = []
    watcher_user_ids: list[UUID] = []
    watcher_agent_ids: list[UUID] = []
    due_date: datetime | None = None
    parent_id: UUID | None = None
    cover_type: Literal["image", "color", "gradient"] | None = None
    cover_value: str | None = None
    cover_size: Literal["full", "half"] | None = None


class TaskUpdate(BaseModel):
    title: str | None = None
    description: str | dict | None = None
    status_id: UUID | None = None
    priority: Literal["none", "low", "medium", "high", "urgent"] | None = None
    assignee_user_ids: list[UUID] | None = None
    assignee_agent_ids: list[UUID] | None = None
    label_ids: list[UUID] | None = None
    watcher_user_ids: list[UUID] | None = None
    watcher_agent_ids: list[UUID] | None = None
    due_date: datetime | None = None
    cover_type: Literal["image", "color", "gradient"] | None = None
    cover_value: str | None = None
    cover_size: Literal["full", "half"] | None = None


class AssigneeBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user: UserBrief | None = None
    agent: AgentBrief | None = None


class WatcherBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user: UserBrief | None = None
    agent: AgentBrief | None = None


class TaskResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    project_id: UUID
    board_id: UUID
    title: str
    description: dict | None = None
    description_text: str | None = None
    status: StatusResponse
    priority: str
    assignees: list[AssigneeBrief] = []
    creator: UserBrief
    agent_creator: AgentBrief | None = None
    labels: list[LabelResponse]
    attachments: list[AttachmentResponse] = []
    watchers: list[WatcherBrief] = []
    due_date: datetime | None = None
    position: float
    parent_id: UUID | None = None
    cover_type: str | None = None
    cover_value: str | None = None
    cover_size: str | None = None
    cover_image_url: str | None = None
    comments_count: int = 0
    checklist_progress: ChecklistProgress = ChecklistProgress()
    custom_field_values: list[CustomFieldValueResponse] = []
    reactions: ReactionSummary | None = None
    created_at: datetime
    updated_at: datetime | None = None
    completed_at: datetime | None = None

    @model_validator(mode="before")
    @classmethod
    def resolve_checklist_progress(cls, data):
        if hasattr(data, "checklists"):
            total = 0
            completed = 0
            for cl in data.checklists:
                for item in cl.items:
                    total += 1
                    if item.is_completed:
                        completed += 1
            data.__dict__["checklist_progress"] = {"total": total, "completed": completed}
        return data

    @model_validator(mode="before")
    @classmethod
    def resolve_cover_image_url(cls, data):
        if hasattr(data, "cover_type") and data.cover_type == "image" and data.cover_value:
            data.__dict__["cover_image_url"] = f"/api/v1/attachments/{data.cover_value}/download"
        return data

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
