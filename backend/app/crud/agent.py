import uuid as _uuid
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.agent import Agent
from app.models.agent_project import AgentProject
from app.schemas.agent import AgentCreate, AgentUpdate

from .base import CRUDBase


class CRUDAgent(CRUDBase[Agent, AgentCreate, AgentUpdate]):
    async def get_multi_by_project(
        self,
        db: AsyncSession,
        project_id: UUID,
        *,
        include_inactive: bool = False,
    ) -> list[Agent]:
        query = (
            select(Agent)
            .join(AgentProject, AgentProject.agent_id == Agent.id)
            .where(
                AgentProject.project_id == project_id,
                Agent.deleted_at.is_(None),
            )
        )
        if not include_inactive:
            query = query.where(Agent.is_active == True)  # noqa: E712
        query = query.order_by(Agent.name)
        result = await db.execute(query)
        return list(result.scalars().all())

    async def get_by_name(
        self, db: AsyncSession, owner_id: UUID, name: str
    ) -> Agent | None:
        result = await db.execute(
            select(Agent).where(
                Agent.created_by == owner_id,
                Agent.name == name,
                Agent.deleted_at.is_(None),
            )
        )
        return result.scalar_one_or_none()

    async def is_in_project(
        self, db: AsyncSession, agent_id: UUID, project_id: UUID
    ) -> bool:
        result = await db.execute(
            select(AgentProject).where(
                AgentProject.agent_id == agent_id,
                AgentProject.project_id == project_id,
            )
        )
        return result.scalar_one_or_none() is not None

    async def add_to_project(
        self, db: AsyncSession, agent_id: UUID, project_id: UUID
    ) -> AgentProject:
        ap = AgentProject(agent_id=agent_id, project_id=project_id)
        db.add(ap)
        await db.flush()
        return ap

    async def remove_from_project(
        self, db: AsyncSession, agent_id: UUID, project_id: UUID
    ) -> bool:
        result = await db.execute(
            select(AgentProject).where(
                AgentProject.agent_id == agent_id,
                AgentProject.project_id == project_id,
            )
        )
        ap = result.scalar_one_or_none()
        if ap:
            await db.delete(ap)
            await db.flush()
            return True
        return False

    async def has_any_project(self, db: AsyncSession, agent_id: UUID) -> bool:
        result = await db.execute(
            select(AgentProject).where(AgentProject.agent_id == agent_id).limit(1)
        )
        return result.scalar_one_or_none() is not None

    async def get_multi_by_owner(
        self, db: AsyncSession, owner_id: UUID, *, include_deleted: bool = False
    ) -> list[Agent]:
        query = select(Agent).where(Agent.created_by == owner_id)
        if not include_deleted:
            query = query.where(Agent.deleted_at.is_(None))
        result = await db.execute(query.order_by(Agent.name))
        return list(result.scalars().all())

    async def get_multi_by_owner_with_projects(
        self, db: AsyncSession, owner_id: UUID, *, include_deleted: bool = False
    ) -> list[Agent]:
        query = (
            select(Agent)
            .where(Agent.created_by == owner_id)
            .options(
                selectinload(Agent.agent_projects).selectinload(AgentProject.project)
            )
        )
        if not include_deleted:
            query = query.where(Agent.deleted_at.is_(None))
        result = await db.execute(query.order_by(Agent.name))
        return list(result.scalars().all())

    async def get_with_projects(
        self, db: AsyncSession, agent_id: UUID
    ) -> Agent | None:
        result = await db.execute(
            select(Agent)
            .where(Agent.id == agent_id)
            .options(
                selectinload(Agent.agent_projects).selectinload(AgentProject.project)
            )
        )
        return result.scalar_one_or_none()

    async def soft_delete(self, db: AsyncSession, agent: Agent) -> None:
        agent.deleted_at = datetime.now(UTC)
        agent.is_active = False
        agent.name = f"{agent.name}__del_{_uuid.uuid4().hex[:8]}"
        db.add(agent)
        await db.flush()


crud_agent = CRUDAgent(Agent)
