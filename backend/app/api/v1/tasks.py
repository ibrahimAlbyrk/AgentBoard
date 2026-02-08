from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import check_board_access, get_current_user
from app.core.database import get_db
from app.crud import crud_task
from app.models.board import Board
from app.models.user import User
from app.schemas.base import PaginatedResponse, PaginationMeta, ResponseBase
from app.schemas.task import (
    BulkTaskDelete,
    BulkTaskMove,
    BulkTaskUpdate,
    TaskCreate,
    TaskMove,
    TaskResponse,
    TaskUpdate,
)
from app.services.notification_service import NotificationService
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
    return PaginatedResponse(
        data=[TaskResponse.model_validate(t) for t in tasks],
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
    current_user: User = Depends(get_current_user),
):
    task = await TaskService.create_task(
        db, board.project_id, board.id, current_user.id, task_in
    )
    response = TaskResponse.model_validate(task)
    await manager.broadcast_to_board(str(board.project_id), str(board.id), {
        "type": "task.created",
        "project_id": str(board.project_id),
        "board_id": str(board.id),
        "data": response.model_dump(mode="json"),
        "user": {"id": str(current_user.id), "username": current_user.username},
    })
    notified: set[str] = set()
    for uid in _collect_assignee_user_ids(response):
        notified.add(uid)
        await manager.broadcast_to_user(uid, {"type": "notification.new"})
    for w in response.watchers:
        if w.user and str(w.user.id) not in notified:
            notified.add(str(w.user.id))
            await manager.broadcast_to_user(str(w.user.id), {"type": "notification.new"})
    return ResponseBase(data=response)


@router.get("/{task_id}", response_model=ResponseBase[TaskResponse])
async def get_task(
    task_id: UUID,
    db: AsyncSession = Depends(get_db),
    board: Board = Depends(check_board_access),
):
    task = await crud_task.get_with_relations(db, task_id)
    if not task or task.board_id != board.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Task not found"
        )
    return ResponseBase(data=TaskResponse.model_validate(task))


@router.patch("/{task_id}", response_model=ResponseBase[TaskResponse])
async def update_task(
    task_id: UUID,
    task_in: TaskUpdate,
    db: AsyncSession = Depends(get_db),
    board: Board = Depends(check_board_access),
    current_user: User = Depends(get_current_user),
):
    task = await crud_task.get_with_relations(db, task_id)
    if not task or task.board_id != board.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Task not found"
        )
    updated = await TaskService.update_task(db, task, current_user.id, task_in)
    response = TaskResponse.model_validate(updated)
    await manager.broadcast_to_board(str(board.project_id), str(board.id), {
        "type": "task.updated",
        "project_id": str(board.project_id),
        "board_id": str(board.id),
        "data": response.model_dump(mode="json"),
        "user": {"id": str(current_user.id), "username": current_user.username},
    })
    notified: set[str] = set()
    for uid in _collect_assignee_user_ids(response):
        notified.add(uid)
        await manager.broadcast_to_user(uid, {"type": "notification.new"})
    for w in response.watchers:
        if w.user and str(w.user.id) not in notified:
            notified.add(str(w.user.id))
            await manager.broadcast_to_user(str(w.user.id), {"type": "notification.new"})
    return ResponseBase(data=response)


@router.delete("/{task_id}", status_code=204)
async def delete_task(
    task_id: UUID,
    db: AsyncSession = Depends(get_db),
    board: Board = Depends(check_board_access),
    current_user: User = Depends(get_current_user),
):
    task = await crud_task.get_with_relations(db, task_id)
    if not task or task.board_id != board.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Task not found"
        )
    task_title = task.title
    assignee_user_ids = [a.user_id for a in task.assignees if a.user_id]
    watcher_user_ids = [w.user_id for w in task.watchers if w.user_id]
    await crud_task.remove(db, id=task_id)
    await manager.broadcast_to_board(str(board.project_id), str(board.id), {
        "type": "task.deleted",
        "project_id": str(board.project_id),
        "board_id": str(board.id),
        "data": {"task_id": str(task_id)},
    })
    deleter_name = current_user.full_name or current_user.username
    notified: set[str] = set()
    for uid in assignee_user_ids:
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
        if notif:
            notified.add(str(uid))
            await manager.broadcast_to_user(str(uid), {"type": "notification.new"})
    for wuid in watcher_user_ids:
        if str(wuid) in notified:
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
        if notif:
            notified.add(str(wuid))
            await manager.broadcast_to_user(str(wuid), {"type": "notification.new"})


@router.post("/{task_id}/move", response_model=ResponseBase[TaskResponse])
async def move_task(
    task_id: UUID,
    body: TaskMove,
    db: AsyncSession = Depends(get_db),
    board: Board = Depends(check_board_access),
    current_user: User = Depends(get_current_user),
):
    task = await crud_task.get_with_relations(db, task_id)
    if not task or task.board_id != board.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Task not found"
        )
    moved = await TaskService.move_task(
        db, task, current_user.id, body.status_id, body.position
    )
    response = TaskResponse.model_validate(moved)
    await manager.broadcast_to_board(str(board.project_id), str(board.id), {
        "type": "task.moved",
        "project_id": str(board.project_id),
        "board_id": str(board.id),
        "data": response.model_dump(mode="json"),
        "user": {"id": str(current_user.id), "username": current_user.username},
    })
    notified: set[str] = set()
    for uid in _collect_assignee_user_ids(response):
        notified.add(uid)
        await manager.broadcast_to_user(uid, {"type": "notification.new"})
    for w in response.watchers:
        if w.user and str(w.user.id) not in notified:
            notified.add(str(w.user.id))
            await manager.broadcast_to_user(str(w.user.id), {"type": "notification.new"})
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
            if a.user:
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
            if a.user:
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
            await crud_task.remove(db, id=task_id)
            await manager.broadcast_to_board(str(board.project_id), str(board.id), {
                "type": "task.deleted",
                "project_id": str(board.project_id),
                "board_id": str(board.id),
                "data": {"task_id": str(task_id)},
            })
            deleter_name = current_user.full_name or current_user.username
            for uid in assignee_user_ids:
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
