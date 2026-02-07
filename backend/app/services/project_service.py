from uuid import UUID

from slugify import slugify
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import crud_project
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.status import Status
from app.schemas.project import ProjectCreate


class ProjectService:
    DEFAULT_STATUSES = [
        {"name": "To Do", "slug": "to-do", "color": "#94A3B8", "position": 0, "is_default": True},
        {"name": "In Progress", "slug": "in-progress", "color": "#3B82F6", "position": 1},
        {"name": "In Review", "slug": "in-review", "color": "#8B5CF6", "position": 2},
        {"name": "Testing", "slug": "testing", "color": "#F59E0B", "position": 3},
        {"name": "Complete", "slug": "complete", "color": "#22C55E", "position": 4, "is_terminal": True},
    ]

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

        if project_in.create_default_statuses:
            for s in ProjectService.DEFAULT_STATUSES:
                db.add(Status(project_id=project.id, **s))

        await db.flush()
        return await crud_project.get(db, project.id)
