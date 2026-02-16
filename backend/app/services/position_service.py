from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import crud_task
from app.models.task import Task


class PositionService:
    POSITION_GAP = 1024.0
    REBALANCE_THRESHOLD = 1.0

    @staticmethod
    def calculate_position(
        before: float | None, after: float | None
    ) -> float:
        if before is None and after is None:
            return PositionService.POSITION_GAP
        if before is None:
            return after / 2.0
        if after is None:
            return before + PositionService.POSITION_GAP
        return (before + after) / 2.0

    @staticmethod
    async def get_end_position(db: AsyncSession, status_id: UUID) -> float:
        max_pos = await crud_task.get_max_position(db, status_id)
        return (max_pos or 0) + PositionService.POSITION_GAP

    @staticmethod
    async def rebalance(db: AsyncSession, status_id: UUID) -> None:
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

    @staticmethod
    async def _needs_rebalance(db: AsyncSession, status_id: UUID) -> bool:
        result = await db.execute(
            select(Task.position)
            .where(Task.status_id == status_id)
            .order_by(Task.position)
        )
        positions = [row[0] for row in result.all()]

        if len(positions) < 2:
            return False

        for i in range(len(positions) - 1):
            if positions[i + 1] - positions[i] < PositionService.REBALANCE_THRESHOLD:
                return True
        return False

    @staticmethod
    async def maybe_rebalance(db: AsyncSession, status_id: UUID) -> bool:
        if await PositionService._needs_rebalance(db, status_id):
            await PositionService.rebalance(db, status_id)
            return True
        return False

    @staticmethod
    async def ensure_gap_and_position(
        db: AsyncSession,
        status_id: UUID,
        position: float | None,
    ) -> float:
        """Proactive rebalance: if positions are too tight, rebalance first,
        then (re)calculate the end position. Returns final position to use."""
        # Frontend already calculated position — skip expensive rebalance check
        if position is not None:
            return position

        if await PositionService._needs_rebalance(db, status_id):
            await PositionService.rebalance(db, status_id)

        return await PositionService.get_end_position(db, status_id)

    @staticmethod
    async def get_end_position_in_parent(db: AsyncSession, parent_id: UUID) -> float:
        max_pos = await crud_task.get_max_position_in_parent(db, parent_id)
        return (max_pos or 0) + PositionService.POSITION_GAP

    @staticmethod
    async def rebalance_children(db: AsyncSession, parent_id: UUID) -> None:
        result = await db.execute(
            select(Task)
            .where(Task.parent_id == parent_id)
            .order_by(Task.position)
        )
        tasks = list(result.scalars().all())
        for i, task in enumerate(tasks, start=1):
            task.position = i * PositionService.POSITION_GAP
            db.add(task)
        await db.flush()
