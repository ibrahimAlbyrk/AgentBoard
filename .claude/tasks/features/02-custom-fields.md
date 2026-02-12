# Custom Fields System

> Board-scoped custom field definitions with per-task values. Each field definition creates a "property column" that every task on the board can have a value for. Comparable to Notion database properties or Jira custom fields.

## 1. Overview

### User Stories

- As a board admin, I want to define custom fields (text, number, select, date, checkbox, URL, person) so tasks carry project-specific metadata.
- As a board member, I want to view and edit custom field values on any task so I can track structured data alongside built-in properties.
- As a board admin, I want to reorder, rename, and delete custom field definitions without losing data accidentally.
- As an API consumer, I want custom field values included in task responses and settable via the REST API.

### Comparison

| Capability | AgentBoard (this plan) | Notion | Trello |
|---|---|---|---|
| Scope | Board-level | Database-level | Board-level (Power-Up) |
| Field types | 8 types | 15+ types | 6 types |
| Multi-select | Yes (colored chips) | Yes | No |
| Required fields | Yes | No | No |
| Person field | Users + agents | Users | Members |
| API support | Full REST | Full REST | Power-Up API |

---

## 2. Data Model

### 2.1 `CustomFieldDefinition`

```python
# backend/app/models/custom_field.py

class CustomFieldType(str, enum.Enum):
    TEXT = "text"
    NUMBER = "number"
    SELECT = "select"
    MULTI_SELECT = "multi_select"
    DATE = "date"
    CHECKBOX = "checkbox"
    URL = "url"
    PERSON = "person"


class CustomFieldDefinition(Base):
    __tablename__ = "custom_field_definitions"
    __table_args__ = (
        UniqueConstraint("board_id", "name", name="uq_cfd_board_name"),
        Index("ix_cfd_board_position", "board_id", "position"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    board_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("boards.id", ondelete="CASCADE")
    )
    name: Mapped[str] = mapped_column(String(200))
    field_type: Mapped[str] = mapped_column(String(20))  # CustomFieldType value
    description: Mapped[str | None] = mapped_column(Text)
    options: Mapped[dict | None] = mapped_column(JSON)
    # options schema for select/multi_select:
    # [{ "id": "uuid", "label": "string", "color": "#hex" }, ...]
    is_required: Mapped[bool] = mapped_column(Boolean, default=False)
    position: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )

    # Relationships
    board = relationship("Board", back_populates="custom_field_definitions")
    values = relationship(
        "CustomFieldValue",
        back_populates="field_definition",
        cascade="all, delete-orphan",
    )
```

### 2.2 `CustomFieldValue`

```python
# backend/app/models/custom_field_value.py

class CustomFieldValue(Base):
    __tablename__ = "custom_field_values"
    __table_args__ = (
        UniqueConstraint(
            "task_id", "field_definition_id", name="uq_cfv_task_field"
        ),
        Index("ix_cfv_task", "task_id"),
        Index("ix_cfv_definition", "field_definition_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    task_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tasks.id", ondelete="CASCADE")
    )
    field_definition_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("custom_field_definitions.id", ondelete="CASCADE")
    )
    value_text: Mapped[str | None] = mapped_column(Text)
    value_number: Mapped[float | None] = mapped_column(Float)
    value_json: Mapped[dict | None] = mapped_column(JSON)
    # value_json stores:
    #   select: "option_id_string"
    #   multi_select: ["option_id_1", "option_id_2"]
    #   person: [{ "user_id": "uuid" }, { "agent_id": "uuid" }]
    #   checkbox: stored in value_number (1.0 = true, 0.0 = false)
    value_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )

    # Relationships
    task = relationship("Task", back_populates="custom_field_values")
    field_definition = relationship(
        "CustomFieldDefinition", back_populates="values"
    )
```

### 2.3 Relationship Additions

```python
# In Board model — add:
custom_field_definitions = relationship(
    "CustomFieldDefinition",
    back_populates="board",
    cascade="all, delete-orphan",
)

# In Task model — add:
custom_field_values = relationship(
    "CustomFieldValue",
    back_populates="task",
    cascade="all, delete-orphan",
)
```

### 2.4 Storage Strategy Per Type

| Field Type | Column Used | Format |
|---|---|---|
| `text` | `value_text` | Plain string |
| `number` | `value_number` | Float |
| `select` | `value_json` | `"option_id_string"` |
| `multi_select` | `value_json` | `["opt_id_1", "opt_id_2"]` |
| `date` | `value_date` | DateTime |
| `checkbox` | `value_number` | `1.0` (true) / `0.0` (false) |
| `url` | `value_text` | URL string |
| `person` | `value_json` | `[{"user_id":"uuid"}, {"agent_id":"uuid"}]` |

---

## 3. Database Migration

### Alembic Migration Plan

Create a single migration file: `backend/alembic/versions/xxxx_add_custom_fields.py`

```python
"""add_custom_fields

Revision ID: <auto>
Revises: a1b2c3d4e5f6
"""

def upgrade() -> None:
    from sqlalchemy import inspect
    bind = op.get_bind()
    inspector = inspect(bind)
    existing_tables = inspector.get_table_names()

    if 'custom_field_definitions' not in existing_tables:
        op.create_table(
            'custom_field_definitions',
            sa.Column('id', sa.Uuid(), nullable=False),
            sa.Column('board_id', sa.Uuid(), nullable=False),
            sa.Column('name', sa.String(200), nullable=False),
            sa.Column('field_type', sa.String(20), nullable=False),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('options', sa.JSON(), nullable=True),
            sa.Column('is_required', sa.Boolean(), nullable=False, server_default='0'),
            sa.Column('position', sa.Float(), nullable=False, server_default='0'),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(['board_id'], ['boards.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('board_id', 'name', name='uq_cfd_board_name'),
        )
        op.create_index('ix_cfd_board_position', 'custom_field_definitions',
                         ['board_id', 'position'])

    if 'custom_field_values' not in existing_tables:
        op.create_table(
            'custom_field_values',
            sa.Column('id', sa.Uuid(), nullable=False),
            sa.Column('task_id', sa.Uuid(), nullable=False),
            sa.Column('field_definition_id', sa.Uuid(), nullable=False),
            sa.Column('value_text', sa.Text(), nullable=True),
            sa.Column('value_number', sa.Float(), nullable=True),
            sa.Column('value_json', sa.JSON(), nullable=True),
            sa.Column('value_date', sa.DateTime(timezone=True), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(['task_id'], ['tasks.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['field_definition_id'],
                                     ['custom_field_definitions.id'],
                                     ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('task_id', 'field_definition_id',
                                 name='uq_cfv_task_field'),
        )
        op.create_index('ix_cfv_task', 'custom_field_values', ['task_id'])
        op.create_index('ix_cfv_definition', 'custom_field_values',
                         ['field_definition_id'])


def downgrade() -> None:
    op.drop_table('custom_field_values')
    op.drop_table('custom_field_definitions')
```

**Notes:**
- Use `inspector.get_table_names()` guard for idempotency (matches existing pattern from `a1b2c3d4e5f6`)
- JSON columns work natively in both SQLite and PostgreSQL
- `init_db()` in `main.py` auto-creates tables on startup, so the migration is for existing deployments

---

## 4. Backend API

### 4.1 Custom Field Definitions

All endpoints under: `/api/v1/projects/{project_id}/boards/{board_id}/custom-fields/`

| Method | Path | Handler | Description |
|---|---|---|---|
| `GET` | `/` | `list_custom_fields()` | List all definitions for board, ordered by position |
| `POST` | `/` | `create_custom_field()` | Create new definition; auto-assigns end position |
| `PATCH` | `/{field_id}` | `update_custom_field()` | Update name, description, options, is_required |
| `DELETE` | `/{field_id}` | `delete_custom_field()` | Delete definition + cascade all values |
| `POST` | `/reorder` | `reorder_custom_fields()` | Reorder definitions by position |

### 4.2 Custom Field Values

All endpoints under: `/api/v1/projects/{project_id}/boards/{board_id}/tasks/{task_id}/field-values/`

| Method | Path | Handler | Description |
|---|---|---|---|
| `GET` | `/` | `list_field_values()` | Get all custom field values for a task |
| `PUT` | `/` | `bulk_set_field_values()` | Set multiple field values at once (upsert) |
| `PUT` | `/{field_id}` | `set_field_value()` | Set single field value (upsert) |
| `DELETE` | `/{field_id}` | `clear_field_value()` | Remove a field value |

### 4.3 Request/Response Schemas

```python
# backend/app/schemas/custom_field.py

# ── Definition Schemas ──

class SelectOption(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    label: str = Field(min_length=1, max_length=100)
    color: str = Field(min_length=4, max_length=7)


class CustomFieldDefinitionCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    field_type: Literal[
        "text", "number", "select", "multi_select",
        "date", "checkbox", "url", "person"
    ]
    description: str | None = None
    options: list[SelectOption] | None = None  # required for select/multi_select
    is_required: bool = False

    @model_validator(mode="after")
    def validate_options(self) -> Self:
        if self.field_type in ("select", "multi_select"):
            if not self.options or len(self.options) == 0:
                raise ValueError(
                    "options required for select/multi_select fields"
                )
        elif self.options:
            self.options = None  # discard options for non-select types
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
    """Set a single field value. Exactly one value_* field should be provided."""
    field_definition_id: UUID
    value_text: str | None = None
    value_number: float | None = None
    value_json: Any | None = None  # select option id, multi-select array, person array
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
```

### 4.4 Embed Values in TaskResponse

Add `custom_field_values` to `TaskResponse`:

```python
class TaskResponse(BaseModel):
    # ... existing fields ...
    custom_field_values: list[CustomFieldValueResponse] = []
```

This requires eager-loading `custom_field_values` in `_task_load_options` (in `crud/task.py`).

---

## 5. Validation Engine

### Type-Specific Validation (in `services/custom_field_service.py`)

```python
class CustomFieldService:
    @staticmethod
    def validate_value(
        definition: CustomFieldDefinition,
        value_set: CustomFieldValueSet,
    ) -> None:
        """Raise HTTPException if value doesn't match field type rules."""
        ft = definition.field_type
        has_value = any([
            value_set.value_text is not None,
            value_set.value_number is not None,
            value_set.value_json is not None,
            value_set.value_date is not None,
        ])

        # Required check
        if definition.is_required and not has_value:
            raise HTTPException(400, f'Field "{definition.name}" is required')

        if not has_value:
            return  # clearing the value is allowed for non-required

        match ft:
            case "text":
                if value_set.value_text is None:
                    raise HTTPException(400, f'Text field "{definition.name}" requires value_text')

            case "number":
                if value_set.value_number is None:
                    raise HTTPException(400, f'Number field "{definition.name}" requires value_number')

            case "select":
                opt_id = value_set.value_json
                if not isinstance(opt_id, str):
                    raise HTTPException(400, f'Select field requires a string option ID')
                valid_ids = {o["id"] for o in (definition.options or [])}
                if opt_id not in valid_ids:
                    raise HTTPException(400, f'Invalid option for "{definition.name}"')

            case "multi_select":
                ids = value_set.value_json
                if not isinstance(ids, list) or not all(isinstance(i, str) for i in ids):
                    raise HTTPException(400, f'Multi-select field requires a list of option IDs')
                valid_ids = {o["id"] for o in (definition.options or [])}
                invalid = set(ids) - valid_ids
                if invalid:
                    raise HTTPException(400, f'Invalid options for "{definition.name}": {invalid}')

            case "date":
                if value_set.value_date is None:
                    raise HTTPException(400, f'Date field "{definition.name}" requires value_date')

            case "checkbox":
                if value_set.value_number is None or value_set.value_number not in (0.0, 1.0):
                    raise HTTPException(400, f'Checkbox field requires value_number 0 or 1')

            case "url":
                if value_set.value_text is None:
                    raise HTTPException(400, f'URL field "{definition.name}" requires value_text')
                # Basic URL validation
                if not (value_set.value_text.startswith("http://")
                        or value_set.value_text.startswith("https://")):
                    raise HTTPException(400, f'URL must start with http:// or https://')

            case "person":
                persons = value_set.value_json
                if not isinstance(persons, list):
                    raise HTTPException(400, f'Person field requires a list of person objects')
                for p in persons:
                    if not isinstance(p, dict):
                        raise HTTPException(400, 'Invalid person entry')
                    if "user_id" not in p and "agent_id" not in p:
                        raise HTTPException(400, 'Person entry needs user_id or agent_id')
```

---

## 6. Service Layer

### `backend/app/services/custom_field_service.py`

```python
class CustomFieldService:
    @staticmethod
    async def create_definition(
        db: AsyncSession,
        board_id: UUID,
        field_in: CustomFieldDefinitionCreate,
    ) -> CustomFieldDefinition:
        """Create a new custom field definition with auto-positioned ordering."""
        max_pos = await crud_custom_field_definition.get_max_position(db, board_id)
        definition = CustomFieldDefinition(
            board_id=board_id,
            name=field_in.name,
            field_type=field_in.field_type,
            description=field_in.description,
            options=[o.model_dump() for o in field_in.options] if field_in.options else None,
            is_required=field_in.is_required,
            position=max_pos + 1024.0,
        )
        db.add(definition)
        await db.flush()
        await db.refresh(definition)
        return definition

    @staticmethod
    async def update_definition(
        db: AsyncSession,
        definition: CustomFieldDefinition,
        field_in: CustomFieldDefinitionUpdate,
    ) -> CustomFieldDefinition:
        """Update definition. Preserves existing option IDs when options change."""
        update_data = field_in.model_dump(exclude_unset=True)

        if "options" in update_data and update_data["options"] is not None:
            update_data["options"] = [
                o.model_dump() if hasattr(o, "model_dump") else o
                for o in update_data["options"]
            ]

        for field, value in update_data.items():
            setattr(definition, field, value)

        db.add(definition)
        await db.flush()
        await db.refresh(definition)
        return definition

    @staticmethod
    async def set_field_value(
        db: AsyncSession,
        task_id: UUID,
        definition: CustomFieldDefinition,
        value_set: CustomFieldValueSet,
    ) -> CustomFieldValue:
        """Upsert a single field value. Validates type before write."""
        CustomFieldService.validate_value(definition, value_set)

        existing = await crud_custom_field_value.get_by_task_and_field(
            db, task_id, definition.id
        )

        if existing:
            existing.value_text = value_set.value_text
            existing.value_number = value_set.value_number
            existing.value_json = value_set.value_json
            existing.value_date = value_set.value_date
            db.add(existing)
            await db.flush()
            await db.refresh(existing)
            return existing

        value = CustomFieldValue(
            task_id=task_id,
            field_definition_id=definition.id,
            value_text=value_set.value_text,
            value_number=value_set.value_number,
            value_json=value_set.value_json,
            value_date=value_set.value_date,
        )
        db.add(value)
        await db.flush()
        await db.refresh(value)
        return value

    @staticmethod
    async def bulk_set_values(
        db: AsyncSession,
        task_id: UUID,
        board_id: UUID,
        values: list[CustomFieldValueSet],
    ) -> list[CustomFieldValue]:
        """Set multiple field values at once. Validates each against its definition."""
        results = []
        for v in values:
            definition = await crud_custom_field_definition.get(db, v.field_definition_id)
            if not definition or definition.board_id != board_id:
                raise HTTPException(404, f"Field definition {v.field_definition_id} not found")
            result = await CustomFieldService.set_field_value(db, task_id, definition, v)
            results.append(result)
        return results

    # validate_value defined in Section 5 above
```

### CRUD Classes

```python
# backend/app/crud/custom_field.py

class CRUDCustomFieldDefinition(
    CRUDBase[CustomFieldDefinition, CustomFieldDefinitionCreate, CustomFieldDefinitionUpdate]
):
    async def get_multi_by_board(
        self, db: AsyncSession, board_id: UUID
    ) -> list[CustomFieldDefinition]:
        result = await db.execute(
            select(CustomFieldDefinition)
            .where(CustomFieldDefinition.board_id == board_id)
            .order_by(CustomFieldDefinition.position)
        )
        return list(result.scalars().all())

    async def get_max_position(
        self, db: AsyncSession, board_id: UUID
    ) -> float:
        result = await db.execute(
            select(func.max(CustomFieldDefinition.position))
            .where(CustomFieldDefinition.board_id == board_id)
        )
        return result.scalar_one_or_none() or 0.0

    async def get_by_name(
        self, db: AsyncSession, board_id: UUID, name: str
    ) -> CustomFieldDefinition | None:
        result = await db.execute(
            select(CustomFieldDefinition)
            .where(
                CustomFieldDefinition.board_id == board_id,
                CustomFieldDefinition.name == name,
            )
        )
        return result.scalar_one_or_none()


crud_custom_field_definition = CRUDCustomFieldDefinition(CustomFieldDefinition)


class CRUDCustomFieldValue(
    CRUDBase[CustomFieldValue, CustomFieldValueResponse, CustomFieldValueResponse]
):
    async def get_by_task(
        self, db: AsyncSession, task_id: UUID
    ) -> list[CustomFieldValue]:
        result = await db.execute(
            select(CustomFieldValue)
            .where(CustomFieldValue.task_id == task_id)
        )
        return list(result.scalars().all())

    async def get_by_task_and_field(
        self, db: AsyncSession, task_id: UUID, field_definition_id: UUID
    ) -> CustomFieldValue | None:
        result = await db.execute(
            select(CustomFieldValue)
            .where(
                CustomFieldValue.task_id == task_id,
                CustomFieldValue.field_definition_id == field_definition_id,
            )
        )
        return result.scalar_one_or_none()

    async def delete_by_task_and_field(
        self, db: AsyncSession, task_id: UUID, field_definition_id: UUID
    ) -> None:
        existing = await self.get_by_task_and_field(db, task_id, field_definition_id)
        if existing:
            await db.delete(existing)
            await db.flush()


crud_custom_field_value = CRUDCustomFieldValue(CustomFieldValue)
```

---

## 7. Frontend Types

```typescript
// frontend/src/types/custom-field.ts

export type CustomFieldType =
  | 'text'
  | 'number'
  | 'select'
  | 'multi_select'
  | 'date'
  | 'checkbox'
  | 'url'
  | 'person'

export interface SelectOption {
  id: string
  label: string
  color: string
}

export interface CustomFieldDefinition {
  id: string
  board_id: string
  name: string
  field_type: CustomFieldType
  description: string | null
  options: SelectOption[] | null
  is_required: boolean
  position: number
  created_at: string
  updated_at: string
}

export interface CustomFieldDefinitionCreate {
  name: string
  field_type: CustomFieldType
  description?: string
  options?: SelectOption[]
  is_required?: boolean
}

export interface CustomFieldDefinitionUpdate {
  name?: string
  description?: string
  options?: SelectOption[]
  is_required?: boolean
}

export interface CustomFieldValue {
  id: string
  field_definition_id: string
  value_text: string | null
  value_number: number | null
  value_json: unknown | null
  value_date: string | null
  created_at: string
  updated_at: string
}

export interface CustomFieldValueSet {
  field_definition_id: string
  value_text?: string | null
  value_number?: number | null
  value_json?: unknown | null
  value_date?: string | null
}

// Icon mapping helper type
export interface FieldTypeConfig {
  type: CustomFieldType
  label: string
  icon: string  // Lucide icon name
  description: string
}

// Full type config (used in field type picker)
export const FIELD_TYPE_CONFIGS: FieldTypeConfig[] = [
  { type: 'text',         label: 'Text',         icon: 'Type',          description: 'Short or long text' },
  { type: 'number',       label: 'Number',       icon: 'Hash',          description: 'Numeric value' },
  { type: 'select',       label: 'Select',       icon: 'ChevronDown',   description: 'Single choice from options' },
  { type: 'multi_select', label: 'Multi-Select', icon: 'ListChecks',    description: 'Multiple choices from options' },
  { type: 'date',         label: 'Date',         icon: 'Calendar',      description: 'Date picker' },
  { type: 'checkbox',     label: 'Checkbox',     icon: 'CheckSquare',   description: 'True/false toggle' },
  { type: 'url',          label: 'URL',          icon: 'Link',          description: 'Web address' },
  { type: 'person',       label: 'Person',       icon: 'UserCircle',    description: 'Team member or agent' },
]
```

Add to `frontend/src/types/task.ts`:

```typescript
export interface Task {
  // ... existing fields ...
  custom_field_values: CustomFieldValue[]
}
```

Re-export from `frontend/src/types/index.ts`.

---

## 8. Frontend Hooks

```typescript
// frontend/src/hooks/useCustomFields.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import type {
  CustomFieldDefinition,
  CustomFieldDefinitionCreate,
  CustomFieldDefinitionUpdate,
  CustomFieldValue,
  CustomFieldValueSet,
} from '@/types'

// ── Definitions ──

export function useCustomFieldDefinitions(projectId: string, boardId: string) {
  return useQuery({
    queryKey: ['custom-fields', projectId, boardId],
    queryFn: () => api.listCustomFields(projectId, boardId),
    enabled: !!projectId && !!boardId,
  })
}

export function useCreateCustomField(projectId: string, boardId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CustomFieldDefinitionCreate) =>
      api.createCustomField(projectId, boardId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['custom-fields', projectId, boardId] })
    },
  })
}

export function useUpdateCustomField(projectId: string, boardId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ fieldId, data }: { fieldId: string; data: CustomFieldDefinitionUpdate }) =>
      api.updateCustomField(projectId, boardId, fieldId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['custom-fields', projectId, boardId] })
    },
  })
}

export function useDeleteCustomField(projectId: string, boardId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (fieldId: string) =>
      api.deleteCustomField(projectId, boardId, fieldId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['custom-fields', projectId, boardId] })
      // Also invalidate tasks since their custom_field_values changed
      qc.invalidateQueries({ queryKey: ['tasks', projectId, boardId] })
    },
  })
}

export function useReorderCustomFields(projectId: string, boardId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (fieldIds: string[]) =>
      api.reorderCustomFields(projectId, boardId, fieldIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['custom-fields', projectId, boardId] })
    },
  })
}

// ── Values ──

export function useSetFieldValue(projectId: string, boardId: string, taskId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CustomFieldValueSet) =>
      api.setFieldValue(projectId, boardId, taskId, data.field_definition_id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks', projectId, boardId] })
    },
  })
}

export function useBulkSetFieldValues(projectId: string, boardId: string, taskId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (values: CustomFieldValueSet[]) =>
      api.bulkSetFieldValues(projectId, boardId, taskId, values),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks', projectId, boardId] })
    },
  })
}

export function useClearFieldValue(projectId: string, boardId: string, taskId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (fieldId: string) =>
      api.clearFieldValue(projectId, boardId, taskId, fieldId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks', projectId, boardId] })
    },
  })
}
```

### Cache Strategy

- **Definitions** cached under `['custom-fields', projectId, boardId]` -- refetched when board loads.
- **Values** embedded in task responses under `custom_field_values` -- cached as part of `['tasks', projectId, boardId]`.
- Mutations that change values invalidate the tasks query to refresh the board.
- Definitions are stored in `boardStore` or `projectStore` (added field: `customFieldDefinitions`).

---

## 9. UI Components

### Component Tree

```
TaskDetailPanel
  |-- (existing property rows: Status, Priority, Assignees, Watchers, Due Date)
  |-- CustomFieldsSection                    ← NEW
  |     |-- CustomFieldRow (per definition)
  |     |     |-- TextFieldRenderer
  |     |     |-- NumberFieldRenderer
  |     |     |-- SelectFieldRenderer
  |     |     |-- MultiSelectFieldRenderer
  |     |     |-- DateFieldRenderer
  |     |     |-- CheckboxFieldRenderer
  |     |     |-- UrlFieldRenderer
  |     |     |-- PersonFieldRenderer
  |     |-- "Manage Fields" link → opens CustomFieldManager
  |
  |-- CustomFieldManager (Dialog)            ← NEW
        |-- DefinitionList (drag-to-reorder)
        |-- DefinitionForm (create/edit)
        |     |-- FieldTypePicker
        |     |-- OptionsEditor (for select/multi_select)
```

### File: `frontend/src/components/board/CustomFieldsSection.tsx`

```tsx
interface CustomFieldsSectionProps {
  task: Task
  projectId: string
  boardId: string
  definitions: CustomFieldDefinition[]
}
```

Renders inside the existing property `<div>` block in `TaskDetailPanel`, directly after the Due Date `PropertyRow`. Uses the same `PropertyRow` layout component to maintain visual consistency.

Each definition maps to a `PropertyRow` with:
- Icon derived from `FIELD_TYPE_CONFIGS` (e.g., `Type` for text, `Hash` for number)
- Label = definition name
- Value = type-specific renderer component

### Per-Type Renderers

All renderers share this interface:

```tsx
interface FieldRendererProps {
  definition: CustomFieldDefinition
  value: CustomFieldValue | null
  onUpdate: (value: CustomFieldValueSet) => void
  onClear: () => void
}
```

| Renderer | Interaction | Empty State |
|---|---|---|
| `TextFieldRenderer` | Click to edit inline `Input`, blur to save | "Add text..." placeholder |
| `NumberFieldRenderer` | Click to edit `Input[type=number]`, blur to save | "Add number..." placeholder |
| `SelectFieldRenderer` | `Select` dropdown with colored option dots | "Select..." placeholder |
| `MultiSelectFieldRenderer` | `Popover` with checkbox list, colored chips display | "Select options..." placeholder |
| `DateFieldRenderer` | `Input[type=date]` (same as Due Date pattern) | "Set date..." placeholder |
| `CheckboxFieldRenderer` | `Switch` toggle, immediate save on change | Shows unchecked state |
| `UrlFieldRenderer` | Click to edit inline, when set shows clickable link + edit button | "Add URL..." placeholder |
| `PersonFieldRenderer` | Reuses `PersonPicker` pattern from Assignees | "Add person..." placeholder |

---

## 10. UI Design

### Visual Spec

The custom fields section appears **within** the existing property card (the `rounded-xl border bg-[var(--surface)] divide-y` block), positioned **after** the Due Date row. This makes custom fields feel like first-class properties rather than an addon.

**Section header (when custom fields exist):**
```
┌──────────────────────────────────────────────────┐
│  ⫶ Status          │  In Progress              │
│  ⚑ Priority        │  Medium                   │
│  ⊕ Assignees       │  [avatar] [avatar] [+]    │
│  ◉ Watchers        │  [avatar] [+]             │
│  ◷ Due date        │  2024-03-15               │
│ ─ ─ ─ ─ ─ ─ ─ CUSTOM FIELDS ─ ─ ─ ─ ─ ─ ─ ─ │  ← thin divider with label
│  # Story Points    │  8                        │
│  ▼ Sprint          │  ● Sprint 23 (blue chip)  │
│  ☐ Reviewed        │  [toggle on]              │
│  🔗 PR Link        │  https://github... ↗      │
│  👤 Reviewer       │  [avatar] [avatar] [+]    │
└──────────────────────────────────────────────────┘
         [Manage Custom Fields ⚙]
```

**Design tokens used:**
- Row: `px-4 py-2.5 hover:bg-[var(--elevated)] transition-colors duration-150`
- Icon: `size-3.5 text-[var(--text-tertiary)]`
- Label: `text-xs text-[var(--text-tertiary)] font-medium`, width `w-[110px]`
- Value: `text-sm font-medium text-foreground`
- Empty value: `text-sm text-[var(--text-tertiary)]`
- Section divider: thin line with centered `CUSTOM FIELDS` text in `text-[10px] text-[var(--text-tertiary)] uppercase tracking-widest`

**Select option chips:**
```
style={{
  backgroundColor: option.color,
  borderColor: option.color,
  color: '#fff',
  borderRadius: '6px',
  padding: '1px 8px',
  fontSize: '12px',
  fontWeight: 600,
}}
```

**Multi-select chips:** Same as select but displayed as a flex-wrap row of small chips.

**Checkbox:** Uses the existing shadcn `Switch` component. When checked, the row has a subtle green tint.

**URL field:** When a URL is set, render as a truncated link with an external link icon. Click opens the URL. A small pencil icon appears on hover to edit.

**"Manage Custom Fields" link:** Positioned below the custom fields section (or inline with the section header if definitions exist), styled like the "Manage" link in the Labels section:
```
<button className="flex items-center gap-1 text-[11px] text-[var(--text-tertiary)] hover:text-[var(--accent-solid)] transition-colors">
  <Settings2 className="size-3" />
  Manage Fields
</button>
```

When no custom fields are defined, show an empty state inside the property card:
```
┌──────────────────────────────────────────────────┐
│  ... existing properties ...                     │
│ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │
│     ◇ No custom fields defined                   │
│     Add fields to track project-specific data    │
│                [+ Add Field]                     │
└──────────────────────────────────────────────────┘
```

---

## 11. Field Definition Manager

### `CustomFieldManager` Dialog

Follows the exact pattern of `LabelManager.tsx`:

**Structure:**
- `Dialog` with `sm:max-w-[520px]`
- Header with icon badge + title ("Manage Custom Fields" / "New Field" / "Edit Field")
- `AnimatePresence mode="wait"` switching between `list` and `form` modes
- List mode: "Create new field" dashed button at top, then definition list with drag handles
- Form mode: animated slide-in with type picker, name, description, options editor

**List View:**
```
┌─────────────────────────────────────────────────────┐
│  [≡ icon] Manage Custom Fields                      │
├─────────────────────────────────────────────────────┤
│  ┌─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┐  │
│  │  + Create new field                          │  │
│  └─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┘  │
│                                                     │
│  ⠿ [#] Story Points    number    [✎] [🗑]         │
│  ⠿ [▼] Sprint          select    [✎] [🗑]         │
│  ⠿ [☐] Reviewed        checkbox  [✎] [🗑]         │
│  ⠿ [🔗] PR Link        url       [✎] [🗑]         │
│  ⠿ [👤] Reviewer       person    [✎] [🗑]         │
└─────────────────────────────────────────────────────┘
```

Each row shows:
- Drag handle (6-dot grip icon, `GripVertical`)
- Field type icon (from `FIELD_TYPE_CONFIGS`)
- Field name (bold)
- Type badge (small pill: `text-[10px] bg-[var(--overlay)] px-1.5 py-0.5 rounded-md`)
- Edit/Delete buttons (opacity-0 on hover reveal, same as LabelManager)

**Create/Edit Form View:**

```
┌─────────────────────────────────────────────────────┐
│  [≡ icon] New Field                                 │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Field Type                                         │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌──────────┐ │
│  │ # Text  │ │ # Number│ │ ▼ Select│ │ ≡ Multi  │ │
│  └─────────┘ └─────────┘ └─────────┘ └──────────┘ │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌──────────┐ │
│  │ ◷ Date  │ │ ☐ Check │ │ 🔗 URL  │ │ 👤Person │ │
│  └─────────┘ └─────────┘ └─────────┘ └──────────┘ │
│                                                     │
│  Name                                               │
│  [________________________________]                  │
│                                                     │
│  Description (optional)                             │
│  [________________________________]                  │
│                                                     │
│  ☐ Required field                                   │
│                                                     │
│  ┌─ Options (for select/multi_select) ──────────┐  │
│  │  ● Option 1  [color] [label____] [🗑]       │  │
│  │  ● Option 2  [color] [label____] [🗑]       │  │
│  │  + Add option                                 │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  [Cancel]              [Create Field]               │
└─────────────────────────────────────────────────────┘
```

**Field type picker:** 2x4 grid of selectable cards. Each card has the icon + label. Selected card gets `border-[var(--accent-solid)] bg-[var(--accent-muted-bg)]` styling. Once a field is created, the type is immutable (disabled in edit mode with a note).

**Options editor (select/multi_select only):**
- Shows when `field_type` is `select` or `multi_select`
- Each option row: color swatch (click to pick), label input, delete button
- "Add option" button at bottom
- Options use the same 16-color palette as labels
- Option IDs are auto-generated UUIDs on the client

**Drag-to-reorder:** Uses dnd-kit (already in the project for KanbanBoard) with `SortableContext` and `verticalListSortingStrategy`. On drag end, calls `reorderCustomFields` mutation.

---

## 12. Real-time Sync

### WebSocket Events

Add these events to the WebSocket broadcast system:

| Event | Trigger | Payload |
|---|---|---|
| `custom_field.created` | New definition created | `{ type, project_id, board_id, data: CustomFieldDefinitionResponse }` |
| `custom_field.updated` | Definition updated | `{ type, project_id, board_id, data: CustomFieldDefinitionResponse }` |
| `custom_field.deleted` | Definition deleted | `{ type, project_id, board_id, data: { field_id } }` |
| `custom_field.reordered` | Definitions reordered | `{ type, project_id, board_id, data: { field_ids } }` |

**Field value changes** do NOT need their own WS events. They are included in `task.updated` events since `custom_field_values` is part of `TaskResponse`. When a user sets/clears a field value, the task update broadcast carries the new values.

### Frontend Handling

In `useWebSocket.ts`, add listeners:

```typescript
// custom_field.created / updated / deleted / reordered
// -> invalidate ['custom-fields', projectId, boardId]
wsManager.on('custom_field.created', () => {
  qc.invalidateQueries({ queryKey: ['custom-fields', projectId, boardId] })
})
// ... same for updated, deleted, reordered
```

Field value changes arrive via existing `task.updated` events and are handled by the existing `boardStore.updateTask()` flow (which does in-place merge).

---

## 13. Edge Cases

### Field Definition Deletion

When a definition is deleted, all associated `CustomFieldValue` rows cascade-delete via `ondelete="CASCADE"`. The `CustomFieldManager` shows a confirmation dialog: _"Deleting this field will remove its values from all tasks on this board. This cannot be undone."_

### Field Type Immutability

Once a field is created, its `field_type` cannot be changed. Rationale: changing from `number` to `text` would require migrating existing `value_number` data to `value_text`, which is error-prone. The edit form disables the type picker and shows: _"Field type cannot be changed after creation."_

### Select Option Deletion

When a select option is removed from a definition's `options` array:
- Existing values referencing that option ID become "orphaned"
- The UI renders orphaned values as a grayed-out chip: `"Unknown option"` with a warning icon
- The backend does NOT auto-clean orphaned values (they remain in the DB)
- Users can clear the value manually

### Required Field Enforcement

- Required fields are validated on `set_field_value` / `bulk_set_field_values` only
- Required fields are NOT enforced on task creation (the task can be created without values)
- Empty required fields show a subtle warning indicator (orange dot) in the UI
- Future: could add a board-level setting to enforce required fields on task creation

### Large Number of Fields

- Definitions are ordered by `position` float (same gap-based approach as tasks)
- The UI renders all fields in a scrollable section within the property card
- No hard limit on field count, but UI becomes less practical beyond ~20 fields

### Task Move Between Boards

- Currently, tasks are board-scoped and cannot move between boards
- If cross-board move is added later, custom field values would need migration logic
- For now, this is not a concern

### SQLite JSON Handling

- SQLAlchemy's `JSON` type works with SQLite (stored as TEXT, parsed by the driver)
- No special handling needed for the `options` and `value_json` columns
- Queries that filter by JSON content (not planned) would need dialect-specific handling

---

## 14. File Changes

### New Files

| File | Purpose |
|---|---|
| `backend/app/models/custom_field.py` | `CustomFieldDefinition` model + `CustomFieldType` enum |
| `backend/app/models/custom_field_value.py` | `CustomFieldValue` model |
| `backend/app/schemas/custom_field.py` | All Pydantic schemas for definitions and values |
| `backend/app/crud/custom_field.py` | `CRUDCustomFieldDefinition` + `CRUDCustomFieldValue` |
| `backend/app/services/custom_field_service.py` | Validation + business logic |
| `backend/app/api/v1/custom_fields.py` | Route handlers for definitions + values |
| `backend/alembic/versions/xxxx_add_custom_fields.py` | Migration |
| `frontend/src/types/custom-field.ts` | TypeScript types |
| `frontend/src/hooks/useCustomFields.ts` | TanStack Query hooks |
| `frontend/src/components/board/CustomFieldsSection.tsx` | Section in TaskDetailPanel |
| `frontend/src/components/board/field-renderers/TextFieldRenderer.tsx` | Text renderer |
| `frontend/src/components/board/field-renderers/NumberFieldRenderer.tsx` | Number renderer |
| `frontend/src/components/board/field-renderers/SelectFieldRenderer.tsx` | Select renderer |
| `frontend/src/components/board/field-renderers/MultiSelectFieldRenderer.tsx` | Multi-select renderer |
| `frontend/src/components/board/field-renderers/DateFieldRenderer.tsx` | Date renderer |
| `frontend/src/components/board/field-renderers/CheckboxFieldRenderer.tsx` | Checkbox renderer |
| `frontend/src/components/board/field-renderers/UrlFieldRenderer.tsx` | URL renderer |
| `frontend/src/components/board/field-renderers/PersonFieldRenderer.tsx` | Person renderer |
| `frontend/src/components/board/field-renderers/index.ts` | Barrel export |
| `frontend/src/components/board/CustomFieldManager.tsx` | Definition CRUD dialog |

### Modified Files

| File | Changes |
|---|---|
| `backend/app/models/__init__.py` | Add `CustomFieldDefinition`, `CustomFieldValue` to imports + `__all__` |
| `backend/app/models/board.py` | Add `custom_field_definitions` relationship |
| `backend/app/models/task.py` | Add `custom_field_values` relationship |
| `backend/app/schemas/__init__.py` | Add custom field schema exports |
| `backend/app/schemas/task.py` | Add `custom_field_values: list[CustomFieldValueResponse] = []` to `TaskResponse` |
| `backend/app/crud/__init__.py` | Add `crud_custom_field_definition`, `crud_custom_field_value` |
| `backend/app/crud/task.py` | Add `custom_field_values` to `_task_load_options` eager loading |
| `backend/app/main.py` | Register `custom_fields.router` in the router list |
| `backend/app/api/v1/__init__.py` | (if it has module imports -- currently empty, so no change needed) |
| `frontend/src/types/task.ts` | Add `custom_field_values` to `Task` interface |
| `frontend/src/types/index.ts` | Re-export `./custom-field` |
| `frontend/src/lib/api-client.ts` | Add 8 new API methods for custom fields + values |
| `frontend/src/components/board/TaskDetailPanel.tsx` | Import and render `CustomFieldsSection` after Due Date row |
| `frontend/src/hooks/useWebSocket.ts` | Add listeners for `custom_field.*` events |
| `frontend/src/stores/boardStore.ts` | (No change -- custom field definitions stored in projectStore or fetched per-board) |
| `frontend/src/stores/projectStore.ts` | Add `customFieldDefinitions` state + `setCustomFieldDefinitions` action |
| `frontend/src/pages/BoardPage.tsx` | Fetch custom field definitions on board load, store in projectStore |

### API Client Additions (`api-client.ts`)

```typescript
// Custom Fields
async listCustomFields(projectId: string, boardId: string) {
  return this.request<APIResponse<CustomFieldDefinition[]>>(
    `/projects/${projectId}/boards/${boardId}/custom-fields`
  )
}

async createCustomField(projectId: string, boardId: string, data: CustomFieldDefinitionCreate) {
  return this.request<APIResponse<CustomFieldDefinition>>(
    `/projects/${projectId}/boards/${boardId}/custom-fields`,
    { method: 'POST', body: JSON.stringify(data) }
  )
}

async updateCustomField(projectId: string, boardId: string, fieldId: string, data: CustomFieldDefinitionUpdate) {
  return this.request<APIResponse<CustomFieldDefinition>>(
    `/projects/${projectId}/boards/${boardId}/custom-fields/${fieldId}`,
    { method: 'PATCH', body: JSON.stringify(data) }
  )
}

async deleteCustomField(projectId: string, boardId: string, fieldId: string) {
  return this.request<void>(
    `/projects/${projectId}/boards/${boardId}/custom-fields/${fieldId}`,
    { method: 'DELETE' }
  )
}

async reorderCustomFields(projectId: string, boardId: string, fieldIds: string[]) {
  return this.request<APIResponse<CustomFieldDefinition[]>>(
    `/projects/${projectId}/boards/${boardId}/custom-fields/reorder`,
    { method: 'POST', body: JSON.stringify({ field_ids: fieldIds }) }
  )
}

async setFieldValue(projectId: string, boardId: string, taskId: string, fieldId: string, data: CustomFieldValueSet) {
  return this.request<APIResponse<CustomFieldValue>>(
    `/projects/${projectId}/boards/${boardId}/tasks/${taskId}/field-values/${fieldId}`,
    { method: 'PUT', body: JSON.stringify(data) }
  )
}

async bulkSetFieldValues(projectId: string, boardId: string, taskId: string, values: CustomFieldValueSet[]) {
  return this.request<APIResponse<CustomFieldValue[]>>(
    `/projects/${projectId}/boards/${boardId}/tasks/${taskId}/field-values`,
    { method: 'PUT', body: JSON.stringify({ values }) }
  )
}

async clearFieldValue(projectId: string, boardId: string, taskId: string, fieldId: string) {
  return this.request<void>(
    `/projects/${projectId}/boards/${boardId}/tasks/${taskId}/field-values/${fieldId}`,
    { method: 'DELETE' }
  )
}
```

---

## Implementation Order

1. **Backend models** (`custom_field.py`, `custom_field_value.py`) + model registry
2. **Alembic migration** + relationship additions to Board/Task
3. **Schemas** (`custom_field.py`) + TaskResponse update
4. **CRUD layer** (`custom_field.py`)
5. **Service layer** (`custom_field_service.py`)
6. **Route handlers** (`custom_fields.py`) + router registration
7. **Eager-loading** update in `crud/task.py`
8. **Frontend types** (`custom-field.ts`) + Task type update
9. **API client** methods
10. **Hooks** (`useCustomFields.ts`)
11. **Field renderers** (all 8 type-specific components)
12. **CustomFieldsSection** in TaskDetailPanel
13. **CustomFieldManager** dialog
14. **WebSocket integration**
15. **Store updates** (projectStore)
16. **BoardPage** integration (fetch definitions on load)
