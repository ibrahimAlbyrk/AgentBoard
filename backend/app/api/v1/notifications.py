from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.crud import crud_notification
from app.models.user import User
from app.schemas.base import PaginatedResponse, PaginationMeta
from app.schemas.notification import NotificationMarkRead, NotificationResponse

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("/", response_model=PaginatedResponse[NotificationResponse])
async def list_notifications(
    page: int = Query(1, ge=1),
    per_page: int = Query(30, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    skip = (page - 1) * per_page
    items = await crud_notification.get_by_user(
        db, current_user.id, skip=skip, limit=per_page
    )
    total = await crud_notification.count(
        db, filters={"user_id": current_user.id}
    )
    return PaginatedResponse(
        data=[NotificationResponse.model_validate(n) for n in items],
        pagination=PaginationMeta(
            page=page,
            per_page=per_page,
            total=total,
            total_pages=(total + per_page - 1) // per_page if total else 0,
        ),
    )


@router.get("/unread-count")
async def unread_count(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    count = await crud_notification.count_unread(db, current_user.id)
    return {"count": count}


@router.put("/read")
async def mark_read(
    body: NotificationMarkRead,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if body.mark_all:
        await crud_notification.mark_all_read(db, current_user.id)
    elif body.notification_ids:
        for nid in body.notification_ids:
            await crud_notification.mark_read(db, nid)
    await db.commit()
    return {"success": True}
