from typing import Any
from uuid import UUID

from pydantic import BaseModel
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.board import Board
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
                selectinload(Project.boards).selectinload(Board.members),
                selectinload(Project.boards).selectinload(Board.tasks),
                selectinload(Project.boards).selectinload(Board.statuses),
                selectinload(Project.labels),
                selectinload(Project.tasks),
            )
        )
        return result.scalar_one_or_none()

    async def update(
        self,
        db: AsyncSession,
        *,
        db_obj: Project,
        obj_in: BaseModel | dict[str, Any],
    ) -> Project:
        if isinstance(obj_in, dict):
            update_data = obj_in
        else:
            update_data = obj_in.model_dump(exclude_unset=True)

        for field, value in update_data.items():
            if value is not None:
                setattr(db_obj, field, value)

        db.add(db_obj)
        await db.flush()
        return await self.get(db, db_obj.id)

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
        query = query.options(
            selectinload(Project.owner),
            selectinload(Project.members),
            selectinload(Project.tasks),
        )
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
