from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class AgentCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    color: str = Field(min_length=4, max_length=7)


class AgentUpdate(BaseModel):
    name: str | None = None
    color: str | None = None
    is_active: bool | None = None


class AgentBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    color: str


class AgentResponse(AgentBrief):
    is_active: bool
    created_at: datetime
    updated_at: datetime | None = None
