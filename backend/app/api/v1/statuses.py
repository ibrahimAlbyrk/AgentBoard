from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from slugify import slugify
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import check_project_access
from app.core.database import get_db
from app.crud import crud_status, crud_task
from app.models.project import Project
from app.models.status import Status
from app.schemas.base import ResponseBase
from app.schemas.status import StatusCreate, StatusReorder, StatusResponse, StatusUpdate

router = APIRouter(
    prefix="/projects/{project_id}/statuses", tags=["Statuses"]
)


@router.get("/", response_model=ResponseBase[list[StatusResponse]])
async def list_statuses(
    db: AsyncSession = Depends(get_db),
    project: Project = Depends(check_project_access),
):
    statuses = await crud_status.get_multi_by_project(db, project.id)
    return ResponseBase(
        data=[StatusResponse.model_validate(s) for s in statuses]
    )


@router.post("/", response_model=ResponseBase[StatusResponse], status_code=201)
async def create_status(
    status_in: StatusCreate,
    db: AsyncSession = Depends(get_db),
    project: Project = Depends(check_project_access),
):
    position = status_in.position
    if position is None:
        position = await crud_status.get_max_position(db, project.id) + 1

    new_status = Status(
        project_id=project.id,
        name=status_in.name,
        slug=slugify(status_in.name),
        color=status_in.color,
        position=position,
        is_default=status_in.is_default,
        is_terminal=status_in.is_terminal,
    )
    db.add(new_status)
    await db.flush()
    await db.refresh(new_status)
    return ResponseBase(data=StatusResponse.model_validate(new_status))


@router.patch("/{status_id}", response_model=ResponseBase[StatusResponse])
async def update_status(
    status_id: UUID,
    status_in: StatusUpdate,
    db: AsyncSession = Depends(get_db),
    project: Project = Depends(check_project_access),
):
    s = await crud_status.get(db, status_id)
    if not s or s.project_id != project.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Status not found"
        )
    updated = await crud_status.update(db, db_obj=s, obj_in=status_in)
    return ResponseBase(data=StatusResponse.model_validate(updated))


@router.delete("/{status_id}", status_code=204)
async def delete_status(
    status_id: UUID,
    move_tasks_to: UUID | None = Query(None),
    db: AsyncSession = Depends(get_db),
    project: Project = Depends(check_project_access),
):
    s = await crud_status.get(db, status_id)
    if not s or s.project_id != project.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Status not found"
        )
    if move_tasks_to:
        from sqlalchemy import update as sql_update
        from app.models.task import Task

        await db.execute(
            sql_update(Task)
            .where(Task.status_id == status_id)
            .values(status_id=move_tasks_to)
        )
        await db.flush()
    await crud_status.remove(db, id=status_id)


@router.post("/reorder", response_model=ResponseBase[list[StatusResponse]])
async def reorder_statuses(
    body: StatusReorder,
    db: AsyncSession = Depends(get_db),
    project: Project = Depends(check_project_access),
):
    for i, sid in enumerate(body.status_ids):
        s = await crud_status.get(db, sid)
        if s and s.project_id == project.id:
            s.position = i
            db.add(s)
    await db.flush()
    statuses = await crud_status.get_multi_by_project(db, project.id)
    return ResponseBase(
        data=[StatusResponse.model_validate(s) for s in statuses]
    )
