from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.crud import crud_api_key
from app.models.user import User
from app.schemas.api_key import APIKeyCreate, APIKeyCreatedResponse, APIKeyResponse
from app.schemas.base import ResponseBase
from app.services.auth_service import AuthService

router = APIRouter(prefix="/api-keys", tags=["API Keys"])


@router.get("/", response_model=ResponseBase[list[APIKeyResponse]])
async def list_api_keys(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    keys = await crud_api_key.get_multi_by_user(db, current_user.id)
    return ResponseBase(data=[APIKeyResponse.model_validate(k) for k in keys])


@router.post("/", response_model=ResponseBase[APIKeyCreatedResponse], status_code=201)
async def create_api_key(
    key_in: APIKeyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = await crud_api_key.get_by_name_and_user(
        db, key_in.name, current_user.id
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An API key with this name already exists",
        )
    result = await AuthService.create_api_key(db, current_user.id, key_in)
    api_key = result["api_key"]
    return ResponseBase(
        data=APIKeyCreatedResponse(
            id=api_key.id,
            name=api_key.name,
            key=result["raw_key"],
            prefix=api_key.prefix,
            scopes=api_key.scopes or [],
            expires_at=api_key.expires_at,
            created_at=api_key.created_at,
        )
    )


@router.delete("/{key_id}", status_code=204)
async def delete_api_key(
    key_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    key = await crud_api_key.get(db, key_id)
    if not key or key.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="API key not found"
        )
    key.is_active = False
    db.add(key)
    await db.flush()
