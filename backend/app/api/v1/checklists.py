from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import check_board_access, get_current_user
from app.core.database import get_db
from app.crud import crud_activity_log, crud_task
from app.crud.checklist import crud_checklist
from app.crud.checklist_item import crud_checklist_item
from app.models.board import Board
from app.models.user import User
from app.schemas.base import ResponseBase
from app.schemas.checklist import (
    ChecklistCreate,
    ChecklistItemCreate,
    ChecklistItemReorder,
    ChecklistItemResponse,
    ChecklistItemUpdate,
    ChecklistReorder,
    ChecklistResponse,
    ChecklistUpdate,
)
from app.services.checklist_service import ChecklistService
from app.services.websocket_manager import manager

router = APIRouter(
    prefix="/projects/{project_id}/boards/{board_id}/tasks/{task_id}/checklists",
    tags=["Checklists"],
)


async def _get_task_or_404(task_id: UUID, board: Board, db: AsyncSession):
    task = await crud_task.get(db, task_id)
    if not task or task.board_id != board.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return task


async def _get_checklist_or_404(checklist_id: UUID, task_id: UUID, db: AsyncSession):
    checklist = await crud_checklist.get_with_items(db, checklist_id)
    if not checklist or checklist.task_id != task_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Checklist not found")
    return checklist


async def _broadcast_checklist_update(board: Board, task_id: UUID):
    await manager.broadcast_to_board(
        str(board.project_id),
        str(board.id),
        {
            "type": "checklist.updated",
            "project_id": str(board.project_id),
            "board_id": str(board.id),
            "data": {"task_id": str(task_id)},
        },
    )


# -- Checklist CRUD --

@router.get("/", response_model=ResponseBase[list[ChecklistResponse]])
async def list_checklists(
    task_id: UUID,
    db: AsyncSession = Depends(get_db),
    board: Board = Depends(check_board_access),
):
    await _get_task_or_404(task_id, board, db)
    checklists = await crud_checklist.get_multi_by_task(db, task_id)
    return ResponseBase(data=[ChecklistResponse.model_validate(c) for c in checklists])


@router.post("/", response_model=ResponseBase[ChecklistResponse], status_code=201)
async def create_checklist(
    task_id: UUID,
    body: ChecklistCreate,
    db: AsyncSession = Depends(get_db),
    board: Board = Depends(check_board_access),
    current_user: User = Depends(get_current_user),
):
    task = await _get_task_or_404(task_id, board, db)
    checklist = await ChecklistService.create_checklist(db, task, current_user.id, body)
    await _broadcast_checklist_update(board, task_id)
    return ResponseBase(data=ChecklistResponse.model_validate(checklist))


@router.patch("/{checklist_id}", response_model=ResponseBase[ChecklistResponse])
async def update_checklist(
    task_id: UUID,
    checklist_id: UUID,
    body: ChecklistUpdate,
    db: AsyncSession = Depends(get_db),
    board: Board = Depends(check_board_access),
    current_user: User = Depends(get_current_user),
):
    checklist = await _get_checklist_or_404(checklist_id, task_id, db)
    updated = await ChecklistService.update_checklist(db, checklist, current_user.id, body)
    await _broadcast_checklist_update(board, task_id)
    return ResponseBase(data=ChecklistResponse.model_validate(updated))


@router.delete("/{checklist_id}", status_code=204)
async def delete_checklist(
    task_id: UUID,
    checklist_id: UUID,
    db: AsyncSession = Depends(get_db),
    board: Board = Depends(check_board_access),
    current_user: User = Depends(get_current_user),
):
    checklist = await _get_checklist_or_404(checklist_id, task_id, db)
    await ChecklistService.delete_checklist(db, checklist, current_user.id)
    await _broadcast_checklist_update(board, task_id)


@router.patch("/{checklist_id}/reorder", response_model=ResponseBase[ChecklistResponse])
async def reorder_checklist(
    task_id: UUID,
    checklist_id: UUID,
    body: ChecklistReorder,
    db: AsyncSession = Depends(get_db),
    board: Board = Depends(check_board_access),
):
    checklist = await _get_checklist_or_404(checklist_id, task_id, db)
    checklist.position = body.position
    db.add(checklist)
    await db.flush()
    await db.refresh(checklist)
    await _broadcast_checklist_update(board, task_id)
    return ResponseBase(data=ChecklistResponse.model_validate(checklist))


# -- Checklist Item CRUD --

@router.post("/{checklist_id}/items", response_model=ResponseBase[ChecklistItemResponse], status_code=201)
async def create_item(
    task_id: UUID,
    checklist_id: UUID,
    body: ChecklistItemCreate,
    db: AsyncSession = Depends(get_db),
    board: Board = Depends(check_board_access),
    current_user: User = Depends(get_current_user),
):
    checklist = await _get_checklist_or_404(checklist_id, task_id, db)
    item = await ChecklistService.create_item(db, checklist, current_user.id, body)
    await _broadcast_checklist_update(board, task_id)
    return ResponseBase(data=ChecklistItemResponse.model_validate(item))


@router.patch("/{checklist_id}/items/{item_id}", response_model=ResponseBase[ChecklistItemResponse])
async def update_item(
    task_id: UUID,
    checklist_id: UUID,
    item_id: UUID,
    body: ChecklistItemUpdate,
    db: AsyncSession = Depends(get_db),
    board: Board = Depends(check_board_access),
    current_user: User = Depends(get_current_user),
):
    await _get_checklist_or_404(checklist_id, task_id, db)
    item = await crud_checklist_item.get(db, item_id)
    if not item or item.checklist_id != checklist_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    updated = await ChecklistService.update_item(db, item, current_user.id, body)
    await _broadcast_checklist_update(board, task_id)
    return ResponseBase(data=ChecklistItemResponse.model_validate(updated))


@router.delete("/{checklist_id}/items/{item_id}", status_code=204)
async def delete_item(
    task_id: UUID,
    checklist_id: UUID,
    item_id: UUID,
    db: AsyncSession = Depends(get_db),
    board: Board = Depends(check_board_access),
    current_user: User = Depends(get_current_user),
):
    checklist = await _get_checklist_or_404(checklist_id, task_id, db)
    item = await crud_checklist_item.get(db, item_id)
    if not item or item.checklist_id != checklist_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    await crud_activity_log.log(
        db,
        project_id=board.project_id,
        user_id=current_user.id,
        action="updated",
        entity_type="task",
        task_id=task_id,
        changes={"checklist_item": f'removed "{item.title}"'},
    )
    await crud_checklist_item.remove(db, id=item_id)
    await _broadcast_checklist_update(board, task_id)


@router.post("/{checklist_id}/items/{item_id}/toggle", response_model=ResponseBase[ChecklistItemResponse])
async def toggle_item(
    task_id: UUID,
    checklist_id: UUID,
    item_id: UUID,
    db: AsyncSession = Depends(get_db),
    board: Board = Depends(check_board_access),
    current_user: User = Depends(get_current_user),
):
    await _get_checklist_or_404(checklist_id, task_id, db)
    item = await crud_checklist_item.get(db, item_id)
    if not item or item.checklist_id != checklist_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    toggled = await ChecklistService.toggle_item(db, item, current_user.id)
    await _broadcast_checklist_update(board, task_id)
    return ResponseBase(data=ChecklistItemResponse.model_validate(toggled))


@router.patch("/{checklist_id}/items/{item_id}/reorder", response_model=ResponseBase[ChecklistItemResponse])
async def reorder_item(
    task_id: UUID,
    checklist_id: UUID,
    item_id: UUID,
    body: ChecklistItemReorder,
    db: AsyncSession = Depends(get_db),
    board: Board = Depends(check_board_access),
):
    await _get_checklist_or_404(checklist_id, task_id, db)
    item = await crud_checklist_item.get(db, item_id)
    if not item or item.checklist_id != checklist_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    item.position = body.position
    db.add(item)
    await db.flush()
    await db.refresh(item)
    await _broadcast_checklist_update(board, task_id)
    return ResponseBase(data=ChecklistItemResponse.model_validate(item))
