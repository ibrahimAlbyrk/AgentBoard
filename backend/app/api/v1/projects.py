from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import check_project_access, get_current_user
from app.core.database import get_db
from app.crud import crud_project
from app.models.project import Project
from app.models.user import User
from app.schemas.base import PaginatedResponse, PaginationMeta, ResponseBase
from app.schemas.project import (
    ProjectCreate,
    ProjectDetailResponse,
    ProjectResponse,
    ProjectUpdate,
)
from app.services.project_service import ProjectService

router = APIRouter(prefix="/projects", tags=["Projects"])


@router.get("/", response_model=PaginatedResponse[ProjectResponse])
async def list_projects(
    include_archived: bool = Query(False),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    skip = (page - 1) * per_page
    projects = await crud_project.get_multi_by_user(
        db, current_user.id, include_archived=include_archived
    )
    total = len(projects)
    page_data = projects[skip : skip + per_page]
    return PaginatedResponse(
        data=[ProjectResponse.model_validate(p) for p in page_data],
        pagination=PaginationMeta(
            page=page,
            per_page=per_page,
            total=total,
            total_pages=(total + per_page - 1) // per_page if total else 0,
        ),
    )


@router.post("/", response_model=ResponseBase[ProjectDetailResponse], status_code=201)
async def create_project(
    project_in: ProjectCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = await ProjectService.create_project(db, current_user.id, project_in)
    return ResponseBase(data=ProjectDetailResponse.model_validate(project))


@router.get("/{project_id}", response_model=ResponseBase[ProjectDetailResponse])
async def get_project(
    project: Project = Depends(check_project_access),
):
    return ResponseBase(data=ProjectDetailResponse.model_validate(project))


@router.patch("/{project_id}", response_model=ResponseBase[ProjectResponse])
async def update_project(
    project_in: ProjectUpdate,
    db: AsyncSession = Depends(get_db),
    project: Project = Depends(check_project_access),
):
    updated = await crud_project.update(db, db_obj=project, obj_in=project_in)
    return ResponseBase(data=ProjectResponse.model_validate(updated))


@router.delete("/{project_id}", status_code=204)
async def delete_project(
    db: AsyncSession = Depends(get_db),
    project: Project = Depends(check_project_access),
):
    await crud_project.remove(db, id=project.id)


@router.post("/{project_id}/archive", response_model=ResponseBase[ProjectResponse])
async def archive_project(
    db: AsyncSession = Depends(get_db),
    project: Project = Depends(check_project_access),
):
    updated = await crud_project.update(db, db_obj=project, obj_in={"is_archived": True})
    return ResponseBase(data=ProjectResponse.model_validate(updated))


@router.post("/{project_id}/unarchive", response_model=ResponseBase[ProjectResponse])
async def unarchive_project(
    db: AsyncSession = Depends(get_db),
    project: Project = Depends(check_project_access),
):
    updated = await crud_project.update(db, db_obj=project, obj_in={"is_archived": False})
    return ResponseBase(data=ProjectResponse.model_validate(updated))
