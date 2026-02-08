from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import check_board_access, get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.crud import crud_attachment, crud_task
from app.models.attachment import Attachment
from app.models.board import Board
from app.models.user import User
from app.schemas.attachment import AttachmentResponse
from app.schemas.base import PaginatedResponse, PaginationMeta, ResponseBase
from app.services.storage_service import storage

router = APIRouter(
    prefix="/projects/{project_id}/boards/{board_id}/tasks/{task_id}/attachments",
    tags=["Attachments"],
)


async def _get_task_or_404(task_id: UUID, board: Board, db: AsyncSession):
    task = await crud_task.get(db, task_id)
    if not task or task.board_id != board.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Task not found"
        )
    return task


@router.post("/", response_model=ResponseBase[AttachmentResponse], status_code=201)
async def upload_attachment(
    task_id: UUID,
    file: UploadFile,
    db: AsyncSession = Depends(get_db),
    board: Board = Depends(check_board_access),
    current_user: User = Depends(get_current_user),
):
    await _get_task_or_404(task_id, board, db)

    content = await file.read()
    if len(content) > settings.MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Maximum size is {settings.MAX_FILE_SIZE // (1024 * 1024)}MB",
        )
    await file.seek(0)

    file_path, file_size = await storage.save(file, str(task_id))

    attachment = Attachment(
        task_id=task_id,
        user_id=current_user.id,
        filename=file.filename or "unnamed",
        file_path=file_path,
        file_size=file_size,
        mime_type=file.content_type or "application/octet-stream",
    )
    db.add(attachment)
    await db.flush()
    await db.refresh(attachment, ["user"])

    return ResponseBase(data=AttachmentResponse.model_validate(attachment))


@router.get("/", response_model=PaginatedResponse[AttachmentResponse])
async def list_attachments(
    task_id: UUID,
    db: AsyncSession = Depends(get_db),
    board: Board = Depends(check_board_access),
):
    await _get_task_or_404(task_id, board, db)
    attachments = await crud_attachment.get_by_task(db, task_id)
    return PaginatedResponse(
        data=[AttachmentResponse.model_validate(a) for a in attachments],
        pagination=PaginationMeta(
            page=1,
            per_page=len(attachments),
            total=len(attachments),
            total_pages=1,
        ),
    )


@router.delete("/{attachment_id}", status_code=204)
async def delete_attachment(
    task_id: UUID,
    attachment_id: UUID,
    db: AsyncSession = Depends(get_db),
    board: Board = Depends(check_board_access),
    current_user: User = Depends(get_current_user),
):
    attachment = await crud_attachment.get(db, attachment_id)
    if not attachment or attachment.task_id != task_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Attachment not found"
        )
    if attachment.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Can only delete own attachments",
        )
    await storage.delete(attachment.file_path)
    await crud_attachment.remove(db, id=attachment_id)


# Separate router for download (not task-scoped)
download_router = APIRouter(prefix="/attachments", tags=["Attachments"])


@download_router.get("/{attachment_id}/download")
async def download_attachment(
    attachment_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    attachment = await crud_attachment.get(db, attachment_id)
    if not attachment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Attachment not found"
        )
    file_path = storage.get_path(attachment.file_path)
    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="File not found on disk"
        )
    return FileResponse(
        path=str(file_path),
        filename=attachment.filename,
        media_type=attachment.mime_type,
    )
