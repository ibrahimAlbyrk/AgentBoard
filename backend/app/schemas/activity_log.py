from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from .user import UserBrief


class ActivityLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    action: str
    entity_type: str
    changes: dict
    user: UserBrief
    task_id: UUID | None = None
    created_at: datetime
