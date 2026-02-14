from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.errors import NotFoundError, PermissionError_
from app.crud import crud_project, crud_webhook
from app.models.user import User
from app.schemas.base import ResponseBase
from app.schemas.webhook import WebhookCreate, WebhookResponse, WebhookUpdate

VALID_EVENTS = {
    "task.created", "task.updated", "task.moved", "task.deleted",
    "comment.created", "comment.deleted",
    "subtask.created", "subtask.deleted",
    "reaction.added",
}

router = APIRouter(
    prefix="/projects/{project_id}/webhooks", tags=["Webhooks"]
)


async def _check_project_owner(
    project_id: UUID, current_user: User, db: AsyncSession
) -> None:
    project = await crud_project.get(db, project_id)
    if not project:
        raise NotFoundError("Project not found")
    if project.owner_id != current_user.id:
        raise PermissionError_("Only project owner can manage webhooks")


@router.get("/", response_model=ResponseBase[list[WebhookResponse]])
async def list_webhooks(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _check_project_owner(project_id, current_user, db)
    webhooks = await crud_webhook.get_multi_by_project(db, project_id)
    return ResponseBase(data=[WebhookResponse.model_validate(w) for w in webhooks])


@router.post("/", response_model=ResponseBase[WebhookResponse], status_code=201)
async def create_webhook(
    project_id: UUID,
    body: WebhookCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _check_project_owner(project_id, current_user, db)
    from app.models.webhook import Webhook
    webhook = Webhook(
        project_id=project_id,
        url=str(body.url),
        events=body.events,
        secret=body.secret,
    )
    db.add(webhook)
    await db.commit()
    await db.refresh(webhook)
    return ResponseBase(data=WebhookResponse.model_validate(webhook))


@router.patch("/{webhook_id}", response_model=ResponseBase[WebhookResponse])
async def update_webhook(
    project_id: UUID,
    webhook_id: UUID,
    body: WebhookUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _check_project_owner(project_id, current_user, db)
    webhook = await crud_webhook.get(db, webhook_id)
    if not webhook or webhook.project_id != project_id:
        raise NotFoundError("Webhook not found")
    update_data = body.model_dump(exclude_unset=True)
    if "url" in update_data:
        update_data["url"] = str(update_data["url"])
    for field, value in update_data.items():
        setattr(webhook, field, value)
    db.add(webhook)
    await db.commit()
    await db.refresh(webhook)
    return ResponseBase(data=WebhookResponse.model_validate(webhook))


@router.delete("/{webhook_id}", status_code=204)
async def delete_webhook(
    project_id: UUID,
    webhook_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _check_project_owner(project_id, current_user, db)
    webhook = await crud_webhook.get(db, webhook_id)
    if not webhook or webhook.project_id != project_id:
        raise NotFoundError("Webhook not found")
    await crud_webhook.remove(db, id=webhook_id)
