from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class StatusCreate(BaseModel):
    name: str
    color: str | None = None
    position: int | None = None
    is_default: bool = False
    is_terminal: bool = False


class StatusUpdate(BaseModel):
    name: str | None = None
    color: str | None = None
    is_default: bool | None = None
    is_terminal: bool | None = None


class StatusResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    board_id: UUID
    name: str
    slug: str
    color: str | None = None
    position: int
    is_default: bool
    is_terminal: bool
    task_count: int = 0
    created_at: datetime


class StatusReorder(BaseModel):
    status_ids: list[UUID]
