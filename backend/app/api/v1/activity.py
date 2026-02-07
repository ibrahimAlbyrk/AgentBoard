from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import check_project_access
from app.core.database import get_db
from app.crud import crud_activity_log
from app.models.project import Project
from app.schemas.activity_log import ActivityLogResponse
from app.schemas.base import PaginatedResponse, PaginationMeta

router = APIRouter(
    prefix="/projects/{project_id}/activity", tags=["Activity"]
)


@router.get("/", response_model=PaginatedResponse[ActivityLogResponse])
async def list_activity(
    action: str | None = Query(None),
    entity_type: str | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    project: Project = Depends(check_project_access),
):
    skip = (page - 1) * per_page
    logs = await crud_activity_log.get_multi_by_project(
        db, project.id, action=action, entity_type=entity_type, skip=skip, limit=per_page
    )
    total = await crud_activity_log.count(db, filters={"project_id": project.id})
    return PaginatedResponse(
        data=[ActivityLogResponse.model_validate(l) for l in logs],
        pagination=PaginationMeta(
            page=page,
            per_page=per_page,
            total=total,
            total_pages=(total + per_page - 1) // per_page if total else 0,
        ),
    )


@router.get("/tasks/{task_id}", response_model=PaginatedResponse[ActivityLogResponse])
async def task_activity(
    task_id: UUID,
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    project: Project = Depends(check_project_access),
):
    skip = (page - 1) * per_page
    logs = await crud_activity_log.get_multi_by_task(db, task_id)
    paginated = logs[skip : skip + per_page]
    return PaginatedResponse(
        data=[ActivityLogResponse.model_validate(l) for l in paginated],
        pagination=PaginationMeta(
            page=page,
            per_page=per_page,
            total=len(logs),
            total_pages=(len(logs) + per_page - 1) // per_page if logs else 0,
        ),
    )
