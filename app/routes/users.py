from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.crud.user import deactivate_user, get_user_by_id, get_users, update_user
from app.database import get_db
from app.models.user import User
from app.schemas.user import UserResponse, UserUpdate

router = APIRouter(prefix="/users", tags=["users"])

CurrentUser = Annotated[User, Depends(get_current_user)]
DB = Annotated[AsyncSession, Depends(get_db)]


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: CurrentUser):
    return current_user


@router.get("/", response_model=list[UserResponse])
async def list_users(
    current_user: CurrentUser,
    db: DB,
    skip: int = 0,
    limit: int = 20,
):
    return await get_users(db, skip=skip, limit=limit)


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    current_user: CurrentUser,
    db: DB,
):
    user = await get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )
    return user


@router.patch("/me", response_model=UserResponse)
async def update_me(
    user_in: UserUpdate,
    current_user: CurrentUser,
    db: DB,
):
    return await update_user(db, current_user, user_in)


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def deactivate_me(
    current_user: CurrentUser,
    db: DB,
):
    await deactivate_user(db, current_user)
