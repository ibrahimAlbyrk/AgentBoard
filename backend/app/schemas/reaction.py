from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from .agent import AgentBrief
from .user import UserBrief


class ReactionCreate(BaseModel):
    emoji: str = Field(min_length=1, max_length=32)
    agent_id: UUID | None = None


class ReactionToggle(BaseModel):
    emoji: str = Field(min_length=1, max_length=32)
    agent_id: UUID | None = None


class ReactorBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user: UserBrief | None = None
    agent: AgentBrief | None = None


class ReactionGroup(BaseModel):
    emoji: str
    count: int
    reacted_by_me: bool = False
    reactors: list[ReactorBrief] = []


class ReactionSummary(BaseModel):
    groups: list[ReactionGroup] = []
    total: int = 0


class ToggleResult(BaseModel):
    action: str  # "added" | "removed"
    emoji: str
    summary: ReactionSummary
