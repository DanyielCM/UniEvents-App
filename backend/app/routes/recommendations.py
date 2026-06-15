from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import require_role
from app.crud.event import get_recommended_events
from app.database import get_db
from app.models.user import User, UserRole
from app.schemas.event import EventResponse

router = APIRouter(prefix="/api/v1/recommendations", tags=["recommendations"])

StudentUser = Annotated[User, Depends(require_role(UserRole.STUDENT))]
DB = Annotated[AsyncSession, Depends(get_db)]


@router.get("", response_model=list[EventResponse])
async def get_recommendations(current_user: StudentUser, db: DB, limit: int = 6):
    return await get_recommended_events(db, current_user.id, limit=min(limit, 20))
