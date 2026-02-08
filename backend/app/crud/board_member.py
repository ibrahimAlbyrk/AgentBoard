from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.models.board_member import BoardMember
from app.schemas.board_member import BoardMemberCreate, BoardMemberUpdate

from .base import CRUDBase


class CRUDBoardMember(
    CRUDBase[BoardMember, BoardMemberCreate, BoardMemberUpdate]
):
    async def get_by_board_and_user(
        self, db: AsyncSession, board_id: UUID, user_id: UUID
    ) -> BoardMember | None:
        result = await db.execute(
            select(BoardMember).where(
                BoardMember.board_id == board_id,
                BoardMember.user_id == user_id,
            )
        )
        return result.scalar_one_or_none()

    async def get_multi_by_board(
        self, db: AsyncSession, board_id: UUID
    ) -> list[BoardMember]:
        result = await db.execute(
            select(BoardMember)
            .where(BoardMember.board_id == board_id)
            .options(joinedload(BoardMember.user))
        )
        return list(result.scalars().all())

    async def is_member(
        self, db: AsyncSession, board_id: UUID, user_id: UUID
    ) -> bool:
        member = await self.get_by_board_and_user(db, board_id, user_id)
        return member is not None


crud_board_member = CRUDBoardMember(BoardMember)
