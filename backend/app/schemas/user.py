from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str = Field(min_length=8)
    full_name: str | None = None


class UserUpdate(BaseModel):
    full_name: str | None = None
    avatar_url: str | None = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8)


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str
    username: str
    full_name: str | None = None
    avatar_url: str | None = None
    role: str
    notification_preferences: dict | None = None
    created_at: datetime
    last_login_at: datetime | None = None


class UserBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    username: str
    full_name: str | None = None
    avatar_url: str | None = None
