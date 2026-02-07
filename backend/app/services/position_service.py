from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import crud_task
from app.models.task import Task


class PositionService:
    POSITION_GAP = 1024.0

    @staticmethod
    def calculate_position(
        before: float | None, after: float | None
    ) -> float:
        if before is None and after is None:
            return PositionService.POSITION_GAP
        if before is None:
            return after - PositionService.POSITION_GAP
        if after is None:
            return before + PositionService.POSITION_GAP
        return (before + after) / 2.0

    @staticmethod
    async def get_end_position(db: AsyncSession, status_id: UUID) -> float:
        max_pos = await crud_task.get_max_position(db, status_id)
        return (max_pos or 0) + PositionService.POSITION_GAP

    @staticmethod
    async def rebalance(db: AsyncSession, status_id: UUID) -> None:
        from sqlalchemy import select

        result = await db.execute(
            select(Task)
            .where(Task.status_id == status_id)
            .order_by(Task.position)
        )
        tasks = list(result.scalars().all())
        for i, task in enumerate(tasks, start=1):
            task.position = i * PositionService.POSITION_GAP
            db.add(task)
        await db.flush()
