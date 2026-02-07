from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import check_project_access, get_current_user
from app.core.database import get_db
from app.crud import crud_task
from app.models.project import Project
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
from app.services.task_service import TaskService

router = APIRouter(
    prefix="/projects/{project_id}/tasks", tags=["Tasks"]
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
    project: Project = Depends(check_project_access),
):
    skip = (page - 1) * per_page
    tasks = await crud_task.get_multi_by_project(
        db,
        project.id,
        status_id=status_id,
        priority=priority,
        assignee_id=assignee_id,
        search=search,
        skip=skip,
        limit=per_page,
    )
    total = await crud_task.count(db, filters={"project_id": project.id})
    return PaginatedResponse(
        data=[TaskResponse.model_validate(t) for t in tasks],
        pagination=PaginationMeta(
            page=page,
            per_page=per_page,
            total=total,
            total_pages=(total + per_page - 1) // per_page if total else 0,
        ),
    )


@router.post("/", response_model=ResponseBase[TaskResponse], status_code=201)
async def create_task(
    task_in: TaskCreate,
    db: AsyncSession = Depends(get_db),
    project: Project = Depends(check_project_access),
    current_user: User = Depends(get_current_user),
):
    task = await TaskService.create_task(db, project.id, current_user.id, task_in)
    return ResponseBase(data=TaskResponse.model_validate(task))


@router.get("/{task_id}", response_model=ResponseBase[TaskResponse])
async def get_task(
    task_id: UUID,
    db: AsyncSession = Depends(get_db),
    project: Project = Depends(check_project_access),
):
    task = await crud_task.get_with_relations(db, task_id)
    if not task or task.project_id != project.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Task not found"
        )
    return ResponseBase(data=TaskResponse.model_validate(task))


@router.patch("/{task_id}", response_model=ResponseBase[TaskResponse])
async def update_task(
    task_id: UUID,
    task_in: TaskUpdate,
    db: AsyncSession = Depends(get_db),
    project: Project = Depends(check_project_access),
    current_user: User = Depends(get_current_user),
):
    task = await crud_task.get_with_relations(db, task_id)
    if not task or task.project_id != project.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Task not found"
        )
    updated = await TaskService.update_task(db, task, current_user.id, task_in)
    return ResponseBase(data=TaskResponse.model_validate(updated))


@router.delete("/{task_id}", status_code=204)
async def delete_task(
    task_id: UUID,
    db: AsyncSession = Depends(get_db),
    project: Project = Depends(check_project_access),
):
    task = await crud_task.get(db, task_id)
    if not task or task.project_id != project.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Task not found"
        )
    await crud_task.remove(db, id=task_id)


@router.post("/{task_id}/move", response_model=ResponseBase[TaskResponse])
async def move_task(
    task_id: UUID,
    body: TaskMove,
    db: AsyncSession = Depends(get_db),
    project: Project = Depends(check_project_access),
    current_user: User = Depends(get_current_user),
):
    task = await crud_task.get_with_relations(db, task_id)
    if not task or task.project_id != project.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Task not found"
        )
    moved = await TaskService.move_task(
        db, task, current_user.id, body.status_id, body.position
    )
    return ResponseBase(data=TaskResponse.model_validate(moved))


@router.post("/bulk-update", response_model=ResponseBase[list[TaskResponse]])
async def bulk_update_tasks(
    body: BulkTaskUpdate,
    db: AsyncSession = Depends(get_db),
    project: Project = Depends(check_project_access),
    current_user: User = Depends(get_current_user),
):
    tasks = await TaskService.bulk_update(
        db, project.id, current_user.id, body.task_ids, body.updates
    )
    return ResponseBase(data=[TaskResponse.model_validate(t) for t in tasks])


@router.post("/bulk-move", response_model=ResponseBase[list[TaskResponse]])
async def bulk_move_tasks(
    body: BulkTaskMove,
    db: AsyncSession = Depends(get_db),
    project: Project = Depends(check_project_access),
    current_user: User = Depends(get_current_user),
):
    tasks = await TaskService.bulk_move(
        db, project.id, current_user.id, body.task_ids, body.status_id
    )
    return ResponseBase(data=[TaskResponse.model_validate(t) for t in tasks])


@router.post("/bulk-delete", status_code=204)
async def bulk_delete_tasks(
    body: BulkTaskDelete,
    db: AsyncSession = Depends(get_db),
    project: Project = Depends(check_project_access),
):
    for task_id in body.task_ids:
        task = await crud_task.get(db, task_id)
        if task and task.project_id == project.id:
            await crud_task.remove(db, id=task_id)
