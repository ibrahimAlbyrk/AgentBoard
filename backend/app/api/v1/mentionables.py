from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.api.deps import check_project_access, get_current_user
from app.core.database import get_db
from app.models.agent import Agent
from app.models.agent_project import AgentProject
from app.models.board import Board
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.task import Task
from app.models.user import User
from app.schemas.base import ResponseBase

router = APIRouter(tags=["Mentionables"])


@router.get(
    "/projects/{project_id}/mentionables",
    response_model=ResponseBase,
)
async def get_mentionables(
    q: str = Query("", max_length=100),
    db: AsyncSession = Depends(get_db),
    project: Project = Depends(check_project_access),
    current_user: User = Depends(get_current_user),
):
    """Return users + agents for @mention autocomplete."""
    # Project members (users)
    members_q = (
        select(ProjectMember)
        .where(ProjectMember.project_id == project.id)
        .options(joinedload(ProjectMember.user))
    )
    result = await db.execute(members_q)
    members = list(result.scalars().all())

    # Include project owner
    owner = None
    if project.owner_id not in {m.user_id for m in members}:
        owner = await db.execute(select(User).where(User.id == project.owner_id))
        owner = owner.scalar_one_or_none()

    users = []
    seen_user_ids = set()
    for m in members:
        u = m.user
        if not u:
            continue
        if q and not _match_user(u, q):
            continue
        if u.id in seen_user_ids:
            continue
        seen_user_ids.add(u.id)
        users.append({
            "id": str(u.id),
            "username": u.username,
            "full_name": u.full_name,
            "avatar_url": u.avatar_url,
        })
    if owner and owner.id not in seen_user_ids:
        if not q or _match_user(owner, q):
            users.append({
                "id": str(owner.id),
                "username": owner.username,
                "full_name": owner.full_name,
                "avatar_url": owner.avatar_url,
            })

    # Agents
    agents_q = (
        select(Agent)
        .join(AgentProject, AgentProject.agent_id == Agent.id)
        .where(
            AgentProject.project_id == project.id,
            Agent.is_active == True,  # noqa: E712
            Agent.deleted_at.is_(None),
        )
    )
    if q:
        agents_q = agents_q.where(Agent.name.ilike(f"%{q}%"))
    agents_q = agents_q.order_by(Agent.name).limit(20)
    result = await db.execute(agents_q)
    agents = [
        {"id": str(a.id), "name": a.name, "color": a.color}
        for a in result.scalars().all()
    ]

    return ResponseBase(data={"users": users[:20], "agents": agents})


@router.get(
    "/projects/{project_id}/referenceables",
    response_model=ResponseBase,
)
async def get_referenceables(
    q: str = Query("", max_length=100),
    db: AsyncSession = Depends(get_db),
    project: Project = Depends(check_project_access),
    current_user: User = Depends(get_current_user),
):
    """Return projects, boards, tasks for #reference autocomplete."""
    # Projects the user has access to
    projects_q = (
        select(Project)
        .outerjoin(ProjectMember)
        .where(
            or_(
                Project.owner_id == current_user.id,
                ProjectMember.user_id == current_user.id,
            )
        )
        .distinct()
    )
    if q:
        projects_q = projects_q.where(Project.name.ilike(f"%{q}%"))
    projects_q = projects_q.limit(5)
    result = await db.execute(projects_q)
    projects = [
        {"id": str(p.id), "name": p.name, "icon": p.icon, "color": p.color}
        for p in result.scalars().all()
    ]

    # Boards within current project
    boards_q = select(Board).where(Board.project_id == project.id)
    if q:
        boards_q = boards_q.where(Board.name.ilike(f"%{q}%"))
    boards_q = boards_q.limit(5)
    result = await db.execute(boards_q)
    boards = [
        {
            "id": str(b.id),
            "name": b.name,
            "icon": b.icon,
            "color": b.color,
            "project_id": str(b.project_id),
        }
        for b in result.scalars().all()
    ]

    # Tasks within current project
    tasks_q = select(Task).where(Task.project_id == project.id)
    if q:
        tasks_q = tasks_q.where(Task.title.ilike(f"%{q}%"))
    tasks_q = tasks_q.limit(5)
    result = await db.execute(tasks_q)
    tasks = [
        {
            "id": str(t.id),
            "title": t.title,
            "board_id": str(t.board_id),
            "project_id": str(t.project_id),
            "status_name": "",
        }
        for t in result.scalars().all()
    ]

    return ResponseBase(data={"projects": projects, "boards": boards, "tasks": tasks})


def _match_user(user: User, q: str) -> bool:
    q_lower = q.lower()
    if user.username and q_lower in user.username.lower():
        return True
    if user.full_name and q_lower in user.full_name.lower():
        return True
    return False
