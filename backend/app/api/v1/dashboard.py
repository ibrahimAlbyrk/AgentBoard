from datetime import UTC, datetime, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.crud import crud_task
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.status import Status
from app.models.task import Task
from app.models.user import User
from app.schemas.base import ResponseBase
from app.schemas.task import (
    DashboardTaskResponse,
    MyTasksResponse,
    MyTasksSummary,
)

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


@router.get("/my-tasks", response_model=ResponseBase[MyTasksResponse])
async def get_my_tasks(
    agent_id: UUID | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    now = datetime.utcnow()
    today_end = now.replace(hour=23, minute=59, second=59)
    week_end = today_end + timedelta(days=7 - now.weekday())

    user_project_ids = select(Project.id).where(
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
    project_ids_result = await db.execute(user_project_ids)
    project_ids = [row[0] for row in project_ids_result.all()]

    if not project_ids:
        return ResponseBase(
            data=MyTasksResponse(
                summary=MyTasksSummary(), tasks=[]
            )
        )

    tasks = await crud_task.get_assigned_to_user(
        db, current_user.id, project_ids, limit=50, agent_id=agent_id,
    )

    # Build project name map
    project_names = {}
    if tasks:
        pids = {t.project_id for t in tasks}
        result = await db.execute(
            select(Project.id, Project.name).where(Project.id.in_(pids))
        )
        project_names = dict(result.all())

    overdue_count = 0
    due_today_count = 0
    due_this_week_count = 0

    for t in tasks:
        if t.due_date:
            # Strip tzinfo for safe comparison (SQLite stores naive datetimes)
            dd = t.due_date.replace(tzinfo=None) if t.due_date.tzinfo else t.due_date
            if dd < now:
                overdue_count += 1
            elif dd <= today_end:
                due_today_count += 1
            elif dd <= week_end:
                due_this_week_count += 1

    task_responses = []
    for t in tasks:
        resp = DashboardTaskResponse.model_validate(t)
        resp.project_name = project_names.get(t.project_id, "")
        task_responses.append(resp)

    return ResponseBase(
        data=MyTasksResponse(
            summary=MyTasksSummary(
                overdue_count=overdue_count,
                due_today_count=due_today_count,
                due_this_week_count=due_this_week_count,
                total_assigned=len(tasks),
            ),
            tasks=task_responses,
        )
    )
