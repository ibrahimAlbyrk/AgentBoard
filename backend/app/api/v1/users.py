from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.crud import crud_user
from app.models.user import User
from app.schemas.base import ResponseBase
from app.schemas.user import UserResponse, UserUpdate

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=ResponseBase[UserResponse])
async def get_me(current_user: User = Depends(get_current_user)):
    return ResponseBase(data=UserResponse.model_validate(current_user))


@router.patch("/me", response_model=ResponseBase[UserResponse])
async def update_me(
    user_in: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user = await crud_user.update(db, db_obj=current_user, obj_in=user_in)
    return ResponseBase(data=UserResponse.model_validate(user))


@router.get("/{user_id}", response_model=ResponseBase[UserResponse])
async def get_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    user = await crud_user.get(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )
    return ResponseBase(data=UserResponse.model_validate(user))
