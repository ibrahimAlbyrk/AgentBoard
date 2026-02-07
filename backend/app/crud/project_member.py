from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.models.project_member import ProjectMember
from app.schemas.project_member import ProjectMemberCreate, ProjectMemberUpdate

from .base import CRUDBase


class CRUDProjectMember(
    CRUDBase[ProjectMember, ProjectMemberCreate, ProjectMemberUpdate]
):
    async def get_by_project_and_user(
        self, db: AsyncSession, project_id: UUID, user_id: UUID
    ) -> ProjectMember | None:
        result = await db.execute(
            select(ProjectMember).where(
                ProjectMember.project_id == project_id,
                ProjectMember.user_id == user_id,
            )
        )
        return result.scalar_one_or_none()

    async def get_multi_by_project(
        self, db: AsyncSession, project_id: UUID
    ) -> list[ProjectMember]:
        result = await db.execute(
            select(ProjectMember)
            .where(ProjectMember.project_id == project_id)
            .options(joinedload(ProjectMember.user))
        )
        return list(result.scalars().all())

    async def is_member(
        self, db: AsyncSession, project_id: UUID, user_id: UUID
    ) -> bool:
        member = await self.get_by_project_and_user(db, project_id, user_id)
        return member is not None


crud_project_member = CRUDProjectMember(ProjectMember)
