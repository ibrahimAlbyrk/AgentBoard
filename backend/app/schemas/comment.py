from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from .user import UserBrief


class CommentCreate(BaseModel):
    content: str = Field(min_length=1)


class CommentUpdate(BaseModel):
    content: str = Field(min_length=1)


class CommentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    content: str
    user: UserBrief
    created_at: datetime
    updated_at: datetime | None = None
    is_edited: bool
