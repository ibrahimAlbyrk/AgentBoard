import re
from datetime import UTC, datetime
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import NotFoundError, ValidationError
from app.crud import crud_activity_log, crud_agent, crud_attachment, crud_label, crud_status, crud_task, crud_user
from app.models.task import Task
from app.models.task_assignee import TaskAssignee
from app.models.task_label import TaskLabel
from app.models.task_watcher import TaskWatcher
from app.schemas.task import TaskCreate, TaskUpdate
from app.services.content_service import extract_mentions, extract_plain_text, normalize_content
from app.services.notification_service import NotificationService
from app.services.position_service import PositionService


GRADIENT_PRESETS = {
    "sunset":   "linear-gradient(135deg, #f97316, #ec4899)",
    "ocean":    "linear-gradient(135deg, #06b6d4, #3b82f6)",
    "forest":   "linear-gradient(135deg, #22c55e, #14b8a6)",
    "lavender": "linear-gradient(135deg, #a78bfa, #818cf8)",
    "rose":     "linear-gradient(135deg, #fb7185, #f472b6)",
    "ember":    "linear-gradient(135deg, #ef4444, #f97316)",
    "slate":    "linear-gradient(135deg, #64748b, #475569)",
    "midnight": "linear-gradient(135deg, #1e3a5f, #312e81)",
    "aurora":   "linear-gradient(135deg, #22d3ee, #a78bfa)",
    "golden":   "linear-gradient(135deg, #f59e0b, #eab308)",
    "storm":    "linear-gradient(135deg, #6366f1, #8b5cf6)",
    "mint":     "linear-gradient(135deg, #34d399, #6ee7b7)",
}

FIELD_LABELS = {
    "title": "title",
    "description": "description",
    "priority": "priority",
    "status_id": "status",
    "assignees": "assignees",
    "watchers": "watchers",
    "labels": "labels",
    "due_date": "due date",
    "cover": "cover",
    "custom_field": "custom field",
    "checklist": "checklist",
    "checklist_item": "checklist item",
}


def _describe_changes(changes: dict) -> str:
    parts = []
    for field, diff in changes.items():
        label = FIELD_LABELS.get(field, field)
        if field in ("assignees", "watchers"):
            if isinstance(diff, dict):
                subs = []
                for key, verb in [("added", "added"), ("removed", "removed")]:
                    items = diff.get(key, [])
                    if items:
                        names = [i["name"] if isinstance(i, dict) else str(i) for i in items]
                        subs.append(f'{verb} {", ".join(names)}')
                parts.append(f'{label}: {"; ".join(subs)}' if subs else f"{label} updated")
            else:
                parts.append(f"{label} updated")
        elif field == "labels":
            if isinstance(diff, dict):
                subs = []
                if diff.get("added"):
                    subs.append(f'added {", ".join(diff["added"])}')
                if diff.get("removed"):
                    subs.append(f'removed {", ".join(diff["removed"])}')
                parts.append(f'{label}: {"; ".join(subs)}' if subs else f"{label} updated")
            else:
                parts.append(f"{label} updated")
        elif isinstance(diff, dict) and "old" in diff and "new" in diff:
            old = diff["old"] or "none"
            new = diff["new"] or "none"
            parts.append(f"{label}: {old} → {new}")
        else:
            parts.append(f"{label} changed")
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
    async def _validate_parent(
        db: AsyncSession,
        task_id: UUID | None,
        parent_id: UUID,
        board_id: UUID,
    ) -> Task:
        """Validate parent_id for subtask operations. Returns parent task."""
        parent = await crud_task.get(db, parent_id)
        if not parent:
            raise NotFoundError("Parent task not found")
        if parent.board_id != board_id:
            raise ValidationError("Parent task must be in the same board")
        if task_id and parent_id == task_id:
            raise ValidationError("A task cannot be its own parent")
        # Check for circular reference: walk ancestors from parent
        if task_id:
            ancestors = await crud_task.get_ancestor_ids(db, parent_id)
            if task_id in ancestors:
                raise ValidationError("Circular parent-child relationship detected")
        # Depth check: ancestors of parent + 1 (this task) must be <= 10
        ancestors = await crud_task.get_ancestor_ids(db, parent_id)
        if len(ancestors) >= 10:
            raise ValidationError("Maximum nesting depth (10 levels) exceeded")
        return parent

    @staticmethod
    async def create_task(
        db: AsyncSession,
        project_id: UUID,
        board_id: UUID,
        creator_id: UUID,
        task_in: TaskCreate,
        *,
        agent_creator_id: UUID | None = None,
    ) -> Task:
        # If creating as subtask, validate parent and inherit board/project
        if task_in.parent_id:
            parent = await TaskService._validate_parent(
                db, None, task_in.parent_id, board_id
            )
            project_id = parent.project_id
            board_id = parent.board_id

        status_id = task_in.status_id
        if not status_id:
            default_status = await crud_status.get_default_by_board(db, board_id)
            if not default_status:
                raise NotFoundError("No default status found for this board")
            status_id = default_status.id
        else:
            # Validate status belongs to this board
            target_status = await crud_status.get(db, status_id)
            if not target_status or target_status.board_id != board_id:
                raise NotFoundError("Status not found in this board")

        # Position: within parent if subtask, else within status column
        if task_in.parent_id:
            position = await PositionService.get_end_position_in_parent(db, task_in.parent_id)
        else:
            position = await PositionService.get_end_position(db, status_id)

        # Validate agent IDs belong to project and are active
        if agent_creator_id:
            agent = await crud_agent.get(db, agent_creator_id)
            if not agent or agent.deleted_at or not agent.is_active:
                raise ValidationError("Invalid or inactive agent creator")
            if not await crud_agent.is_in_project(db, agent.id, project_id):
                raise ValidationError("Agent creator not in this project")
        for aid in task_in.assignee_agent_ids:
            agent = await crud_agent.get(db, aid)
            if not agent or agent.deleted_at or not agent.is_active:
                raise ValidationError("Invalid or inactive assignee agent")
            if not await crud_agent.is_in_project(db, agent.id, project_id):
                raise ValidationError("Assignee agent not in this project")

        # Normalize description to Tiptap JSON + plain text
        desc_doc = normalize_content(task_in.description) if task_in.description is not None else None
        desc_text = extract_plain_text(desc_doc) if desc_doc else None

        task = Task(
            project_id=project_id,
            board_id=board_id,
            creator_id=creator_id,
            title=task_in.title,
            description=desc_doc,
            description_text=desc_text,
            status_id=status_id,
            priority=task_in.priority,
            agent_creator_id=agent_creator_id,
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

        creation_changes: dict = {"title": task.title}
        status_obj = await crud_status.get(db, status_id)
        if status_obj:
            creation_changes["status"] = status_obj.name
        if task_in.priority and task_in.priority != "none":
            creation_changes["priority"] = task_in.priority
        if task_in.due_date:
            creation_changes["due_date"] = str(task_in.due_date)
        if task_in.parent_id:
            parent_task = await crud_task.get(db, task_in.parent_id)
            if parent_task:
                creation_changes["parent"] = parent_task.title

        await crud_activity_log.log(
            db,
            project_id=project_id,
            user_id=creator_id,
            action="created",
            entity_type="task",
            task_id=task.id,
            changes=creation_changes,
            agent_id=agent_creator_id,
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

        # Notify @mentioned users in description
        if desc_doc and task:
            user_mentions = extract_mentions(desc_doc, {"user"})
            creator = await crud_user.get(db, creator_id)
            creator_name = (creator.full_name or creator.username) if creator else "Someone"
            for m in user_mentions:
                uid = UUID(m["id"])
                if uid == creator_id:
                    continue
                await NotificationService.create_notification(
                    db,
                    user_id=uid,
                    actor_id=creator_id,
                    project_id=project_id,
                    type="mentioned",
                    title="Mentioned in Task",
                    message=f'{creator_name} mentioned you in "{task.title}"',
                    data={"task_id": str(task.id), "board_id": str(task.board_id)},
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

        # Cover validation
        if "cover_type" in update_data:
            ct = update_data.get("cover_type")
            cv = update_data.get("cover_value")
            if ct == "image" and cv:
                att = await crud_attachment.get(db, UUID(cv))
                if not att or att.task_id != task.id:
                    raise ValidationError("Invalid attachment for cover")
                if not att.mime_type.startswith("image/"):
                    raise ValidationError("Attachment is not an image")
            elif ct == "color" and cv:
                if not re.match(r"^#[0-9A-Fa-f]{6}$", cv):
                    raise ValidationError("Invalid hex color format (expected #RRGGBB)")
            elif ct == "gradient" and cv:
                if cv not in GRADIENT_PRESETS:
                    raise ValidationError("Invalid gradient preset")
            elif ct is None:
                update_data["cover_value"] = None
                update_data["cover_size"] = None

            # Track cover change for activity log
            old_cover = task.cover_type
            if ct != old_cover:
                changes["cover"] = "cover removed" if ct is None else "cover updated"

        # Track old description mentions for diff
        old_mention_ids: set[str] = set()
        newly_mentioned_ids: set[str] = set()

        # Normalize description if present in update
        if "description" in update_data:
            raw_desc = update_data.pop("description")
            old_mention_ids = {
                m["id"] for m in extract_mentions(task.description, {"user"})
            } if task.description else set()
            desc_doc = normalize_content(raw_desc)
            desc_text = extract_plain_text(desc_doc) if desc_doc else None
            if task.description != desc_doc:
                changes["description"] = "description updated"
                task.description = desc_doc
                task.description_text = desc_text
                # Compute new mentions
                new_mention_ids = {
                    m["id"] for m in extract_mentions(desc_doc, {"user"})
                } if desc_doc else set()
                newly_mentioned_ids = new_mention_ids - old_mention_ids

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
                    # Set/clear completed_at based on terminal status
                    if new_s and new_s.is_terminal:
                        task.completed_at = datetime.now(UTC)
                    elif old_s and old_s.is_terminal:
                        task.completed_at = None
                else:
                    changes[field] = {"old": str(old_value), "new": str(value)}
                setattr(task, field, value)

        if label_ids is not None:
            old_label_ids = {tl.label_id for tl in task.labels}
            new_label_set = set(label_ids)
            if old_label_ids != new_label_set:
                label_diff: dict = {"added": [], "removed": []}
                for lid in new_label_set - old_label_ids:
                    lbl = await crud_label.get(db, lid)
                    label_diff["added"].append(lbl.name if lbl else str(lid))
                for lid in old_label_ids - new_label_set:
                    tl_obj = next((tl for tl in task.labels if tl.label_id == lid), None)
                    label_diff["removed"].append(tl_obj.label.name if tl_obj and tl_obj.label else str(lid))
                changes["labels"] = label_diff
            for tl in list(task.labels):
                await db.delete(tl)
            await db.flush()
            for label_id in label_ids:
                db.add(TaskLabel(task_id=task.id, label_id=label_id))
            await db.flush()

        watchers_changed = watcher_user_ids is not None or watcher_agent_ids is not None
        if watchers_changed:
            old_wuids = {w.user_id for w in task.watchers if w.user_id}
            old_waids = {w.agent_id for w in task.watchers if w.agent_id}
            new_wuids = set(watcher_user_ids or [])
            new_waids = set(watcher_agent_ids or [])
            if old_wuids != new_wuids or old_waids != new_waids:
                watcher_diff: dict = {"added": [], "removed": []}
                for uid in new_wuids - old_wuids:
                    u = await crud_user.get(db, uid)
                    watcher_diff["added"].append({"type": "user", "name": (u.full_name or u.username) if u else str(uid)})
                for aid in new_waids - old_waids:
                    a = await crud_agent.get(db, aid)
                    watcher_diff["added"].append({"type": "agent", "name": a.name if a else str(aid)})
                for uid in old_wuids - new_wuids:
                    obj = next((w for w in task.watchers if w.user_id == uid), None)
                    name = (obj.user.full_name or obj.user.username) if obj and obj.user else str(uid)
                    watcher_diff["removed"].append({"type": "user", "name": name})
                for aid in old_waids - new_waids:
                    obj = next((w for w in task.watchers if w.agent_id == aid), None)
                    name = obj.agent.name if obj and obj.agent else str(aid)
                    watcher_diff["removed"].append({"type": "agent", "name": name})
                changes["watchers"] = watcher_diff
            await _sync_watchers(
                db, task.id,
                watcher_user_ids or [],
                watcher_agent_ids or [],
            )

        assignees_changed = assignee_user_ids is not None or assignee_agent_ids is not None
        if assignees_changed:
            # Compute diff BEFORE sync overwrites
            old_auids = {a.user_id for a in task.assignees if a.user_id}
            old_aaids = {a.agent_id for a in task.assignees if a.agent_id}
            new_auids = set(assignee_user_ids or [])
            new_aaids = set(assignee_agent_ids or [])
            # Validate agent IDs
            for aid in (assignee_agent_ids or []):
                agent = await crud_agent.get(db, aid)
                if not agent or agent.deleted_at or not agent.is_active:
                    raise ValidationError("Invalid or inactive assignee agent")
                if not await crud_agent.is_in_project(db, agent.id, task.project_id):
                    raise ValidationError("Assignee agent not in this project")
            if old_auids != new_auids or old_aaids != new_aaids:
                assignee_diff: dict = {"added": [], "removed": []}
                for uid in new_auids - old_auids:
                    u = await crud_user.get(db, uid)
                    assignee_diff["added"].append({"type": "user", "name": (u.full_name or u.username) if u else str(uid)})
                for aid in new_aaids - old_aaids:
                    a = await crud_agent.get(db, aid)
                    assignee_diff["added"].append({"type": "agent", "name": a.name if a else str(aid)})
                for uid in old_auids - new_auids:
                    obj = next((a for a in task.assignees if a.user_id == uid), None)
                    name = (obj.user.full_name or obj.user.username) if obj and obj.user else str(uid)
                    assignee_diff["removed"].append({"type": "user", "name": name})
                for aid in old_aaids - new_aaids:
                    obj = next((a for a in task.assignees if a.agent_id == aid), None)
                    name = obj.agent.name if obj and obj.agent else str(aid)
                    assignee_diff["removed"].append({"type": "agent", "name": name})
                changes["assignees"] = assignee_diff
            await _sync_assignees(
                db, task.id,
                assignee_user_ids or [],
                assignee_agent_ids or [],
            )

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

        has_changes = bool(changes)

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
                )
                await _notify_assignees(
                    db, refreshed, user_id,
                    "task_updated", "Task Updated",
                    f'{updater_name} updated "{task.title}" — {detail}',
                )

            if refreshed.watchers:
                detail = _describe_changes(changes)
                await _notify_watchers(
                    db, refreshed, user_id,
                    "task_updated", "Watching: Task Updated",
                    f'{updater_name} updated "{task.title}" — {detail}',
                )

        # Notify newly @mentioned users
        if newly_mentioned_ids:
            mention_updater = await crud_user.get(db, user_id)
            mention_updater_name = (mention_updater.full_name or mention_updater.username) if mention_updater else "Someone"
            for uid_str in newly_mentioned_ids:
                uid = UUID(uid_str)
                if uid == user_id:
                    continue
                await NotificationService.create_notification(
                    db,
                    user_id=uid,
                    actor_id=user_id,
                    project_id=task.project_id,
                    type="mentioned",
                    title="Mentioned in Task",
                    message=f'{mention_updater_name} mentioned you in "{task.title}"',
                    data={"task_id": str(task.id), "board_id": str(task.board_id)},
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
        # Proactive rebalance: check gaps before move, rebalance if needed
        position = await PositionService.ensure_gap_and_position(
            db, new_status_id, position
        )

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

        # Rebalance target status if needed before bulk insert
        await PositionService.maybe_rebalance(db, status_id)

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

    @staticmethod
    async def delete_task_with_strategy(
        db: AsyncSession,
        task: Task,
        user_id: UUID,
        mode: str = "orphan",
    ) -> dict:
        """Delete task with strategy for children.
        mode='cascade': delete all descendants
        mode='orphan': set children's parent_id to NULL
        """
        from app.services.reaction_service import ReactionService

        children = await crud_task.get_children(db, task.id)
        children_count = len(children)
        result_info = {"mode": mode, "children_count": children_count}

        if mode == "cascade" and children_count > 0:
            descendant_ids = await crud_task.get_all_descendant_ids(db, task.id)
            for did in reversed(descendant_ids):
                await ReactionService.delete_reactions_for_entity(db, "task", did)
                await crud_task.remove(db, id=did)
            result_info["descendants_deleted"] = len(descendant_ids)
        elif mode == "orphan" and children_count > 0:
            for child in children:
                child.parent_id = None
                child.position = await PositionService.get_end_position(db, child.status_id)
                db.add(child)
            await db.flush()
            result_info["children_orphaned"] = children_count

        await ReactionService.delete_reactions_for_entity(db, "task", task.id)

        changes: dict = {"title": task.title}
        if mode == "cascade" and children_count > 0:
            changes["children_deleted"] = children_count
        elif mode == "orphan" and children_count > 0:
            changes["children_orphaned"] = children_count

        await crud_activity_log.log(
            db,
            project_id=task.project_id,
            user_id=user_id,
            action="deleted",
            entity_type="task",
            task_id=None,
            changes=changes,
        )

        await crud_task.remove(db, id=task.id)
        return result_info

    @staticmethod
    async def convert_to_subtask(
        db: AsyncSession,
        task: Task,
        parent_id: UUID,
        user_id: UUID,
    ) -> Task:
        """Convert a root task into a subtask of parent_id."""
        parent = await TaskService._validate_parent(
            db, task.id, parent_id, task.board_id
        )
        old_parent_id = task.parent_id
        task.parent_id = parent_id
        task.position = await PositionService.get_end_position_in_parent(db, parent_id)
        db.add(task)
        await db.flush()

        changes: dict = {"parent": {"old": None, "new": parent.title}}
        if old_parent_id:
            old_parent = await crud_task.get(db, old_parent_id)
            changes["parent"]["old"] = old_parent.title if old_parent else str(old_parent_id)

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
        await db.commit()
        db.expunge(task)
        return await crud_task.get_with_relations(db, task_id)

    @staticmethod
    async def promote_to_task(
        db: AsyncSession,
        task: Task,
        user_id: UUID,
    ) -> Task:
        """Promote a subtask to an independent root task."""
        if not task.parent_id:
            raise ValidationError("Task is already a root task")

        old_parent = await crud_task.get(db, task.parent_id)
        old_parent_title = old_parent.title if old_parent else None

        task.parent_id = None
        task.position = await PositionService.get_end_position(db, task.status_id)
        db.add(task)
        await db.flush()

        await crud_activity_log.log(
            db,
            project_id=task.project_id,
            user_id=user_id,
            action="updated",
            entity_type="task",
            task_id=task.id,
            changes={"parent": {"old": old_parent_title, "new": None}},
        )

        task_id = task.id
        await db.commit()
        db.expunge(task)
        return await crud_task.get_with_relations(db, task_id)
