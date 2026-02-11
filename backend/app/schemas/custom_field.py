import uuid
from datetime import datetime
from typing import Any, Literal, Self
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator


class SelectOption(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    label: str = Field(min_length=1, max_length=100)
    color: str = Field(min_length=4, max_length=7)


# ── Definition Schemas ──


class CustomFieldDefinitionCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    field_type: Literal[
        "text", "number", "select", "multi_select",
        "date", "checkbox", "url", "person"
    ]
    description: str | None = None
    options: list[SelectOption] | None = None
    is_required: bool = False

    @model_validator(mode="after")
    def validate_options(self) -> Self:
        if self.field_type in ("select", "multi_select"):
            if not self.options or len(self.options) == 0:
                raise ValueError(
                    "options required for select/multi_select fields"
                )
        elif self.options:
            self.options = None
        return self


class CustomFieldDefinitionUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    options: list[SelectOption] | None = None
    is_required: bool | None = None


class CustomFieldDefinitionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    board_id: UUID
    name: str
    field_type: str
    description: str | None = None
    options: list[SelectOption] | None = None
    is_required: bool
    position: float
    created_at: datetime
    updated_at: datetime


class CustomFieldReorder(BaseModel):
    field_ids: list[UUID]


# ── Value Schemas ──


class CustomFieldValueSet(BaseModel):
    field_definition_id: UUID
    value_text: str | None = None
    value_number: float | None = None
    value_json: Any | None = None
    value_date: datetime | None = None


class BulkFieldValueSet(BaseModel):
    values: list[CustomFieldValueSet]


class CustomFieldValueResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    field_definition_id: UUID
    value_text: str | None = None
    value_number: float | None = None
    value_json: Any | None = None
    value_date: datetime | None = None
    created_at: datetime
    updated_at: datetime
