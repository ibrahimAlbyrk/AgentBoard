from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, model_validator

from .user import UserBrief


class AttachmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    filename: str
    file_size: int
    mime_type: str
    download_url: str = ""
    user: UserBrief
    created_at: datetime

    @model_validator(mode="before")
    @classmethod
    def build_download_url(cls, data):
        if hasattr(data, "id"):
            data.__dict__["download_url"] = f"/api/v1/attachments/{data.id}/download"
        return data
