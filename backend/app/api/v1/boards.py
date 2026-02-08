from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import check_board_access, check_project_access, get_current_user
from app.core.database import get_db
from app.crud import crud_board, crud_board_member
from app.models.board import Board
from app.models.board_member import BoardMember
from app.models.project import Project
from app.models.user import User
from app.schemas.base import ResponseBase
from app.schemas.board import (
    BoardCreate,
    BoardDetailResponse,
    BoardReorder,
    BoardResponse,
    BoardUpdate,
)
from app.schemas.board_member import BoardMemberCreate, BoardMemberResponse, BoardMemberUpdate
from app.services.board_service import BoardService

router = APIRouter(
    prefix="/projects/{project_id}/boards", tags=["Boards"]
)


@router.get("/", response_model=ResponseBase[list[BoardResponse]])
async def list_boards(
    db: AsyncSession = Depends(get_db),
    project: Project = Depends(check_project_access),
):
    boards = await crud_board.get_multi_by_project(db, project.id)
    return ResponseBase(
        data=[BoardResponse.model_validate(b) for b in boards]
    )


@router.post("/", response_model=ResponseBase[BoardResponse], status_code=201)
async def create_board(
    board_in: BoardCreate,
    db: AsyncSession = Depends(get_db),
    project: Project = Depends(check_project_access),
    current_user: User = Depends(get_current_user),
):
    board = await BoardService.create_board(
        db, project.id, current_user.id, board_in
    )
    return ResponseBase(data=BoardResponse.model_validate(board))


@router.get("/{board_id}", response_model=ResponseBase[BoardDetailResponse])
async def get_board(
    db: AsyncSession = Depends(get_db),
    board: Board = Depends(check_board_access),
):
    members = await crud_board_member.get_multi_by_board(db, board.id)
    data = BoardDetailResponse.model_validate(board)
    data.members = [BoardMemberResponse.model_validate(m) for m in members]
    return ResponseBase(data=data)


@router.patch("/{board_id}", response_model=ResponseBase[BoardResponse])
async def update_board(
    board_in: BoardUpdate,
    db: AsyncSession = Depends(get_db),
    board: Board = Depends(check_board_access),
):
    updated = await crud_board.update(db, db_obj=board, obj_in=board_in)
    return ResponseBase(data=BoardResponse.model_validate(updated))


@router.delete("/{board_id}", status_code=204)
async def delete_board(
    db: AsyncSession = Depends(get_db),
    board: Board = Depends(check_board_access),
):
    await crud_board.remove(db, id=board.id)


@router.post("/reorder", response_model=ResponseBase[list[BoardResponse]])
async def reorder_boards(
    body: BoardReorder,
    db: AsyncSession = Depends(get_db),
    project: Project = Depends(check_project_access),
):
    for i, bid in enumerate(body.board_ids):
        b = await crud_board.get(db, bid)
        if b and b.project_id == project.id:
            b.position = i
            db.add(b)
    await db.flush()
    boards = await crud_board.get_multi_by_project(db, project.id)
    return ResponseBase(
        data=[BoardResponse.model_validate(b) for b in boards]
    )


# --- Board Members ---

@router.get("/{board_id}/members", response_model=ResponseBase[list[BoardMemberResponse]])
async def list_board_members(
    db: AsyncSession = Depends(get_db),
    board: Board = Depends(check_board_access),
):
    members = await crud_board_member.get_multi_by_board(db, board.id)
    return ResponseBase(
        data=[BoardMemberResponse.model_validate(m) for m in members]
    )


@router.post("/{board_id}/members", response_model=ResponseBase[BoardMemberResponse], status_code=201)
async def add_board_member(
    member_in: BoardMemberCreate,
    db: AsyncSession = Depends(get_db),
    board: Board = Depends(check_board_access),
):
    existing = await crud_board_member.get_by_board_and_user(
        db, board.id, member_in.user_id
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User already a board member",
        )
    member = BoardMember(
        board_id=board.id,
        user_id=member_in.user_id,
        role=member_in.role,
    )
    db.add(member)
    await db.flush()
    await db.refresh(member)
    return ResponseBase(data=BoardMemberResponse.model_validate(member))


@router.patch("/{board_id}/members/{member_id}", response_model=ResponseBase[BoardMemberResponse])
async def update_board_member(
    member_id: UUID,
    member_in: BoardMemberUpdate,
    db: AsyncSession = Depends(get_db),
    board: Board = Depends(check_board_access),
):
    member = await crud_board_member.get(db, member_id)
    if not member or member.board_id != board.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Board member not found",
        )
    member.role = member_in.role
    db.add(member)
    await db.flush()
    await db.refresh(member)
    return ResponseBase(data=BoardMemberResponse.model_validate(member))


@router.delete("/{board_id}/members/{member_id}", status_code=204)
async def remove_board_member(
    member_id: UUID,
    db: AsyncSession = Depends(get_db),
    board: Board = Depends(check_board_access),
):
    member = await crud_board_member.get(db, member_id)
    if not member or member.board_id != board.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Board member not found",
        )
    await crud_board_member.remove(db, id=member_id)
