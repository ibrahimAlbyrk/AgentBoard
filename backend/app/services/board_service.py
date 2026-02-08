from uuid import UUID

from slugify import slugify
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.board import crud_board
from app.models.board import Board
from app.models.board_member import BoardMember
from app.models.status import Status
from app.schemas.board import BoardCreate


class BoardService:
    DEFAULT_STATUSES = [
        {"name": "To Do", "slug": "to-do", "color": "#94A3B8", "position": 0, "is_default": True},
        {"name": "In Progress", "slug": "in-progress", "color": "#3B82F6", "position": 1},
        {"name": "In Review", "slug": "in-review", "color": "#8B5CF6", "position": 2},
        {"name": "Testing", "slug": "testing", "color": "#F59E0B", "position": 3},
        {"name": "Complete", "slug": "complete", "color": "#22C55E", "position": 4, "is_terminal": True},
    ]

    @staticmethod
    async def create_board(
        db: AsyncSession,
        project_id: UUID,
        user_id: UUID,
        board_in: BoardCreate,
    ) -> Board:
        slug = slugify(board_in.name)
        existing = await crud_board.get_by_slug(db, project_id, slug)
        if existing:
            slug = f"{slug}-{str(user_id)[:8]}"

        position = await crud_board.get_max_position(db, project_id) + 1

        board = Board(
            project_id=project_id,
            name=board_in.name,
            slug=slug,
            description=board_in.description,
            icon=board_in.icon,
            color=board_in.color,
            position=position,
        )
        db.add(board)
        await db.flush()

        member = BoardMember(
            board_id=board.id,
            user_id=user_id,
            role="admin",
        )
        db.add(member)

        if board_in.create_default_statuses:
            for s in BoardService.DEFAULT_STATUSES:
                db.add(Status(
                    project_id=project_id,
                    board_id=board.id,
                    **s,
                ))

        await db.flush()
        return await crud_board.get(db, board.id)
