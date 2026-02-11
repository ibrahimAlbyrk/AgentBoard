from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from .user import UserBrief


# -- Checklist Item --

class ChecklistItemCreate(BaseModel):
    title: str = Field(min_length=1, max_length=500)
    assignee_id: UUID | None = None
    due_date: datetime | None = None


class ChecklistItemUpdate(BaseModel):
    title: str | None = None
    is_completed: bool | None = None
    assignee_id: UUID | None = None
    due_date: datetime | None = None


class ChecklistItemReorder(BaseModel):
    position: float


class ChecklistItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    checklist_id: UUID
    title: str
    is_completed: bool
    position: float
    assignee: UserBrief | None = None
    due_date: datetime | None = None
    completed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime | None = None


# -- Checklist --

class ChecklistCreate(BaseModel):
    title: str = Field(min_length=1, max_length=300)


class ChecklistUpdate(BaseModel):
    title: str | None = None


class ChecklistReorder(BaseModel):
    position: float


class ChecklistResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    task_id: UUID
    title: str
    position: float
    items: list[ChecklistItemResponse] = []
    created_at: datetime
    updated_at: datetime | None = None


# -- Aggregate progress (embedded in TaskResponse) --

class ChecklistProgress(BaseModel):
    total: int = 0
    completed: int = 0
