from typing import Any
from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from app.models.task import Task
from app.models.task_label import TaskLabel
from app.schemas.task import TaskCreate, TaskUpdate

from .base import CRUDBase

_task_load_options = (
    joinedload(Task.status),
    joinedload(Task.assignee),
    joinedload(Task.creator),
    selectinload(Task.labels).joinedload(TaskLabel.label),
)


class CRUDTask(CRUDBase[Task, TaskCreate, TaskUpdate]):
    async def get_with_relations(
        self, db: AsyncSession, task_id: UUID
    ) -> Task | None:
        result = await db.execute(
            select(Task)
            .where(Task.id == task_id)
            .options(*_task_load_options)
        )
        return result.unique().scalar_one_or_none()

    async def get_multi_by_board(
        self,
        db: AsyncSession,
        board_id: UUID,
        *,
        status_id: UUID | None = None,
        priority: str | None = None,
        assignee_id: UUID | None = None,
        search: str | None = None,
        skip: int = 0,
        limit: int = 50,
    ) -> list[Task]:
        query = select(Task).where(Task.board_id == board_id)

        if status_id is not None:
            query = query.where(Task.status_id == status_id)
        if priority is not None:
            query = query.where(Task.priority == priority)
        if assignee_id is not None:
            query = query.where(Task.assignee_id == assignee_id)
        if search:
            pattern = f"%{search}%"
            query = query.where(
                or_(
                    Task.title.ilike(pattern),
                    Task.description.ilike(pattern),
                )
            )

        query = (
            query.options(*_task_load_options)
            .order_by(Task.position)
            .offset(skip)
            .limit(limit)
        )
        result = await db.execute(query)
        return list(result.unique().scalars().all())

    async def get_max_position(
        self, db: AsyncSession, status_id: UUID
    ) -> float:
        result = await db.execute(
            select(func.coalesce(func.max(Task.position), 0.0)).where(
                Task.status_id == status_id
            )
        )
        return result.scalar_one()

    async def get_children(
        self, db: AsyncSession, parent_id: UUID
    ) -> list[Task]:
        result = await db.execute(
            select(Task).where(Task.parent_id == parent_id)
        )
        return list(result.scalars().all())

    async def bulk_update(
        self,
        db: AsyncSession,
        task_ids: list[UUID],
        updates: dict[str, Any],
    ) -> list[Task]:
        result = await db.execute(
            select(Task).where(Task.id.in_(task_ids))
        )
        tasks = list(result.scalars().all())
        for task in tasks:
            for field, value in updates.items():
                if hasattr(task, field):
                    setattr(task, field, value)
            db.add(task)
        await db.flush()
        return tasks

    async def count_by_status(
        self, db: AsyncSession, project_id: UUID
    ) -> dict[UUID, int]:
        result = await db.execute(
            select(Task.status_id, func.count(Task.id))
            .where(Task.project_id == project_id)
            .group_by(Task.status_id)
        )
        return dict(result.all())

    async def count_by_priority(
        self, db: AsyncSession, project_id: UUID
    ) -> dict[str, int]:
        result = await db.execute(
            select(Task.priority, func.count(Task.id))
            .where(Task.project_id == project_id)
            .group_by(Task.priority)
        )
        return dict(result.all())


crud_task = CRUDTask(Task)
