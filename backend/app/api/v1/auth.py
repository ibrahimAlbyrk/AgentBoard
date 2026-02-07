from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.auth import RefreshRequest, TokenResponse
from app.schemas.base import ResponseBase
from app.schemas.user import UserCreate, UserResponse
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=ResponseBase[TokenResponse], status_code=201)
async def register(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    result = await AuthService.register(db, user_in)
    return ResponseBase(
        data=TokenResponse(
            access_token=result["access_token"],
            refresh_token=result["refresh_token"],
            user=UserResponse.model_validate(result["user"]),
        )
    )


@router.post("/login", response_model=ResponseBase[TokenResponse])
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    result = await AuthService.login(db, form_data.username, form_data.password)
    return ResponseBase(
        data=TokenResponse(
            access_token=result["access_token"],
            refresh_token=result["refresh_token"],
            user=UserResponse.model_validate(result["user"]),
        )
    )


@router.post("/refresh")
async def refresh(body: RefreshRequest):
    result = await AuthService.refresh_token(body.refresh_token)
    return ResponseBase(data=result)
