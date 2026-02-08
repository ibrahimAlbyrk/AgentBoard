from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.agent import Agent
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
        query = select(Agent).where(Agent.project_id == project_id)
        if not include_inactive:
            query = query.where(Agent.is_active == True)  # noqa: E712
        query = query.order_by(Agent.name)
        result = await db.execute(query)
        return list(result.scalars().all())

    async def get_by_name(
        self, db: AsyncSession, project_id: UUID, name: str
    ) -> Agent | None:
        result = await db.execute(
            select(Agent).where(
                Agent.project_id == project_id,
                Agent.name == name,
            )
        )
        return result.scalar_one_or_none()


crud_agent = CRUDAgent(Agent)
