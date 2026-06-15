from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import require_role
from app.crud import favorite as fav_crud
from app.crud.event import get_event_by_id_raw
from app.database import get_db
from app.models.event import EventStatus
from app.models.user import User, UserRole
from app.schemas.event import EventResponse

router = APIRouter(prefix="/api/v1/favorites", tags=["favorites"])

StudentUser = Annotated[User, Depends(require_role(UserRole.STUDENT))]
DB = Annotated[AsyncSession, Depends(get_db)]


@router.get("/mine", response_model=list[EventResponse])
async def list_my_favorites(current_user: StudentUser, db: DB):
    return await fav_crud.get_favorited_events(db, current_user.id)


@router.get("/mine/ids", response_model=list[int])
async def list_my_favorite_ids(current_user: StudentUser, db: DB):
    return await fav_crud.get_favorite_event_ids(db, current_user.id)


@router.post("/events/{event_id}", status_code=status.HTTP_201_CREATED)
async def add_favorite(event_id: int, current_user: StudentUser, db: DB):
    event = await get_event_by_id_raw(db, event_id)
    if not event or event.status != EventStatus.APPROVED:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    await fav_crud.add_favorite(db, event_id, current_user.id)
    return {"ok": True}


@router.delete("/events/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_favorite(event_id: int, current_user: StudentUser, db: DB):
    await fav_crud.remove_favorite(db, event_id, current_user.id)
