from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.board import Board
from app.schemas.board import BoardCreate, BoardUpdate

from .base import CRUDBase


class CRUDBoard(CRUDBase[Board, BoardCreate, BoardUpdate]):
    async def get(self, db: AsyncSession, id: UUID) -> Board | None:
        result = await db.execute(
            select(Board)
            .where(Board.id == id)
            .options(
                selectinload(Board.members),
                selectinload(Board.statuses),
                selectinload(Board.tasks),
            )
        )
        return result.scalar_one_or_none()

    async def get_multi_by_project(
        self, db: AsyncSession, project_id: UUID
    ) -> list[Board]:
        result = await db.execute(
            select(Board)
            .where(Board.project_id == project_id)
            .options(
                selectinload(Board.members),
                selectinload(Board.statuses),
                selectinload(Board.tasks),
            )
            .order_by(Board.position)
        )
        return list(result.scalars().all())

    async def get_by_slug(
        self, db: AsyncSession, project_id: UUID, slug: str
    ) -> Board | None:
        result = await db.execute(
            select(Board).where(
                Board.project_id == project_id,
                Board.slug == slug,
            )
        )
        return result.scalar_one_or_none()

    async def get_max_position(
        self, db: AsyncSession, project_id: UUID
    ) -> int:
        result = await db.execute(
            select(func.coalesce(func.max(Board.position), -1)).where(
                Board.project_id == project_id
            )
        )
        return result.scalar_one()


crud_board = CRUDBoard(Board)
