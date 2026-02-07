from datetime import datetime
from typing import Any, Generic, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class ResponseBase(BaseModel, Generic[T]):
    success: bool = True
    data: T
    meta: dict = Field(
        default_factory=lambda: {"timestamp": datetime.utcnow().isoformat()}
    )


class PaginationMeta(BaseModel):
    page: int
    per_page: int
    total: int
    total_pages: int


class PaginatedResponse(BaseModel, Generic[T]):
    success: bool = True
    data: list[T]
    pagination: PaginationMeta
    meta: dict = Field(
        default_factory=lambda: {"timestamp": datetime.utcnow().isoformat()}
    )


class ErrorDetail(BaseModel):
    field: str | None = None
    message: str


class ErrorBody(BaseModel):
    code: str
    message: str
    details: list[ErrorDetail] | None = None


class ErrorResponse(BaseModel):
    success: bool = False
    error: ErrorBody
    meta: dict = Field(
        default_factory=lambda: {"timestamp": datetime.utcnow().isoformat()}
    )
