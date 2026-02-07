from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import check_project_access
from app.core.database import get_db
from app.crud import crud_task
from app.models.project import Project
from app.models.task import Task
from app.schemas.base import ResponseBase

router = APIRouter(
    prefix="/projects/{project_id}/stats", tags=["Statistics"]
)


@router.get("/", response_model=ResponseBase[dict])
async def get_stats(
    db: AsyncSession = Depends(get_db),
    project: Project = Depends(check_project_access),
):
    tasks_by_status = await crud_task.count_by_status(db, project.id)
    tasks_by_priority = await crud_task.count_by_priority(db, project.id)
    total_tasks = await crud_task.count(db, filters={"project_id": project.id})

    completed = await db.execute(
        select(func.count())
        .select_from(Task)
        .where(Task.project_id == project.id, Task.completed_at.isnot(None))
    )
    completed_count = completed.scalar_one()

    from datetime import UTC, datetime

    overdue = await db.execute(
        select(func.count())
        .select_from(Task)
        .where(
            Task.project_id == project.id,
            Task.due_date < datetime.now(UTC),
            Task.completed_at.is_(None),
        )
    )
    overdue_count = overdue.scalar_one()

    completion_rate = (completed_count / total_tasks * 100) if total_tasks else 0

    return ResponseBase(
        data={
            "tasks_by_status": {str(k): v for k, v in tasks_by_status.items()},
            "tasks_by_priority": dict(tasks_by_priority),
            "total_tasks": total_tasks,
            "completed_tasks": completed_count,
            "overdue_count": overdue_count,
            "completion_rate": round(completion_rate, 1),
        }
    )
