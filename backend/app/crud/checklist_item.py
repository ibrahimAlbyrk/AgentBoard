from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.base import CRUDBase
from app.models.checklist_item import ChecklistItem
from app.schemas.checklist import ChecklistItemCreate, ChecklistItemUpdate


class CRUDChecklistItem(CRUDBase[ChecklistItem, ChecklistItemCreate, ChecklistItemUpdate]):
    async def get_max_position(self, db: AsyncSession, checklist_id: UUID) -> float | None:
        result = await db.execute(
            select(func.max(ChecklistItem.position))
            .where(ChecklistItem.checklist_id == checklist_id)
        )
        return result.scalar_one_or_none()


crud_checklist_item = CRUDChecklistItem(ChecklistItem)
