from uuid import UUID

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.project import Project
from app.models.project_member import ProjectMember
from app.schemas.project import ProjectCreate, ProjectUpdate

from .base import CRUDBase


class CRUDProject(CRUDBase[Project, ProjectCreate, ProjectUpdate]):
    async def get(self, db: AsyncSession, id: UUID) -> Project | None:
        result = await db.execute(
            select(Project)
            .where(Project.id == id)
            .options(
                selectinload(Project.members),
                selectinload(Project.statuses),
                selectinload(Project.labels),
            )
        )
        return result.scalar_one_or_none()

    async def get_multi_by_user(
        self,
        db: AsyncSession,
        user_id: UUID,
        include_archived: bool = False,
    ) -> list[Project]:
        query = select(Project).where(
            or_(
                Project.owner_id == user_id,
                Project.id.in_(
                    select(ProjectMember.project_id).where(
                        ProjectMember.user_id == user_id
                    )
                ),
            )
        )
        if not include_archived:
            query = query.where(Project.is_archived == False)  # noqa: E712
        result = await db.execute(query)
        return list(result.scalars().all())

    async def get_by_slug(
        self, db: AsyncSession, slug: str
    ) -> Project | None:
        result = await db.execute(
            select(Project).where(Project.slug == slug)
        )
        return result.scalar_one_or_none()


crud_project = CRUDProject(Project)
