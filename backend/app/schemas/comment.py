from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from .agent import AgentBrief
from .attachment import AttachmentResponse
from .user import UserBrief


class CommentCreate(BaseModel):
    content: str = Field(min_length=1)
    attachment_ids: list[UUID] = []
    agent_creator_id: UUID | None = None


class CommentUpdate(BaseModel):
    content: str = Field(min_length=1)


class CommentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    content: str
    user: UserBrief
    agent_creator: AgentBrief | None = None
    attachments: list[AttachmentResponse] = []
    created_at: datetime
    updated_at: datetime | None = None
    is_edited: bool
