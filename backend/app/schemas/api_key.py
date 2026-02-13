from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class APIKeyCreate(BaseModel):
    name: str
    scopes: list[str] = []
    expires_in_days: int | None = 365
    agent_id: UUID | None = None


class APIKeyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    prefix: str
    scopes: list[str]
    agent_id: UUID | None = None
    agent_name: str | None = None
    last_used_at: datetime | None = None
    expires_at: datetime | None = None
    created_at: datetime
    is_active: bool


class APIKeyCreatedResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    key: str
    prefix: str
    scopes: list[str]
    expires_at: datetime | None = None
    created_at: datetime
