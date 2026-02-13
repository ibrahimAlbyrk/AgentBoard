from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import check_project_access, get_current_user
from app.core.errors import DuplicateError, NotFoundError
from app.core.database import get_db
from app.crud import crud_agent
from app.models.agent import Agent
from app.models.project import Project
from app.models.user import User
from app.schemas.agent import (
    AgentCreate,
    AgentResponse,
    AgentUpdate,
    AgentWithProjectsResponse,
    ProjectBrief,
)
from app.schemas.base import ResponseBase

router = APIRouter(
    prefix="/projects/{project_id}/agents", tags=["Agents"]
)

# User-level agent endpoints (no project scope)
user_router = APIRouter(prefix="/agents", tags=["Agents"])


def _agent_with_projects(agent: Agent) -> AgentWithProjectsResponse:
    resp = AgentWithProjectsResponse.model_validate(agent)
    resp.projects = [
        ProjectBrief.model_validate(ap.project)
        for ap in agent.agent_projects
        if ap.project is not None
    ]
    return resp


@user_router.get("/mine", response_model=ResponseBase[list[AgentWithProjectsResponse]])
async def list_my_agents(
    include_deleted: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all agents owned by the current user (across all projects)."""
    agents = await crud_agent.get_multi_by_owner_with_projects(
        db, current_user.id, include_deleted=include_deleted
    )
    return ResponseBase(data=[_agent_with_projects(a) for a in agents])


@user_router.post("/", response_model=ResponseBase[AgentWithProjectsResponse], status_code=201)
async def create_global_agent(
    agent_in: AgentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create an agent globally (not linked to any project)."""
    existing = await crud_agent.get_by_name(db, current_user.id, agent_in.name)
    if existing:
        raise DuplicateError(f'Agent "{agent_in.name}" already exists')
    agent = Agent(name=agent_in.name, color=agent_in.color, created_by=current_user.id)
    db.add(agent)
    await db.flush()
    await db.refresh(agent)
    resp = AgentWithProjectsResponse.model_validate(agent)
    resp.projects = []
    return ResponseBase(data=resp)


@user_router.patch("/{agent_id}", response_model=ResponseBase[AgentWithProjectsResponse])
async def update_global_agent(
    agent_id: UUID,
    agent_in: AgentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update an agent globally (owner only)."""
    agent = await crud_agent.get(db, agent_id)
    if not agent or agent.deleted_at or agent.created_by != current_user.id:
        raise NotFoundError("Agent not found")
    update_data = agent_in.model_dump(exclude_unset=True)
    if "name" in update_data and update_data["name"] != agent.name:
        existing = await crud_agent.get_by_name(db, current_user.id, update_data["name"])
        if existing:
            raise DuplicateError(f'Agent "{update_data["name"]}" already exists')
    for field, value in update_data.items():
        setattr(agent, field, value)
    db.add(agent)
    await db.flush()
    agent = await crud_agent.get_with_projects(db, agent_id)
    return ResponseBase(data=_agent_with_projects(agent))


@user_router.delete("/{agent_id}", status_code=204)
async def delete_global_agent(
    agent_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Soft-delete an agent globally (owner only)."""
    agent = await crud_agent.get(db, agent_id)
    if not agent or agent.deleted_at or agent.created_by != current_user.id:
        raise NotFoundError("Agent not found")
    await crud_agent.remove_from_all_projects(db, agent_id)
    await crud_agent.soft_delete(db, agent)


@router.get("/", response_model=ResponseBase[list[AgentResponse]])
async def list_agents(
    include_inactive: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    project: Project = Depends(check_project_access),
):
    agents = await crud_agent.get_multi_by_project(
        db, project.id, include_inactive=include_inactive
    )
    return ResponseBase(
        data=[AgentResponse.model_validate(a) for a in agents]
    )


@router.post("/", response_model=ResponseBase[AgentResponse], status_code=201)
async def create_agent(
    agent_in: AgentCreate,
    db: AsyncSession = Depends(get_db),
    project: Project = Depends(check_project_access),
    current_user: User = Depends(get_current_user),
):
    existing = await crud_agent.get_by_name(db, current_user.id, agent_in.name)
    if existing:
        raise DuplicateError(f'Agent "{agent_in.name}" already exists')
    agent = Agent(
        name=agent_in.name,
        color=agent_in.color,
        created_by=current_user.id,
    )
    db.add(agent)
    await db.flush()
    await db.refresh(agent)
    # Link agent to this project
    await crud_agent.add_to_project(db, agent.id, project.id)
    return ResponseBase(data=AgentResponse.model_validate(agent))


@router.post("/{agent_id}/link", response_model=ResponseBase[AgentResponse], status_code=201)
async def link_agent_to_project(
    agent_id: UUID,
    db: AsyncSession = Depends(get_db),
    project: Project = Depends(check_project_access),
    current_user: User = Depends(get_current_user),
):
    """Add an existing agent to this project."""
    agent = await crud_agent.get(db, agent_id)
    if not agent or agent.deleted_at or agent.created_by != current_user.id:
        raise NotFoundError("Agent not found")
    already = await crud_agent.is_in_project(db, agent_id, project.id)
    if already:
        raise DuplicateError("Agent already linked to this project")
    await crud_agent.add_to_project(db, agent_id, project.id)
    return ResponseBase(data=AgentResponse.model_validate(agent))


@router.patch("/{agent_id}", response_model=ResponseBase[AgentResponse])
async def update_agent(
    agent_id: UUID,
    agent_in: AgentUpdate,
    db: AsyncSession = Depends(get_db),
    project: Project = Depends(check_project_access),
    current_user: User = Depends(get_current_user),
):
    agent = await crud_agent.get(db, agent_id)
    if not agent or agent.deleted_at:
        raise NotFoundError("Agent not found")
    if not await crud_agent.is_in_project(db, agent_id, project.id):
        raise NotFoundError("Agent not found in this project")
    update_data = agent_in.model_dump(exclude_unset=True)
    if "name" in update_data and update_data["name"] != agent.name:
        existing = await crud_agent.get_by_name(
            db, agent.created_by, update_data["name"]
        )
        if existing:
            raise DuplicateError(f'Agent "{update_data["name"]}" already exists')
    for field, value in update_data.items():
        setattr(agent, field, value)
    db.add(agent)
    await db.flush()
    await db.refresh(agent)
    return ResponseBase(data=AgentResponse.model_validate(agent))


@router.delete("/{agent_id}", status_code=204)
async def delete_agent(
    agent_id: UUID,
    db: AsyncSession = Depends(get_db),
    project: Project = Depends(check_project_access),
):
    """Remove agent from project. If no projects remain, soft-delete the agent."""
    agent = await crud_agent.get(db, agent_id)
    if not agent or agent.deleted_at:
        raise NotFoundError("Agent not found")
    if not await crud_agent.is_in_project(db, agent_id, project.id):
        raise NotFoundError("Agent not found in this project")
    await crud_agent.remove_from_project(db, agent_id, project.id)
    # Soft-delete if agent has no remaining projects
    if not await crud_agent.has_any_project(db, agent_id):
        await crud_agent.soft_delete(db, agent)
