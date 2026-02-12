from datetime import UTC, datetime
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import LimitExceededError
from app.crud import crud_activity_log
from app.crud.checklist import crud_checklist
from app.crud.checklist_item import crud_checklist_item
from app.models.checklist import Checklist
from app.models.checklist_item import ChecklistItem
from app.models.task import Task
from app.schemas.checklist import (
    ChecklistCreate,
    ChecklistItemCreate,
    ChecklistItemUpdate,
    ChecklistUpdate,
)


POSITION_GAP = 1024.0
MAX_CHECKLISTS_PER_TASK = 10
MAX_ITEMS_PER_CHECKLIST = 50


class ChecklistService:
    @staticmethod
    async def create_checklist(
        db: AsyncSession,
        task: Task,
        user_id: UUID,
        body: ChecklistCreate,
    ) -> Checklist:
        count = await crud_checklist.count(db, filters={"task_id": task.id})
        if count >= MAX_CHECKLISTS_PER_TASK:
            raise LimitExceededError(f"Maximum {MAX_CHECKLISTS_PER_TASK} checklists per task")

        max_pos = await crud_checklist.get_max_position(db, task.id)
        position = (max_pos or 0) + POSITION_GAP

        checklist = Checklist(
            task_id=task.id,
            title=body.title,
            position=position,
        )
        db.add(checklist)
        await db.flush()
        await db.refresh(checklist, ["items"])

        await crud_activity_log.log(
            db,
            project_id=task.project_id,
            user_id=user_id,
            action="updated",
            entity_type="task",
            task_id=task.id,
            changes={"checklist": f'added "{body.title}"'},
        )
        return checklist

    @staticmethod
    async def update_checklist(
        db: AsyncSession,
        checklist: Checklist,
        user_id: UUID,
        body: ChecklistUpdate,
    ) -> Checklist:
        if body.title is not None:
            checklist.title = body.title
        db.add(checklist)
        await db.flush()
        await db.refresh(checklist, ["items"])
        return checklist

    @staticmethod
    async def delete_checklist(
        db: AsyncSession,
        checklist: Checklist,
        user_id: UUID,
    ) -> None:
        task_id = checklist.task_id
        title = checklist.title
        await db.delete(checklist)
        await db.flush()

        from app.crud import crud_task

        task = await crud_task.get(db, task_id)
        if task:
            await crud_activity_log.log(
                db,
                project_id=task.project_id,
                user_id=user_id,
                action="updated",
                entity_type="task",
                task_id=task_id,
                changes={"checklist": f'removed "{title}"'},
            )

    @staticmethod
    async def create_item(
        db: AsyncSession,
        checklist: Checklist,
        user_id: UUID,
        body: ChecklistItemCreate,
    ) -> ChecklistItem:
        count = await crud_checklist_item.count(db, filters={"checklist_id": checklist.id})
        if count >= MAX_ITEMS_PER_CHECKLIST:
            raise LimitExceededError(f"Maximum {MAX_ITEMS_PER_CHECKLIST} items per checklist")

        max_pos = await crud_checklist_item.get_max_position(db, checklist.id)
        position = (max_pos or 0) + POSITION_GAP

        item = ChecklistItem(
            checklist_id=checklist.id,
            title=body.title,
            position=position,
            assignee_id=body.assignee_id,
            due_date=body.due_date,
        )
        db.add(item)
        await db.flush()
        await db.refresh(item, ["assignee"])
        return item

    @staticmethod
    async def update_item(
        db: AsyncSession,
        item: ChecklistItem,
        user_id: UUID,
        body: ChecklistItemUpdate,
    ) -> ChecklistItem:
        update_data = body.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            if field == "is_completed":
                item.is_completed = value
                item.completed_at = datetime.now(UTC) if value else None
            else:
                setattr(item, field, value)
        db.add(item)
        await db.flush()
        await db.refresh(item, ["assignee"])
        return item

    @staticmethod
    async def toggle_item(
        db: AsyncSession,
        item: ChecklistItem,
        user_id: UUID,
    ) -> ChecklistItem:
        item.is_completed = not item.is_completed
        item.completed_at = datetime.now(UTC) if item.is_completed else None
        db.add(item)
        await db.flush()
        await db.refresh(item, ["assignee"])
        return item
