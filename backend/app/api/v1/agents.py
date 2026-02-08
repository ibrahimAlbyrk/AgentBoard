from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import check_project_access, get_current_user
from app.core.database import get_db
from app.crud import crud_agent
from app.models.agent import Agent
from app.models.project import Project
from app.models.user import User
from app.schemas.agent import AgentCreate, AgentResponse, AgentUpdate
from app.schemas.base import ResponseBase

router = APIRouter(
    prefix="/projects/{project_id}/agents", tags=["Agents"]
)


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
    existing = await crud_agent.get_by_name(db, project.id, agent_in.name)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Agent with this name already exists",
        )
    agent = Agent(
        project_id=project.id,
        name=agent_in.name,
        color=agent_in.color,
        created_by=current_user.id,
    )
    db.add(agent)
    await db.flush()
    await db.refresh(agent)
    return ResponseBase(data=AgentResponse.model_validate(agent))


@router.patch("/{agent_id}", response_model=ResponseBase[AgentResponse])
async def update_agent(
    agent_id: UUID,
    agent_in: AgentUpdate,
    db: AsyncSession = Depends(get_db),
    project: Project = Depends(check_project_access),
):
    agent = await crud_agent.get(db, agent_id)
    if not agent or agent.project_id != project.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found",
        )
    update_data = agent_in.model_dump(exclude_unset=True)
    if "name" in update_data and update_data["name"] != agent.name:
        existing = await crud_agent.get_by_name(
            db, project.id, update_data["name"]
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Agent with this name already exists",
            )
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
    agent = await crud_agent.get(db, agent_id)
    if not agent or agent.project_id != project.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found",
        )
    await crud_agent.remove(db, id=agent_id)
