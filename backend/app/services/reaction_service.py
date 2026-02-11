from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import crud_comment, crud_reaction, crud_task, crud_user
from app.models.reaction import Reaction
from app.schemas.reaction import ReactionSummary, ToggleResult
from app.services.notification_service import NotificationService


class ReactionService:

    @staticmethod
    async def toggle_reaction(
        db: AsyncSession,
        entity_type: str,
        entity_id: UUID,
        emoji: str,
        user_id: UUID,
        agent_id: UUID | None = None,
    ) -> ToggleResult:
        existing = await crud_reaction.find_reaction(
            db, entity_type, entity_id, emoji,
            user_id=user_id if not agent_id else None,
            agent_id=agent_id,
        )
        if existing:
            await db.delete(existing)
            await db.flush()
            action = "removed"
        else:
            reaction = Reaction(
                entity_type=entity_type,
                entity_id=entity_id,
                emoji=emoji,
                user_id=user_id if not agent_id else None,
                agent_id=agent_id,
            )
            db.add(reaction)
            await db.flush()
            action = "added"

        summary = await crud_reaction.get_summary(
            db, entity_type, entity_id, current_user_id=user_id
        )
        return ToggleResult(action=action, emoji=emoji, summary=summary)

    @staticmethod
    async def get_summary(
        db: AsyncSession,
        entity_type: str,
        entity_id: UUID,
        current_user_id: UUID | None = None,
    ) -> ReactionSummary:
        return await crud_reaction.get_summary(
            db, entity_type, entity_id, current_user_id
        )

    @staticmethod
    async def notify_reaction(
        db: AsyncSession,
        entity_type: str,
        entity_id: UUID,
        emoji: str,
        actor_id: UUID,
        project_id: UUID,
        board_id: UUID,
    ) -> None:
        if entity_type == "task":
            task = await crud_task.get(db, entity_id)
            if not task or task.creator_id == actor_id:
                return
            actor = await crud_user.get(db, actor_id)
            actor_name = (actor.full_name or actor.username) if actor else "Someone"
            await NotificationService.create_notification(
                db,
                user_id=task.creator_id,
                actor_id=actor_id,
                project_id=project_id,
                type="task_reaction",
                title="Reaction on Task",
                message=f'{actor_name} reacted {emoji} to "{task.title}"',
                data={"task_id": str(entity_id), "board_id": str(board_id)},
            )
        elif entity_type == "comment":
            comment = await crud_comment.get(db, entity_id)
            if not comment or comment.user_id == actor_id:
                return
            actor = await crud_user.get(db, actor_id)
            actor_name = (actor.full_name or actor.username) if actor else "Someone"
            preview = comment.content[:50] + ("..." if len(comment.content) > 50 else "")
            await NotificationService.create_notification(
                db,
                user_id=comment.user_id,
                actor_id=actor_id,
                project_id=project_id,
                type="task_reaction",
                title="Reaction on Comment",
                message=f'{actor_name} reacted {emoji} to your comment: "{preview}"',
                data={"task_id": str(comment.task_id), "board_id": str(board_id)},
            )

    @staticmethod
    async def delete_reactions_for_entity(
        db: AsyncSession, entity_type: str, entity_id: UUID,
    ) -> None:
        await crud_reaction.delete_by_entity(db, entity_type, entity_id)
