from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user, require_role
from app.crud.location import create_location, get_locations
from app.database import get_db
from app.models.user import User, UserRole
from app.schemas.event import LocationInline, LocationResponse

router = APIRouter(prefix="/api/v1/locations", tags=["locations"])

DB = Annotated[AsyncSession, Depends(get_db)]


@router.get("/", response_model=list[LocationResponse])
async def list_locations(
    _user: Annotated[User, Depends(get_current_user)],
    db: DB,
    skip: int = 0,
    limit: int = 100,
):
    return await get_locations(db, skip=skip, limit=limit)


@router.post("/", response_model=LocationResponse, status_code=status.HTTP_201_CREATED)
async def create_location_endpoint(
    data: LocationInline,
    _user: Annotated[User, Depends(require_role(UserRole.ORGANIZER, UserRole.ADMIN))],
    db: DB,
):
    return await create_location(db, name=data.name, address=data.address, is_online=data.is_online)
