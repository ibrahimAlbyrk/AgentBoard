from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.label import Label
from app.schemas.label import LabelCreate, LabelUpdate

from .base import CRUDBase


class CRUDLabel(CRUDBase[Label, LabelCreate, LabelUpdate]):
    async def get_multi_by_project(
        self, db: AsyncSession, project_id: UUID
    ) -> list[Label]:
        result = await db.execute(
            select(Label).where(Label.project_id == project_id)
        )
        return list(result.scalars().all())


crud_label = CRUDLabel(Label)
