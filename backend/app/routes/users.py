from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user, require_role
from app.crud.user import (
    count_users,
    create_organizer_with_plain_password,
    deactivate_user,
    get_user_by_email,
    get_user_by_id,
    get_users,
    set_user_active,
    set_user_role,
    update_user,
)
from app.database import get_db
from app.email_service import send_organizer_created_by_admin
from app.models.user import User, UserRole
from app.schemas.organizer_request import OrganizerCreateByAdmin
from app.schemas.user import PaginatedUsers, UserAdminUpdate, UserResponse, UserUpdate

router = APIRouter(prefix="/api/v1/users", tags=["users"])

CurrentUser = Annotated[User, Depends(get_current_user)]
DB = Annotated[AsyncSession, Depends(get_db)]
AdminUser = Annotated[User, Depends(require_role(UserRole.ADMIN))]


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: CurrentUser):
    return current_user


@router.get("/", response_model=PaginatedUsers)
async def list_users(
    _admin: AdminUser,
    db: DB,
    role: UserRole | None = None,
    q: str | None = None,
    is_active: bool | None = None,
    page: int = 1,
    size: int = 20,
):
    size = min(size, 100)
    items = await get_users(
        db, skip=(page - 1) * size, limit=size, role=role, q=q, is_active=is_active
    )
    total = await count_users(db, role=role, q=q, is_active=is_active)
    return PaginatedUsers(items=items, total=total, page=page, size=size)


@router.post(
    "/organizers", response_model=UserResponse, status_code=status.HTTP_201_CREATED
)
async def create_organizer_direct(
    data: OrganizerCreateByAdmin,
    _admin: Annotated[User, Depends(require_role(UserRole.ADMIN))],
    background: BackgroundTasks,
    db: DB,
):
    existing = await get_user_by_email(db, data.email)
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Există deja un cont cu această adresă de email.",
        )

    user = await create_organizer_with_plain_password(
        db,
        email=data.email,
        password=data.password,
        first_name=data.first_name,
        last_name=data.last_name,
        organization=data.organization,
    )
    background.add_task(
        send_organizer_created_by_admin,
        to=user.email,
        first_name=user.first_name,
        temporary_password=data.password,
    )
    return user


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    current_user: Annotated[User, Depends(require_role(UserRole.ADMIN))],
    db: DB,
):
    user = await get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )
    return user


@router.patch("/{user_id}", response_model=UserResponse)
async def update_user_admin(
    user_id: int,
    data: UserAdminUpdate,
    current_user: AdminUser,
    db: DB,
):
    user = await get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    if user_id == current_user.id:
        if data.role is not None and data.role != user.role:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Nu îți poți schimba propriul rol.",
            )
        if data.is_active is False:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Nu îți poți dezactiva propriul cont.",
            )

    if data.role is not None:
        user = await set_user_role(db, user, data.role)
    if data.is_active is not None:
        user = await set_user_active(db, user, data.is_active)
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
