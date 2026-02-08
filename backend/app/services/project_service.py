from uuid import UUID

from slugify import slugify
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import crud_project
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.schemas.board import BoardCreate
from app.schemas.project import ProjectCreate
from app.services.board_service import BoardService


class ProjectService:
    @staticmethod
    async def create_project(
        db: AsyncSession, user_id: UUID, project_in: ProjectCreate
    ) -> Project:
        slug = project_in.slug or slugify(project_in.name)

        existing = await crud_project.get_by_slug(db, slug)
        if existing:
            slug = f"{slug}-{str(user_id)[:8]}"

        project = Project(
            name=project_in.name,
            description=project_in.description,
            slug=slug,
            owner_id=user_id,
            icon=project_in.icon,
            color=project_in.color,
        )
        db.add(project)
        await db.flush()

        member = ProjectMember(
            project_id=project.id,
            user_id=user_id,
            role="admin",
        )
        db.add(member)
        await db.flush()

        if project_in.create_default_board:
            await BoardService.create_board(
                db,
                project.id,
                user_id,
                BoardCreate(name="Default"),
            )

        return await crud_project.get(db, project.id)
