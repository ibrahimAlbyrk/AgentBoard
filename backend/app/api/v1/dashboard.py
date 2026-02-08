from datetime import UTC, datetime

from fastapi import APIRouter, Depends
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.status import Status
from app.models.task import Task
from app.models.user import User
from app.schemas.base import ResponseBase

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats", response_model=ResponseBase[dict])
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user_projects = select(Project.id).where(
        or_(
            Project.owner_id == current_user.id,
            Project.id.in_(
                select(ProjectMember.project_id).where(
                    ProjectMember.user_id == current_user.id
                )
            ),
        ),
        Project.is_archived == False,  # noqa: E712
    )

    # In progress: not default, not terminal status, not completed
    in_progress = await db.execute(
        select(func.count())
        .select_from(Task)
        .join(Status, Task.status_id == Status.id)
        .where(
            Task.project_id.in_(user_projects),
            Status.is_default == False,  # noqa: E712
            Status.is_terminal == False,  # noqa: E712
            Task.completed_at.is_(None),
        )
    )

    # Overdue: past due_date and not completed
    overdue = await db.execute(
        select(func.count())
        .select_from(Task)
        .where(
            Task.project_id.in_(user_projects),
            Task.due_date < datetime.now(UTC),
            Task.completed_at.is_(None),
        )
    )

    return ResponseBase(
        data={
            "in_progress": in_progress.scalar_one(),
            "overdue": overdue.scalar_one(),
        }
    )
