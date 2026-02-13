from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import Actor, check_board_access, get_current_actor, get_current_user
from app.core.database import get_db
from app.models.board import Board
from app.models.user import User
from app.schemas.base import ResponseBase
from app.schemas.reaction import ReactionSummary, ReactionToggle, ToggleResult
from app.services.reaction_service import ReactionService
from app.services.websocket_manager import manager

task_router = APIRouter(
    prefix="/projects/{project_id}/boards/{board_id}/tasks/{task_id}/reactions",
    tags=["Reactions"],
)

comment_router = APIRouter(
    prefix="/projects/{project_id}/boards/{board_id}/tasks/{task_id}/comments/{comment_id}/reactions",
    tags=["Reactions"],
)


# ── Task reactions ──


@task_router.post("/toggle", response_model=ResponseBase[ToggleResult])
async def toggle_task_reaction(
    task_id: UUID,
    body: ReactionToggle,
    db: AsyncSession = Depends(get_db),
    board: Board = Depends(check_board_access),
    actor: Actor = Depends(get_current_actor),
):
    agent_id = actor.agent.id if actor.is_agent else None
    result = await ReactionService.toggle_reaction(
        db,
        entity_type="task",
        entity_id=task_id,
        emoji=body.emoji,
        user_id=actor.user.id,
        agent_id=agent_id,
    )
    await manager.broadcast_to_board(str(board.project_id), str(board.id), {
        "type": "reaction.updated",
        "entity_type": "task",
        "entity_id": str(task_id),
        "data": result.summary.model_dump(mode="json"),
        "user": {"id": str(actor.user.id), "username": actor.user.username},
    })
    if result.action == "added":
        await ReactionService.notify_reaction(
            db, entity_type="task", entity_id=task_id,
            emoji=body.emoji, actor_id=actor.user.id,
            project_id=board.project_id, board_id=board.id,
        )
    return ResponseBase(data=result)


@task_router.get("", response_model=ResponseBase[ReactionSummary])
async def get_task_reactions(
    task_id: UUID,
    db: AsyncSession = Depends(get_db),
    board: Board = Depends(check_board_access),
    current_user: User = Depends(get_current_user),
):
    summary = await ReactionService.get_summary(
        db, "task", task_id, current_user_id=current_user.id
    )
    return ResponseBase(data=summary)


# ── Comment reactions ──


@comment_router.post("/toggle", response_model=ResponseBase[ToggleResult])
async def toggle_comment_reaction(
    comment_id: UUID,
    body: ReactionToggle,
    db: AsyncSession = Depends(get_db),
    board: Board = Depends(check_board_access),
    actor: Actor = Depends(get_current_actor),
):
    agent_id = actor.agent.id if actor.is_agent else None
    result = await ReactionService.toggle_reaction(
        db,
        entity_type="comment",
        entity_id=comment_id,
        emoji=body.emoji,
        user_id=actor.user.id,
        agent_id=agent_id,
    )
    await manager.broadcast_to_board(str(board.project_id), str(board.id), {
        "type": "reaction.updated",
        "entity_type": "comment",
        "entity_id": str(comment_id),
        "data": result.summary.model_dump(mode="json"),
        "user": {"id": str(actor.user.id), "username": actor.user.username},
    })
    if result.action == "added":
        await ReactionService.notify_reaction(
            db, entity_type="comment", entity_id=comment_id,
            emoji=body.emoji, actor_id=actor.user.id,
            project_id=board.project_id, board_id=board.id,
        )
    return ResponseBase(data=result)


@comment_router.get("", response_model=ResponseBase[ReactionSummary])
async def get_comment_reactions(
    comment_id: UUID,
    db: AsyncSession = Depends(get_db),
    board: Board = Depends(check_board_access),
    current_user: User = Depends(get_current_user),
):
    summary = await ReactionService.get_summary(
        db, "comment", comment_id, current_user_id=current_user.id
    )
    return ResponseBase(data=summary)
