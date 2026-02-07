from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.status import Status
from app.schemas.status import StatusCreate, StatusUpdate

from .base import CRUDBase


class CRUDStatus(CRUDBase[Status, StatusCreate, StatusUpdate]):
    async def get_multi_by_project(
        self, db: AsyncSession, project_id: UUID
    ) -> list[Status]:
        result = await db.execute(
            select(Status)
            .where(Status.project_id == project_id)
            .order_by(Status.position)
        )
        return list(result.scalars().all())

    async def get_default(
        self, db: AsyncSession, project_id: UUID
    ) -> Status | None:
        result = await db.execute(
            select(Status).where(
                Status.project_id == project_id,
                Status.is_default == True,  # noqa: E712
            )
        )
        return result.scalar_one_or_none()

    async def get_max_position(
        self, db: AsyncSession, project_id: UUID
    ) -> int:
        result = await db.execute(
            select(func.coalesce(func.max(Status.position), 0)).where(
                Status.project_id == project_id
            )
        )
        return result.scalar_one()


crud_status = CRUDStatus(Status)
