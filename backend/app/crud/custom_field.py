from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.custom_field import CustomFieldDefinition
from app.models.custom_field_value import CustomFieldValue
from app.schemas.custom_field import (
    CustomFieldDefinitionCreate,
    CustomFieldDefinitionUpdate,
    CustomFieldValueResponse,
)

from .base import CRUDBase


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
