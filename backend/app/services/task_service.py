from datetime import UTC, datetime
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import crud_activity_log, crud_status, crud_task, crud_user
from app.models.task import Task
from app.models.task_label import TaskLabel
from app.schemas.task import TaskCreate, TaskUpdate
from app.services.position_service import PositionService


class TaskService:
    @staticmethod
    async def create_task(
        db: AsyncSession,
        project_id: UUID,
        board_id: UUID,
        creator_id: UUID,
        task_in: TaskCreate,
    ) -> Task:
        status_id = task_in.status_id
        if not status_id:
            default_status = await crud_status.get_default_by_board(db, board_id)
            if not default_status:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No default status found for board",
                )
            status_id = default_status.id

        position = await PositionService.get_end_position(db, status_id)

        task = Task(
            project_id=project_id,
            board_id=board_id,
            creator_id=creator_id,
            title=task_in.title,
            description=task_in.description,
            status_id=status_id,
            priority=task_in.priority,
            assignee_id=task_in.assignee_id,
            due_date=task_in.due_date,
            parent_id=task_in.parent_id,
            position=position,
        )
        db.add(task)
        await db.flush()

        for label_id in task_in.label_ids:
            db.add(TaskLabel(task_id=task.id, label_id=label_id))
        await db.flush()

        await crud_activity_log.log(
            db,
            project_id=project_id,
            user_id=creator_id,
            action="created",
            entity_type="task",
            task_id=task.id,
            changes={"title": task.title},
        )

        return await crud_task.get_with_relations(db, task.id)

    @staticmethod
    async def update_task(
        db: AsyncSession,
        task: Task,
        user_id: UUID,
        task_in: TaskUpdate,
    ) -> Task:
        changes = {}
        update_data = task_in.model_dump(exclude_unset=True)
        label_ids = update_data.pop("label_ids", None)

        for field, value in update_data.items():
            old_value = getattr(task, field, None)
            if old_value != value:
                if field == "assignee_id":
                    old_name = None
                    new_name = None
                    if old_value:
                        old_user = await crud_user.get(db, old_value)
                        old_name = old_user.full_name or old_user.username if old_user else None
                    if value:
                        new_user = await crud_user.get(db, value)
                        new_name = new_user.full_name or new_user.username if new_user else None
                    changes[field] = {"old": old_name, "new": new_name}
                elif field == "status_id":
                    old_s = await crud_status.get(db, old_value) if old_value else None
                    new_s = await crud_status.get(db, value) if value else None
                    changes[field] = {
                        "old": old_s.name if old_s else None,
                        "new": new_s.name if new_s else None,
                    }
                else:
                    changes[field] = {"old": str(old_value), "new": str(value)}
                setattr(task, field, value)

        if label_ids is not None:
            for tl in list(task.labels):
                await db.delete(tl)
            await db.flush()
            for label_id in label_ids:
                db.add(TaskLabel(task_id=task.id, label_id=label_id))

        db.add(task)
        await db.flush()

        if changes:
            await crud_activity_log.log(
                db,
                project_id=task.project_id,
                user_id=user_id,
                action="updated",
                entity_type="task",
                task_id=task.id,
                changes=changes,
            )

        task_id = task.id
        await db.flush()
        db.expunge(task)
        return await crud_task.get_with_relations(db, task_id)

    @staticmethod
    async def move_task(
        db: AsyncSession,
        task: Task,
        user_id: UUID,
        new_status_id: UUID,
        position: float | None = None,
    ) -> Task:
        if position is None:
            position = await PositionService.get_end_position(db, new_status_id)

        old_status_id = task.status_id
        task.status_id = new_status_id
        task.position = position

        new_status = await crud_status.get(db, new_status_id)
        if new_status and new_status.is_terminal:
            task.completed_at = datetime.now(UTC)
        elif task.completed_at:
            old_status = await crud_status.get(db, old_status_id)
            if old_status and old_status.is_terminal:
                task.completed_at = None

        db.add(task)
        await db.flush()

        old_status = await crud_status.get(db, old_status_id)
        await crud_activity_log.log(
            db,
            project_id=task.project_id,
            user_id=user_id,
            action="moved",
            entity_type="task",
            task_id=task.id,
            changes={
                "status_id": {
                    "old": old_status.name if old_status else str(old_status_id),
                    "new": new_status.name if new_status else str(new_status_id),
                },
            },
        )

        task_id = task.id
        await db.commit()
        db.expunge(task)
        return await crud_task.get_with_relations(db, task_id)

    @staticmethod
    async def bulk_update(
        db: AsyncSession,
        project_id: UUID,
        user_id: UUID,
        task_ids: list[UUID],
        updates: dict,
    ) -> list[Task]:
        from sqlalchemy import select

        result = await db.execute(
            select(Task).where(Task.id.in_(task_ids), Task.project_id == project_id)
        )
        tasks = list(result.scalars().all())
        for task in tasks:
            for field, value in updates.items():
                if hasattr(task, field):
                    setattr(task, field, value)
            db.add(task)
            await crud_activity_log.log(
                db,
                project_id=project_id,
                user_id=user_id,
                action="updated",
                entity_type="task",
                task_id=task.id,
                changes=updates,
            )
        await db.flush()
        return tasks

    @staticmethod
    async def bulk_move(
        db: AsyncSession,
        project_id: UUID,
        user_id: UUID,
        task_ids: list[UUID],
        status_id: UUID,
    ) -> list[Task]:
        from sqlalchemy import select

        result = await db.execute(
            select(Task).where(Task.id.in_(task_ids), Task.project_id == project_id)
        )
        tasks = list(result.scalars().all())
        base_position = await PositionService.get_end_position(db, status_id)
        for i, task in enumerate(tasks):
            task.status_id = status_id
            task.position = base_position + i * PositionService.POSITION_GAP
            db.add(task)
            await crud_activity_log.log(
                db,
                project_id=project_id,
                user_id=user_id,
                action="moved",
                entity_type="task",
                task_id=task.id,
                changes={"status_id": str(status_id)},
            )
        await db.flush()
        return tasks
