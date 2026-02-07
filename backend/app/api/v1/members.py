from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import check_project_access, get_current_user
from app.core.database import get_db
from app.crud import crud_project_member
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.user import User
from app.schemas.base import ResponseBase
from app.schemas.project_member import (
    ProjectMemberCreate,
    ProjectMemberResponse,
    ProjectMemberUpdate,
)

router = APIRouter(
    prefix="/projects/{project_id}/members", tags=["Members"]
)


@router.get("/", response_model=ResponseBase[list[ProjectMemberResponse]])
async def list_members(
    db: AsyncSession = Depends(get_db),
    project: Project = Depends(check_project_access),
):
    members = await crud_project_member.get_multi_by_project(db, project.id)
    return ResponseBase(
        data=[ProjectMemberResponse.model_validate(m) for m in members]
    )


@router.post("/", response_model=ResponseBase[ProjectMemberResponse], status_code=201)
async def add_member(
    member_in: ProjectMemberCreate,
    db: AsyncSession = Depends(get_db),
    project: Project = Depends(check_project_access),
):
    existing = await crud_project_member.get_by_project_and_user(
        db, project.id, member_in.user_id
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already a member",
        )
    member = ProjectMember(
        project_id=project.id,
        user_id=member_in.user_id,
        role=member_in.role,
    )
    db.add(member)
    await db.flush()
    await db.refresh(member)
    return ResponseBase(data=ProjectMemberResponse.model_validate(member))


@router.patch("/{member_id}", response_model=ResponseBase[ProjectMemberResponse])
async def update_member(
    member_id: UUID,
    member_in: ProjectMemberUpdate,
    db: AsyncSession = Depends(get_db),
    project: Project = Depends(check_project_access),
):
    member = await crud_project_member.get(db, member_id)
    if not member or member.project_id != project.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Member not found"
        )
    updated = await crud_project_member.update(db, db_obj=member, obj_in=member_in)
    return ResponseBase(data=ProjectMemberResponse.model_validate(updated))


@router.delete("/{member_id}", status_code=204)
async def remove_member(
    member_id: UUID,
    db: AsyncSession = Depends(get_db),
    project: Project = Depends(check_project_access),
):
    member = await crud_project_member.get(db, member_id)
    if not member or member.project_id != project.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Member not found"
        )
    await crud_project_member.remove(db, id=member_id)
