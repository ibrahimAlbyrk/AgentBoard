from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from .board import BoardResponse
from .label import LabelResponse
from .project_member import ProjectMemberResponse
from .user import UserBrief


class ProjectCreate(BaseModel):
    name: str
    description: str | None = None
    slug: str | None = None
    icon: str | None = None
    color: str | None = None
    create_default_board: bool = True


class ProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    icon: str | None = None
    color: str | None = None


class ProjectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    description: str | None = None
    slug: str
    owner: UserBrief
    icon: str | None = None
    color: str | None = None
    is_archived: bool
    member_count: int = 0
    task_count: int = 0
    created_at: datetime
    updated_at: datetime | None = None


class ProjectDetailResponse(ProjectResponse):
    members: list[ProjectMemberResponse]
    boards: list[BoardResponse]
    labels: list[LabelResponse]
