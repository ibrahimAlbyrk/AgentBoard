from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from .board_member import BoardMemberResponse
from .status import StatusResponse


class BoardCreate(BaseModel):
    name: str
    description: str | None = None
    icon: str | None = None
    color: str | None = None
    create_default_statuses: bool = True


class BoardUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    icon: str | None = None
    color: str | None = None


class BoardResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    project_id: UUID
    name: str
    slug: str
    description: str | None = None
    icon: str | None = None
    color: str | None = None
    position: int
    member_count: int = 0
    task_count: int = 0
    status_count: int = 0
    created_at: datetime
    updated_at: datetime | None = None


class BoardDetailResponse(BoardResponse):
    statuses: list[StatusResponse]
    members: list[BoardMemberResponse]


class BoardReorder(BaseModel):
    board_ids: list[UUID]
