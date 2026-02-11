from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.custom_field import crud_custom_field_definition, crud_custom_field_value
from app.models.custom_field import CustomFieldDefinition
from app.models.custom_field_value import CustomFieldValue
from app.schemas.custom_field import (
    CustomFieldDefinitionCreate,
    CustomFieldDefinitionUpdate,
    CustomFieldValueSet,
)


class CustomFieldService:
    @staticmethod
    def validate_value(
        definition: CustomFieldDefinition,
        value_set: CustomFieldValueSet,
    ) -> None:
        ft = definition.field_type
        has_value = any([
            value_set.value_text is not None,
            value_set.value_number is not None,
            value_set.value_json is not None,
            value_set.value_date is not None,
        ])

        if definition.is_required and not has_value:
            raise HTTPException(400, f'Field "{definition.name}" is required')

        if not has_value:
            return

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
                    raise HTTPException(400, "Select field requires a string option ID")
                valid_ids = {o["id"] for o in (definition.options or [])}
                if opt_id not in valid_ids:
                    raise HTTPException(400, f'Invalid option for "{definition.name}"')

            case "multi_select":
                ids = value_set.value_json
                if not isinstance(ids, list) or not all(isinstance(i, str) for i in ids):
                    raise HTTPException(400, "Multi-select field requires a list of option IDs")
                valid_ids = {o["id"] for o in (definition.options or [])}
                invalid = set(ids) - valid_ids
                if invalid:
                    raise HTTPException(400, f'Invalid options for "{definition.name}": {invalid}')

            case "date":
                if value_set.value_date is None:
                    raise HTTPException(400, f'Date field "{definition.name}" requires value_date')

            case "checkbox":
                if value_set.value_number is None or value_set.value_number not in (0.0, 1.0):
                    raise HTTPException(400, "Checkbox field requires value_number 0 or 1")

            case "url":
                if value_set.value_text is None:
                    raise HTTPException(400, f'URL field "{definition.name}" requires value_text')
                if not (
                    value_set.value_text.startswith("http://")
                    or value_set.value_text.startswith("https://")
                ):
                    raise HTTPException(400, "URL must start with http:// or https://")

            case "person":
                persons = value_set.value_json
                if not isinstance(persons, list):
                    raise HTTPException(400, "Person field requires a list of person objects")
                for p in persons:
                    if not isinstance(p, dict):
                        raise HTTPException(400, "Invalid person entry")
                    if "user_id" not in p and "agent_id" not in p:
                        raise HTTPException(400, "Person entry needs user_id or agent_id")

    @staticmethod
    async def create_definition(
        db: AsyncSession,
        board_id: UUID,
        field_in: CustomFieldDefinitionCreate,
    ) -> CustomFieldDefinition:
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
        results = []
        for v in values:
            definition = await crud_custom_field_definition.get(db, v.field_definition_id)
            if not definition or definition.board_id != board_id:
                raise HTTPException(404, f"Field definition {v.field_definition_id} not found")
            result = await CustomFieldService.set_field_value(db, task_id, definition, v)
            results.append(result)
        return results
