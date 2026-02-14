from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import Actor, check_board_access, get_current_actor, get_current_user
from app.core.errors import NotFoundError
from app.core.database import get_db
from app.crud import crud_activity_log, crud_reaction, crud_task
from app.models.board import Board
from app.models.user import User
from app.schemas.base import PaginatedResponse, PaginationMeta, ResponseBase
from app.schemas.task import (
    BulkTaskDelete,
    BulkTaskMove,
    BulkTaskUpdate,
    ConvertToSubtask,
    SubtaskReorder,
    TaskCreate,
    TaskMove,
    TaskResponse,
    TaskUpdate,
)
from app.services.notification_service import NotificationService
from app.services.reaction_service import ReactionService
from app.services.task_service import TaskService
from app.services.websocket_manager import manager

router = APIRouter(
    prefix="/projects/{project_id}/boards/{board_id}/tasks", tags=["Tasks"]
)


@router.get("/", response_model=PaginatedResponse[TaskResponse])
async def list_tasks(
    status_id: UUID | None = Query(None),
    priority: str | None = Query(None),
    assignee_id: UUID | None = Query(None),
    search: str | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    board: Board = Depends(check_board_access),
    current_user: User = Depends(get_current_user),
):
    skip = (page - 1) * per_page
    tasks = await crud_task.get_multi_by_board(
        db,
        board.id,
        status_id=status_id,
        priority=priority,
        assignee_id=assignee_id,
        search=search,
        skip=skip,
        limit=per_page,
    )
    total = await crud_task.count(db, filters={"board_id": board.id})

    task_ids = [t.id for t in tasks]
    reaction_summaries = await crud_reaction.get_summaries_batch(
        db, "task", task_ids, current_user_id=current_user.id
    )
    responses = []
    for t in tasks:
        resp = TaskResponse.model_validate(t)
        resp.reactions = reaction_summaries.get(t.id)
        responses.append(resp)

    return PaginatedResponse(
        data=responses,
        pagination=PaginationMeta(
            page=page,
            per_page=per_page,
            total=total,
            total_pages=(total + per_page - 1) // per_page if total else 0,
        ),
    )


def _collect_assignee_user_ids(response: TaskResponse) -> set[str]:
    """Extract user IDs from assignees for WS notification."""
    return {str(a.user.id) for a in response.assignees if a.user}


@router.post("/", response_model=ResponseBase[TaskResponse], status_code=201)
async def create_task(
    task_in: TaskCreate,
    db: AsyncSession = Depends(get_db),
    board: Board = Depends(check_board_access),
    actor: Actor = Depends(get_current_actor),
):
    agent_creator_id = actor.agent.id if actor.is_agent else None
    task = await TaskService.create_task(
        db, board.project_id, board.id, actor.user.id, task_in,
        agent_creator_id=agent_creator_id,
    )
    response = TaskResponse.model_validate(task)
    ws_user = {"id": str(actor.user.id), "username": actor.user.username}
    if actor.is_agent:
        ws_user["agent"] = {"id": str(actor.agent.id), "name": actor.agent.name}
    await manager.broadcast_to_board(str(board.project_id), str(board.id), {
        "type": "task.created",
        "project_id": str(board.project_id),
        "board_id": str(board.id),
        "data": response.model_dump(mode="json"),
        "user": ws_user,
    })
    notified: set[str] = set()
    for uid in _collect_assignee_user_ids(response):
        notified.add(uid)
        await manager.broadcast_to_user(uid, {"type": "notification.new"})
    for w in response.watchers:
        if w.user and str(w.user.id) not in notified:
            notified.add(str(w.user.id))
            await manager.broadcast_to_user(str(w.user.id), {"type": "notification.new"})
    await NotificationService.fire_webhooks(
        db, board.project_id, "task.created",
        {"task_id": str(task.id), "title": task.title, "board_id": str(board.id)},
    )
    return ResponseBase(data=response)


@router.get("/{task_id}", response_model=ResponseBase[TaskResponse])
async def get_task(
    task_id: UUID,
    db: AsyncSession = Depends(get_db),
    board: Board = Depends(check_board_access),
    current_user: User = Depends(get_current_user),
):
    task = await crud_task.get_with_relations(db, task_id)
    if not task or task.board_id != board.id:
        raise NotFoundError("Task not found")
    resp = TaskResponse.model_validate(task)
    resp.reactions = await crud_reaction.get_summary(
        db, "task", task_id, current_user_id=current_user.id
    )
    return ResponseBase(data=resp)


@router.patch("/{task_id}", response_model=ResponseBase[TaskResponse])
async def update_task(
    task_id: UUID,
    task_in: TaskUpdate,
    db: AsyncSession = Depends(get_db),
    board: Board = Depends(check_board_access),
    actor: Actor = Depends(get_current_actor),
):
    task = await crud_task.get_with_relations(db, task_id)
    if not task or task.board_id != board.id:
        raise NotFoundError("Task not found")
    updated = await TaskService.update_task(db, task, actor.user.id, task_in)
    response = TaskResponse.model_validate(updated)
    ws_user = {"id": str(actor.user.id), "username": actor.user.username}
    if actor.is_agent:
        ws_user["agent"] = {"id": str(actor.agent.id), "name": actor.agent.name}
    await manager.broadcast_to_board(str(board.project_id), str(board.id), {
        "type": "task.updated",
        "project_id": str(board.project_id),
        "board_id": str(board.id),
        "data": response.model_dump(mode="json"),
        "user": ws_user,
    })
    notified: set[str] = set()
    for uid in _collect_assignee_user_ids(response):
        notified.add(uid)
        await manager.broadcast_to_user(uid, {"type": "notification.new"})
    for w in response.watchers:
        if w.user and str(w.user.id) not in notified:
            notified.add(str(w.user.id))
            await manager.broadcast_to_user(str(w.user.id), {"type": "notification.new"})
    await NotificationService.fire_webhooks(
        db, board.project_id, "task.updated",
        {"task_id": str(task_id), "title": updated.title, "board_id": str(board.id)},
    )
    return ResponseBase(data=response)


@router.delete("/{task_id}", status_code=204)
async def delete_task(
    task_id: UUID,
    mode: str = Query("orphan", pattern="^(cascade|orphan)$"),
    db: AsyncSession = Depends(get_db),
    board: Board = Depends(check_board_access),
    current_user: User = Depends(get_current_user),
):
    task = await crud_task.get_with_relations(db, task_id)
    if not task or task.board_id != board.id:
        raise NotFoundError("Task not found")

    children_count = len(task.children) if hasattr(task, "children") else 0

    result = await TaskService.delete_task_with_strategy(db, task, current_user.id, mode)

    await manager.broadcast_to_board(str(board.project_id), str(board.id), {
        "type": "task.deleted",
        "project_id": str(board.project_id),
        "board_id": str(board.id),
        "data": {"task_id": str(task_id), "mode": mode, "children_count": children_count},
    })
    for uid_str in result.get("notified_uids", []):
        await manager.broadcast_to_user(uid_str, {"type": "notification.new"})
    await NotificationService.fire_webhooks(
        db, board.project_id, "task.deleted",
        {"task_id": str(task_id), "mode": mode},
    )


@router.post("/{task_id}/move", response_model=ResponseBase[TaskResponse])
async def move_task(
    task_id: UUID,
    body: TaskMove,
    db: AsyncSession = Depends(get_db),
    board: Board = Depends(check_board_access),
    actor: Actor = Depends(get_current_actor),
):
    task = await crud_task.get_with_relations(db, task_id)
    if not task or task.board_id != board.id:
        raise NotFoundError("Task not found")
    moved = await TaskService.move_task(
        db, task, actor.user.id, body.status_id, body.position
    )
    response = TaskResponse.model_validate(moved)
    ws_user = {"id": str(actor.user.id), "username": actor.user.username}
    if actor.is_agent:
        ws_user["agent"] = {"id": str(actor.agent.id), "name": actor.agent.name}
    await manager.broadcast_to_board(str(board.project_id), str(board.id), {
        "type": "task.moved",
        "project_id": str(board.project_id),
        "board_id": str(board.id),
        "data": response.model_dump(mode="json"),
        "user": ws_user,
    })
    notified: set[str] = set()
    for uid in _collect_assignee_user_ids(response):
        notified.add(uid)
        await manager.broadcast_to_user(uid, {"type": "notification.new"})
    for w in response.watchers:
        if w.user and str(w.user.id) not in notified:
            notified.add(str(w.user.id))
            await manager.broadcast_to_user(str(w.user.id), {"type": "notification.new"})
    await NotificationService.fire_webhooks(
        db, board.project_id, "task.moved",
        {"task_id": str(task_id), "title": moved.title, "status_id": str(body.status_id)},
    )
    return ResponseBase(data=response)


@router.post("/bulk-update", response_model=ResponseBase[list[TaskResponse]])
async def bulk_update_tasks(
    body: BulkTaskUpdate,
    db: AsyncSession = Depends(get_db),
    board: Board = Depends(check_board_access),
    current_user: User = Depends(get_current_user),
):
    tasks = await TaskService.bulk_update(
        db, board.project_id, current_user.id, body.task_ids, body.updates
    )
    responses = [TaskResponse.model_validate(t) for t in tasks]
    notified_users: set[str] = set()
    for r in responses:
        await manager.broadcast_to_board(str(board.project_id), str(board.id), {
            "type": "task.updated",
            "project_id": str(board.project_id),
            "board_id": str(board.id),
            "data": r.model_dump(mode="json"),
            "user": {"id": str(current_user.id), "username": current_user.username},
        })
        updater_name = current_user.full_name or current_user.username
        for a in r.assignees:
            if a.user and a.user.id != current_user.id:
                uid = str(a.user.id)
                notif = await NotificationService.create_notification(
                    db,
                    user_id=a.user.id,
                    actor_id=current_user.id,
                    project_id=board.project_id,
                    type="task_updated",
                    title="Task Updated",
                    message=f'{updater_name} updated "{r.title}"',
                    data={"task_id": str(r.id), "board_id": str(board.id)},
                )
                if notif and uid not in notified_users:
                    notified_users.add(uid)
                    await manager.broadcast_to_user(uid, {"type": "notification.new"})
        for w in r.watchers:
            if w.user and str(w.user.id) not in notified_users and w.user.id != current_user.id:
                uid = str(w.user.id)
                notif = await NotificationService.create_notification(
                    db,
                    user_id=w.user.id,
                    actor_id=current_user.id,
                    project_id=board.project_id,
                    type="task_updated",
                    title="Watching: Task Updated",
                    message=f'{updater_name} updated "{r.title}"',
                    data={"task_id": str(r.id), "board_id": str(board.id)},
                )
                if notif and uid not in notified_users:
                    notified_users.add(uid)
                    await manager.broadcast_to_user(uid, {"type": "notification.new"})
    return ResponseBase(data=responses)


@router.post("/bulk-move", response_model=ResponseBase[list[TaskResponse]])
async def bulk_move_tasks(
    body: BulkTaskMove,
    db: AsyncSession = Depends(get_db),
    board: Board = Depends(check_board_access),
    current_user: User = Depends(get_current_user),
):
    tasks = await TaskService.bulk_move(
        db, board.project_id, current_user.id, body.task_ids, body.status_id
    )
    responses = [TaskResponse.model_validate(t) for t in tasks]
    notified_users: set[str] = set()
    for r in responses:
        await manager.broadcast_to_board(str(board.project_id), str(board.id), {
            "type": "task.moved",
            "project_id": str(board.project_id),
            "board_id": str(board.id),
            "data": r.model_dump(mode="json"),
            "user": {"id": str(current_user.id), "username": current_user.username},
        })
        mover_name = current_user.full_name or current_user.username
        for a in r.assignees:
            if a.user and a.user.id != current_user.id:
                uid = str(a.user.id)
                notif = await NotificationService.create_notification(
                    db,
                    user_id=a.user.id,
                    actor_id=current_user.id,
                    project_id=board.project_id,
                    type="task_moved",
                    title="Task Moved",
                    message=f'{mover_name} moved "{r.title}"',
                    data={"task_id": str(r.id), "board_id": str(board.id)},
                )
                if notif and uid not in notified_users:
                    notified_users.add(uid)
                    await manager.broadcast_to_user(uid, {"type": "notification.new"})
        for w in r.watchers:
            if w.user and str(w.user.id) not in notified_users and w.user.id != current_user.id:
                uid = str(w.user.id)
                notif = await NotificationService.create_notification(
                    db,
                    user_id=w.user.id,
                    actor_id=current_user.id,
                    project_id=board.project_id,
                    type="task_moved",
                    title="Watching: Task Moved",
                    message=f'{mover_name} moved "{r.title}"',
                    data={"task_id": str(r.id), "board_id": str(board.id)},
                )
                if notif and uid not in notified_users:
                    notified_users.add(uid)
                    await manager.broadcast_to_user(uid, {"type": "notification.new"})
    return ResponseBase(data=responses)


@router.post("/bulk-delete", status_code=204)
async def bulk_delete_tasks(
    body: BulkTaskDelete,
    db: AsyncSession = Depends(get_db),
    board: Board = Depends(check_board_access),
    current_user: User = Depends(get_current_user),
):
    notified_users: set[str] = set()
    for task_id in body.task_ids:
        task = await crud_task.get_with_relations(db, task_id)
        if task and task.board_id == board.id:
            task_title = task.title
            assignee_user_ids = [a.user_id for a in task.assignees if a.user_id]
            watcher_user_ids = [w.user_id for w in task.watchers if w.user_id]
            await crud_activity_log.log(
                db,
                project_id=board.project_id,
                user_id=current_user.id,
                action="deleted",
                entity_type="task",
                task_id=None,
                changes={"title": task_title},
            )
            await crud_task.remove(db, id=task_id)
            await manager.broadcast_to_board(str(board.project_id), str(board.id), {
                "type": "task.deleted",
                "project_id": str(board.project_id),
                "board_id": str(board.id),
                "data": {"task_id": str(task_id)},
            })
            deleter_name = current_user.full_name or current_user.username
            for uid in assignee_user_ids:
                if uid == current_user.id:
                    continue
                uid_str = str(uid)
                notif = await NotificationService.create_notification(
                    db,
                    user_id=uid,
                    actor_id=current_user.id,
                    project_id=board.project_id,
                    type="task_deleted",
                    title="Task Deleted",
                    message=f'{deleter_name} deleted "{task_title}"',
                    data={"task_id": str(task_id)},
                )
                if notif and uid_str not in notified_users:
                    notified_users.add(uid_str)
                    await manager.broadcast_to_user(uid_str, {"type": "notification.new"})
            for wuid in watcher_user_ids:
                if wuid == current_user.id:
                    continue
                wuid_str = str(wuid)
                if wuid_str in notified_users:
                    continue
                notif = await NotificationService.create_notification(
                    db,
                    user_id=wuid,
                    actor_id=current_user.id,
                    project_id=board.project_id,
                    type="task_deleted",
                    title="Watching: Task Deleted",
                    message=f'{deleter_name} deleted "{task_title}"',
                    data={"task_id": str(task_id)},
                )
                if notif and wuid_str not in notified_users:
                    notified_users.add(wuid_str)
                    await manager.broadcast_to_user(wuid_str, {"type": "notification.new"})


# ── Subtask endpoints ──────────────────────────────────────────────


@router.get("/{task_id}/subtasks", response_model=ResponseBase[list[TaskResponse]])
async def list_subtasks(
    task_id: UUID,
    db: AsyncSession = Depends(get_db),
    board: Board = Depends(check_board_access),
    current_user: User = Depends(get_current_user),
):
    task = await crud_task.get(db, task_id)
    if not task or task.board_id != board.id:
        raise NotFoundError("Task not found")
    children = await crud_task.get_children_with_relations(db, task_id)

    task_ids = [c.id for c in children]
    reaction_summaries = await crud_reaction.get_summaries_batch(
        db, "task", task_ids, current_user_id=current_user.id
    )
    responses = []
    for c in children:
        resp = TaskResponse.model_validate(c)
        resp.reactions = reaction_summaries.get(c.id)
        responses.append(resp)
    return ResponseBase(data=responses)


@router.post("/{task_id}/subtasks", response_model=ResponseBase[TaskResponse], status_code=201)
async def create_subtask(
    task_id: UUID,
    task_in: TaskCreate,
    db: AsyncSession = Depends(get_db),
    board: Board = Depends(check_board_access),
    actor: Actor = Depends(get_current_actor),
):
    parent = await crud_task.get(db, task_id)
    if not parent or parent.board_id != board.id:
        raise NotFoundError("Parent task not found")

    task_in.parent_id = task_id
    agent_creator_id = actor.agent.id if actor.is_agent else None
    task = await TaskService.create_task(
        db, board.project_id, board.id, actor.user.id, task_in,
        agent_creator_id=agent_creator_id,
    )
    response = TaskResponse.model_validate(task)
    ws_user = {"id": str(actor.user.id), "username": actor.user.username}
    if actor.is_agent:
        ws_user["agent"] = {"id": str(actor.agent.id), "name": actor.agent.name}
    await manager.broadcast_to_board(str(board.project_id), str(board.id), {
        "type": "subtask.created",
        "project_id": str(board.project_id),
        "board_id": str(board.id),
        "data": {**response.model_dump(mode="json"), "parent_id": str(task_id)},
        "user": ws_user,
    })
    # WS broadcast for parent task stakeholders (notifications created in service)
    parent_rels = await crud_task.get_with_relations(db, task_id)
    if parent_rels:
        notified: set[str] = set()
        for a in parent_rels.assignees:
            if a.user_id and a.user_id != actor.user.id:
                notified.add(str(a.user_id))
                await manager.broadcast_to_user(str(a.user_id), {"type": "notification.new"})
        for w in parent_rels.watchers:
            if w.user_id and str(w.user_id) not in notified and w.user_id != actor.user.id:
                await manager.broadcast_to_user(str(w.user_id), {"type": "notification.new"})
    return ResponseBase(data=response)


@router.patch("/{task_id}/subtasks/reorder", response_model=ResponseBase[TaskResponse])
async def reorder_subtask(
    task_id: UUID,
    body: SubtaskReorder,
    db: AsyncSession = Depends(get_db),
    board: Board = Depends(check_board_access),
    current_user: User = Depends(get_current_user),
):
    parent = await crud_task.get(db, task_id)
    if not parent or parent.board_id != board.id:
        raise NotFoundError("Parent task not found")

    subtask = await crud_task.get(db, body.subtask_id)
    if not subtask or subtask.parent_id != task_id:
        raise NotFoundError("Subtask not found under this parent")

    subtask.position = body.position
    db.add(subtask)
    await db.flush()

    refreshed = await crud_task.get_with_relations(db, body.subtask_id)
    response = TaskResponse.model_validate(refreshed)
    await manager.broadcast_to_board(str(board.project_id), str(board.id), {
        "type": "subtask.reordered",
        "project_id": str(board.project_id),
        "board_id": str(board.id),
        "data": {"parent_id": str(task_id), "subtask_id": str(body.subtask_id)},
    })
    return ResponseBase(data=response)


@router.post("/{task_id}/convert-to-subtask", response_model=ResponseBase[TaskResponse])
async def convert_to_subtask(
    task_id: UUID,
    body: ConvertToSubtask,
    db: AsyncSession = Depends(get_db),
    board: Board = Depends(check_board_access),
    current_user: User = Depends(get_current_user),
):
    """Convert task_id_to_convert into a subtask of task_id."""
    parent = await crud_task.get(db, task_id)
    if not parent or parent.board_id != board.id:
        raise NotFoundError("Parent task not found")

    child_task = await crud_task.get_with_relations(db, body.task_id_to_convert)
    if not child_task or child_task.board_id != board.id:
        raise NotFoundError("Task to convert not found")

    updated = await TaskService.convert_to_subtask(
        db, child_task, task_id, current_user.id
    )
    response = TaskResponse.model_validate(updated)
    await manager.broadcast_to_board(str(board.project_id), str(board.id), {
        "type": "subtask.created",
        "project_id": str(board.project_id),
        "board_id": str(board.id),
        "data": {**response.model_dump(mode="json"), "parent_id": str(task_id)},
    })
    return ResponseBase(data=response)


@router.post("/{task_id}/promote", response_model=ResponseBase[TaskResponse])
async def promote_subtask(
    task_id: UUID,
    db: AsyncSession = Depends(get_db),
    board: Board = Depends(check_board_access),
    current_user: User = Depends(get_current_user),
):
    """Promote a subtask to an independent root task."""
    task = await crud_task.get_with_relations(db, task_id)
    if not task or task.board_id != board.id:
        raise NotFoundError("Task not found")

    old_parent_id = task.parent_id
    promoted = await TaskService.promote_to_task(db, task, current_user.id)
    response = TaskResponse.model_validate(promoted)
    await manager.broadcast_to_board(str(board.project_id), str(board.id), {
        "type": "task.created",
        "project_id": str(board.project_id),
        "board_id": str(board.id),
        "data": response.model_dump(mode="json"),
    })
    if old_parent_id:
        await manager.broadcast_to_board(str(board.project_id), str(board.id), {
            "type": "subtask.deleted",
            "project_id": str(board.project_id),
            "board_id": str(board.id),
            "data": {"parent_id": str(old_parent_id), "subtask_id": str(task_id)},
        })
    return ResponseBase(data=response)
