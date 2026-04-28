from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user, require_role
from app.crud import feedback as fb_crud
from app.crud.event import get_event_by_id_raw
from app.database import get_db
from app.models.event import EventStatus
from app.models.user import User, UserRole
from app.schemas.feedback import (
    FeedbackCreate,
    FeedbackResponse,
    FeedbackSummary,
    MyFeedbackResponse,
)

router = APIRouter(prefix="/api/v1/feedback", tags=["feedback"])

DB = Annotated[AsyncSession, Depends(get_db)]
StudentUser = Annotated[User, Depends(require_role(UserRole.STUDENT))]
CurrentUser = Annotated[User, Depends(get_current_user)]


async def _assert_organizer(event, current_user: User):
    if current_user.role == UserRole.ADMIN:
        return
    if current_user.role != UserRole.ORGANIZER or event.organizer_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")


@router.post(
    "/events/{event_id}",
    response_model=MyFeedbackResponse,
    status_code=status.HTTP_201_CREATED,
)
async def submit_feedback(
    event_id: int,
    data: FeedbackCreate,
    current_user: StudentUser,
    db: DB,
):
    event = await get_event_by_id_raw(db, event_id)
    if not event or event.status == EventStatus.DRAFT:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    if (
        event.status != EventStatus.COMPLETED
        and event.ends_at > datetime.now(timezone.utc)
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Event has not ended yet",
        )

    existing = await fb_crud.get_by_event_user(db, event_id, current_user.id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You have already submitted feedback for this event",
        )

    return await fb_crud.create(db, event_id, current_user.id, data)


@router.get("/events/{event_id}/mine", response_model=MyFeedbackResponse)
async def get_my_feedback(event_id: int, current_user: StudentUser, db: DB):
    fb = await fb_crud.get_by_event_user(db, event_id, current_user.id)
    if not fb:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No feedback submitted")
    return fb


@router.get("/events/{event_id}", response_model=list[FeedbackResponse])
async def list_event_feedback(
    event_id: int,
    current_user: CurrentUser,
    db: DB,
    skip: int = 0,
    limit: int = 100,
):
    event = await get_event_by_id_raw(db, event_id)
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    await _assert_organizer(event, current_user)
    return await fb_crud.get_by_event(db, event_id, skip=skip, limit=limit)


@router.get("/events/{event_id}/summary", response_model=FeedbackSummary)
async def get_event_feedback_summary(
    event_id: int,
    current_user: CurrentUser,
    db: DB,
):
    event = await get_event_by_id_raw(db, event_id)
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    await _assert_organizer(event, current_user)
    return await fb_crud.get_summary(db, event_id)
