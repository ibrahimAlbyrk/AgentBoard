from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from .agent import AgentBrief
from .attachment import AttachmentResponse
from .reaction import ReactionSummary
from .user import UserBrief


class CommentCreate(BaseModel):
    content: str | dict
    attachment_ids: list[UUID] = []
    agent_creator_id: UUID | None = None


class CommentUpdate(BaseModel):
    content: str | dict


class CommentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    content: dict | str
    content_text: str = ""
    user: UserBrief
    agent_creator: AgentBrief | None = None
    attachments: list[AttachmentResponse] = []
    created_at: datetime
    updated_at: datetime | None = None
    is_edited: bool
    reactions: ReactionSummary | None = None
