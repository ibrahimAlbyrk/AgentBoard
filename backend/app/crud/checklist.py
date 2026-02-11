from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.crud.base import CRUDBase
from app.models.checklist import Checklist
from app.models.checklist_item import ChecklistItem
from app.schemas.checklist import ChecklistCreate, ChecklistUpdate


class CRUDChecklist(CRUDBase[Checklist, ChecklistCreate, ChecklistUpdate]):
    async def get_with_items(self, db: AsyncSession, checklist_id: UUID) -> Checklist | None:
        result = await db.execute(
            select(Checklist)
            .where(Checklist.id == checklist_id)
            .options(
                selectinload(Checklist.items).selectinload(ChecklistItem.assignee)
            )
        )
        return result.scalar_one_or_none()

    async def get_multi_by_task(self, db: AsyncSession, task_id: UUID) -> list[Checklist]:
        result = await db.execute(
            select(Checklist)
            .where(Checklist.task_id == task_id)
            .options(selectinload(Checklist.items).selectinload(ChecklistItem.assignee))
            .order_by(Checklist.position)
        )
        return list(result.scalars().unique().all())

    async def get_max_position(self, db: AsyncSession, task_id: UUID) -> float | None:
        result = await db.execute(
            select(func.max(Checklist.position)).where(Checklist.task_id == task_id)
        )
        return result.scalar_one_or_none()


crud_checklist = CRUDChecklist(Checklist)
