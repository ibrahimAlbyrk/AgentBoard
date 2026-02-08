from datetime import UTC, datetime
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import crud_activity_log, crud_agent, crud_status, crud_task, crud_user
from app.models.task import Task
from app.models.task_assignee import TaskAssignee
from app.models.task_label import TaskLabel
from app.models.task_watcher import TaskWatcher
from app.schemas.task import TaskCreate, TaskUpdate
from app.services.notification_service import NotificationService
from app.services.position_service import PositionService


FIELD_LABELS = {
    "title": "title",
    "description": "description",
    "priority": "priority",
    "status_id": "status",
    "assignees": "assignees",
    "due_date": "due date",
}


def _describe_changes(changes: dict, label_changed: bool = False) -> str:
    parts = []
    for field, diff in changes.items():
        label = FIELD_LABELS.get(field, field)
        if isinstance(diff, dict) and "old" in diff and "new" in diff:
            old = diff["old"] or "none"
            new = diff["new"] or "none"
            parts.append(f"{label}: {old} → {new}")
        else:
            parts.append(f"{label} changed")
    if label_changed:
        parts.append("labels updated")
    return ", ".join(parts) if parts else "updated"


def _get_assignee_user_ids(task: Task) -> set[UUID]:
    return {a.user_id for a in task.assignees if a.user_id}


async def _sync_assignees(
    db: AsyncSession,
    task_id: UUID,
    user_ids: list[UUID],
    agent_ids: list[UUID],
) -> None:
    """Replace all assignees on a task with the given user/agent IDs."""
    from sqlalchemy import select

    existing = await db.execute(
        select(TaskAssignee).where(TaskAssignee.task_id == task_id)
    )
    for a in existing.scalars().all():
        await db.delete(a)
    await db.flush()

    for uid in user_ids:
        db.add(TaskAssignee(task_id=task_id, user_id=uid))
    for aid in agent_ids:
        db.add(TaskAssignee(task_id=task_id, agent_id=aid))
    if user_ids or agent_ids:
        await db.flush()


async def _sync_watchers(
    db: AsyncSession,
    task_id: UUID,
    user_ids: list[UUID],
    agent_ids: list[UUID],
) -> None:
    """Replace all watchers on a task with the given user/agent IDs."""
    from sqlalchemy import select

    existing = await db.execute(
        select(TaskWatcher).where(TaskWatcher.task_id == task_id)
    )
    for w in existing.scalars().all():
        await db.delete(w)
    await db.flush()

    for uid in user_ids:
        db.add(TaskWatcher(task_id=task_id, user_id=uid))
    for aid in agent_ids:
        db.add(TaskWatcher(task_id=task_id, agent_id=aid))
    if user_ids or agent_ids:
        await db.flush()


async def _notify_watchers(
    db: AsyncSession,
    task: Task,
    actor_id: UUID,
    notification_type: str,
    title: str,
    message: str,
) -> list[UUID]:
    """Send notifications to all user-watchers (skipping assignees to avoid dups). Returns notified user IDs."""
    assignee_uids = _get_assignee_user_ids(task)
    notified: list[UUID] = []
    for w in task.watchers:
        if not w.user_id:
            continue
        if w.user_id in assignee_uids:
            continue
        await NotificationService.create_notification(
            db,
            user_id=w.user_id,
            actor_id=actor_id,
            project_id=task.project_id,
            type=notification_type,
            title=title,
            message=message,
            data={"task_id": str(task.id), "board_id": str(task.board_id)},
        )
        notified.append(w.user_id)
    return notified


async def _notify_assignees(
    db: AsyncSession,
    task: Task,
    actor_id: UUID,
    notification_type: str,
    title: str,
    message: str,
) -> list[UUID]:
    """Notify all user-assignees. Returns notified user IDs."""
    notified: list[UUID] = []
    for a in task.assignees:
        if not a.user_id:
            continue
        await NotificationService.create_notification(
            db,
            user_id=a.user_id,
            actor_id=actor_id,
            project_id=task.project_id,
            type=notification_type,
            title=title,
            message=message,
            data={"task_id": str(task.id), "board_id": str(task.board_id)},
        )
        notified.append(a.user_id)
    return notified


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

        # Validate agent IDs belong to project and are active
        if task_in.agent_creator_id:
            agent = await crud_agent.get(db, task_in.agent_creator_id)
            if not agent or agent.project_id != project_id or not agent.is_active:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid or inactive agent_creator_id",
                )
        for aid in task_in.assignee_agent_ids:
            agent = await crud_agent.get(db, aid)
            if not agent or agent.project_id != project_id or not agent.is_active:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid or inactive assignee agent",
                )

        task = Task(
            project_id=project_id,
            board_id=board_id,
            creator_id=creator_id,
            title=task_in.title,
            description=task_in.description,
            status_id=status_id,
            priority=task_in.priority,
            agent_creator_id=task_in.agent_creator_id,
            due_date=task_in.due_date,
            parent_id=task_in.parent_id,
            position=position,
        )
        db.add(task)
        await db.flush()

        # Sync assignees
        if task_in.assignee_user_ids or task_in.assignee_agent_ids:
            await _sync_assignees(
                db, task.id, task_in.assignee_user_ids, task_in.assignee_agent_ids
            )

        for label_id in task_in.label_ids:
            db.add(TaskLabel(task_id=task.id, label_id=label_id))
        await db.flush()

        if task_in.watcher_user_ids or task_in.watcher_agent_ids:
            await _sync_watchers(
                db, task.id, task_in.watcher_user_ids, task_in.watcher_agent_ids
            )

        await crud_activity_log.log(
            db,
            project_id=project_id,
            user_id=creator_id,
            action="created",
            entity_type="task",
            task_id=task.id,
            changes={"title": task.title},
            agent_id=task_in.agent_creator_id,
        )

        # Reload to get relationships populated
        task = await crud_task.get_with_relations(db, task.id)

        if task and task.assignees:
            creator = await crud_user.get(db, creator_id)
            creator_name = (creator.full_name or creator.username) if creator else "Someone"
            await _notify_assignees(
                db, task, creator_id,
                "task_assigned", "Task Assigned",
                f'{creator_name} assigned you to "{task.title}"',
            )

        if task and task.watchers:
            creator = await crud_user.get(db, creator_id)
            creator_name = (creator.full_name or creator.username) if creator else "Someone"
            await _notify_watchers(
                db, task, creator_id,
                "task_assigned", "Watching: Task Created",
                f'{creator_name} created "{task.title}" (you\'re watching)',
            )

        return task

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
        watcher_user_ids = update_data.pop("watcher_user_ids", None)
        watcher_agent_ids = update_data.pop("watcher_agent_ids", None)
        assignee_user_ids = update_data.pop("assignee_user_ids", None)
        assignee_agent_ids = update_data.pop("assignee_agent_ids", None)

        for field, value in update_data.items():
            old_value = getattr(task, field, None)
            if old_value != value:
                if field == "status_id":
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
            await db.flush()

        watchers_changed = watcher_user_ids is not None or watcher_agent_ids is not None
        if watchers_changed:
            await _sync_watchers(
                db, task.id,
                watcher_user_ids or [],
                watcher_agent_ids or [],
            )

        assignees_changed = assignee_user_ids is not None or assignee_agent_ids is not None
        if assignees_changed:
            # Validate agent IDs
            for aid in (assignee_agent_ids or []):
                agent = await crud_agent.get(db, aid)
                if not agent or agent.project_id != task.project_id or not agent.is_active:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Invalid or inactive assignee agent",
                    )
            await _sync_assignees(
                db, task.id,
                assignee_user_ids or [],
                assignee_agent_ids or [],
            )
            changes["assignees"] = "assignees updated"

        if update_data:
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

        has_changes = bool(changes) or label_ids is not None

        # Reload to get fresh assignees/watchers
        refreshed = await crud_task.get_with_relations(db, task.id)

        if has_changes and refreshed:
            updater = await crud_user.get(db, user_id)
            updater_name = (updater.full_name or updater.username) if updater else "Someone"

            if assignees_changed and refreshed.assignees:
                await _notify_assignees(
                    db, refreshed, user_id,
                    "task_assigned", "Task Assigned",
                    f'{updater_name} assigned you to "{task.title}"',
                )
            elif refreshed.assignees:
                detail = _describe_changes(
                    {k: v for k, v in changes.items() if k != "assignees"},
                    label_ids is not None,
                )
                await _notify_assignees(
                    db, refreshed, user_id,
                    "task_updated", "Task Updated",
                    f'{updater_name} updated "{task.title}" — {detail}',
                )

            if refreshed.watchers:
                detail = _describe_changes(changes, label_ids is not None)
                await _notify_watchers(
                    db, refreshed, user_id,
                    "task_updated", "Watching: Task Updated",
                    f'{updater_name} updated "{task.title}" — {detail}',
                )

        task_id = task.id
        await db.commit()
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

        mover = await crud_user.get(db, user_id)
        mover_name = (mover.full_name or mover.username) if mover else "Someone"
        new_status_name = new_status.name if new_status else "another status"

        # Notify assignees of move
        refreshed = await crud_task.get_with_relations(db, task.id)
        if refreshed and refreshed.assignees:
            await _notify_assignees(
                db, refreshed, user_id,
                "task_moved", "Task Moved",
                f'{mover_name} moved "{task.title}" to {new_status_name}',
            )

        # Notify watchers of move
        if refreshed and refreshed.watchers:
            await _notify_watchers(
                db, refreshed, user_id,
                "task_moved", "Watching: Task Moved",
                f'{mover_name} moved "{task.title}" to {new_status_name}',
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
