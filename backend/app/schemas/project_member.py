from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from .user import UserBrief


class ProjectMemberCreate(BaseModel):
    user_id: UUID
    role: str = "member"


class ProjectMemberUpdate(BaseModel):
    role: str


class ProjectMemberResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user: UserBrief
    role: str
    joined_at: datetime
