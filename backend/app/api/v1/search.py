from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.task import Task
from app.models.user import User
from app.schemas.base import PaginatedResponse, PaginationMeta

router = APIRouter(prefix="/search", tags=["Search"])


@router.get("/")
async def global_search(
    q: str = Query(..., min_length=1),
    type: str | None = Query(None),
    project_id: UUID | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    skip = (page - 1) * per_page
    results = []

    if type is None or type == "project":
        query = (
            select(Project)
            .outerjoin(ProjectMember)
            .where(
                or_(
                    Project.owner_id == current_user.id,
                    ProjectMember.user_id == current_user.id,
                ),
                Project.name.ilike(f"%{q}%"),
            )
            .distinct()
            .offset(skip)
            .limit(per_page)
        )
        res = await db.execute(query)
        for p in res.scalars().all():
            results.append({"type": "project", "id": str(p.id), "title": p.name, "slug": p.slug})

    if type is None or type == "task":
        query = select(Task).where(
            Task.title.ilike(f"%{q}%"),
        )
        if project_id:
            query = query.where(Task.project_id == project_id)
        query = query.offset(skip).limit(per_page)
        res = await db.execute(query)
        for t in res.scalars().all():
            results.append({
                "type": "task",
                "id": str(t.id),
                "title": t.title,
                "project_id": str(t.project_id),
            })

    return PaginatedResponse(
        data=results,
        pagination=PaginationMeta(
            page=page,
            per_page=per_page,
            total=len(results),
            total_pages=1,
        ),
    )
