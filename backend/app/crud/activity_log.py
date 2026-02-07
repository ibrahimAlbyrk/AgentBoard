from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.activity_log import ActivityLog
from app.schemas.activity_log import ActivityLogResponse

from .base import CRUDBase


class CRUDActivityLog(CRUDBase[ActivityLog, ActivityLogResponse, ActivityLogResponse]):
    async def get_multi_by_project(
        self,
        db: AsyncSession,
        project_id: UUID,
        *,
        action: str | None = None,
        entity_type: str | None = None,
        skip: int = 0,
        limit: int = 50,
    ) -> list[ActivityLog]:
        query = select(ActivityLog).where(
            ActivityLog.project_id == project_id
        )
        if action is not None:
            query = query.where(ActivityLog.action == action)
        if entity_type is not None:
            query = query.where(ActivityLog.entity_type == entity_type)
        query = query.order_by(ActivityLog.created_at.desc()).offset(skip).limit(limit)
        result = await db.execute(query)
        return list(result.scalars().all())

    async def get_multi_by_task(
        self, db: AsyncSession, task_id: UUID
    ) -> list[ActivityLog]:
        result = await db.execute(
            select(ActivityLog)
            .where(ActivityLog.task_id == task_id)
            .order_by(ActivityLog.created_at.desc())
        )
        return list(result.scalars().all())

    async def log(
        self,
        db: AsyncSession,
        *,
        project_id: UUID,
        task_id: UUID | None,
        user_id: UUID,
        action: str,
        entity_type: str,
        changes: dict,
    ) -> ActivityLog:
        db_obj = ActivityLog(
            project_id=project_id,
            task_id=task_id,
            user_id=user_id,
            action=action,
            entity_type=entity_type,
            changes=changes,
        )
        db.add(db_obj)
        await db.flush()
        await db.refresh(db_obj)
        return db_obj


crud_activity_log = CRUDActivityLog(ActivityLog)
