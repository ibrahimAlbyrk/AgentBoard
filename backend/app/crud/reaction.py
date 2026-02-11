from uuid import UUID

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.crud.base import CRUDBase
from app.models.reaction import Reaction
from app.schemas.agent import AgentBrief
from app.schemas.reaction import (
    ReactionCreate,
    ReactionGroup,
    ReactionSummary,
    ReactorBrief,
)
from app.schemas.user import UserBrief


class CRUDReaction(CRUDBase[Reaction, ReactionCreate, ReactionCreate]):

    async def find_reaction(
        self, db: AsyncSession, entity_type: str, entity_id: UUID, emoji: str,
        user_id: UUID | None = None, agent_id: UUID | None = None,
    ) -> Reaction | None:
        q = select(Reaction).where(
            Reaction.entity_type == entity_type,
            Reaction.entity_id == entity_id,
            Reaction.emoji == emoji,
        )
        if user_id:
            q = q.where(Reaction.user_id == user_id)
        if agent_id:
            q = q.where(Reaction.agent_id == agent_id)
        result = await db.execute(q)
        return result.scalar_one_or_none()

    async def get_by_entity(
        self, db: AsyncSession, entity_type: str, entity_id: UUID,
    ) -> list[Reaction]:
        q = (
            select(Reaction)
            .options(selectinload(Reaction.user), selectinload(Reaction.agent))
            .where(
                Reaction.entity_type == entity_type,
                Reaction.entity_id == entity_id,
            )
            .order_by(Reaction.created_at)
        )
        result = await db.execute(q)
        return list(result.scalars().all())

    async def get_summary(
        self, db: AsyncSession, entity_type: str, entity_id: UUID,
        current_user_id: UUID | None = None,
    ) -> ReactionSummary:
        reactions = await self.get_by_entity(db, entity_type, entity_id)
        return self._build_summary(reactions, current_user_id)

    async def get_summaries_batch(
        self, db: AsyncSession, entity_type: str, entity_ids: list[UUID],
        current_user_id: UUID | None = None,
    ) -> dict[UUID, ReactionSummary]:
        if not entity_ids:
            return {}
        q = (
            select(Reaction)
            .options(selectinload(Reaction.user), selectinload(Reaction.agent))
            .where(
                Reaction.entity_type == entity_type,
                Reaction.entity_id.in_(entity_ids),
            )
            .order_by(Reaction.created_at)
        )
        result = await db.execute(q)
        reactions = list(result.scalars().all())

        by_entity: dict[UUID, list[Reaction]] = {}
        for r in reactions:
            by_entity.setdefault(r.entity_id, []).append(r)

        summaries = {}
        for eid in entity_ids:
            entity_reactions = by_entity.get(eid, [])
            if entity_reactions:
                summaries[eid] = self._build_summary(entity_reactions, current_user_id)
        return summaries

    async def delete_by_entity(
        self, db: AsyncSession, entity_type: str, entity_id: UUID,
    ) -> None:
        q = delete(Reaction).where(
            Reaction.entity_type == entity_type,
            Reaction.entity_id == entity_id,
        )
        await db.execute(q)
        await db.flush()

    async def count_emoji_for_entity(
        self, db: AsyncSession, entity_type: str, entity_id: UUID, emoji: str,
    ) -> int:
        q = select(func.count()).where(
            Reaction.entity_type == entity_type,
            Reaction.entity_id == entity_id,
            Reaction.emoji == emoji,
        )
        result = await db.execute(q)
        return result.scalar_one()

    async def get_vote_counts(
        self, db: AsyncSession, task_ids: list[UUID],
    ) -> dict[UUID, int]:
        if not task_ids:
            return {}
        q = (
            select(Reaction.entity_id, func.count())
            .where(
                Reaction.entity_type == "task",
                Reaction.entity_id.in_(task_ids),
                Reaction.emoji == "\U0001f44d",
            )
            .group_by(Reaction.entity_id)
        )
        result = await db.execute(q)
        return dict(result.all())

    @staticmethod
    def _build_summary(
        reactions: list[Reaction], current_user_id: UUID | None = None,
    ) -> ReactionSummary:
        groups: dict[str, ReactionGroup] = {}
        for r in reactions:
            if r.emoji not in groups:
                groups[r.emoji] = ReactionGroup(emoji=r.emoji, count=0)
            g = groups[r.emoji]
            g.count += 1
            g.reactors.append(ReactorBrief(
                user=UserBrief.model_validate(r.user) if r.user else None,
                agent=AgentBrief.model_validate(r.agent) if r.agent else None,
            ))
            if current_user_id and r.user_id == current_user_id:
                g.reacted_by_me = True

        return ReactionSummary(
            groups=sorted(groups.values(), key=lambda g: g.count, reverse=True),
            total=sum(g.count for g in groups.values()),
        )


crud_reaction = CRUDReaction(Reaction)
