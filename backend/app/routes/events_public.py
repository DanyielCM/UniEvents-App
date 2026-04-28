import math
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.crud import feedback as fb_crud
from app.crud.event import get_event_by_id, get_public_events
from app.crud.material import get_materials_by_event
from app.crud.registration import count_confirmed
from app.crud.user import get_organizers_public
from app.database import get_db
from app.models.event import EventModality, EventStatus, ParticipationType
from app.schemas.event import EventDetailResponse, OrganizerBrief, PaginatedEvents
from app.schemas.feedback import FeedbackSummary
from app.schemas.material import MaterialResponse
from app.services.google_calendar import build_google_calendar_url
from app.services.ics import generate_ics_bytes
from app.services.qr import generate_qr_png

router = APIRouter(prefix="/api/v1/public", tags=["public"])

DB = Annotated[AsyncSession, Depends(get_db)]


async def _get_approved_event_or_404(db: AsyncSession, event_id: int):
    event = await get_event_by_id(db, event_id)
    if not event or event.status not in (EventStatus.APPROVED, EventStatus.COMPLETED):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    return event


@router.get("/events", response_model=PaginatedEvents)
async def list_public_events(
    db: DB,
    category_id: int | None = None,
    location_id: int | None = None,
    organizer_id: int | None = None,
    modality: EventModality | None = None,
    participation_type: ParticipationType | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    q: str | None = None,
    has_qr: bool | None = None,
    sort: str = "starts_at",
    page: int = 1,
    size: int = 12,
):
    size = min(size, 100)
    items, total = await get_public_events(
        db,
        category_id=category_id,
        location_id=location_id,
        organizer_id=organizer_id,
        modality=modality,
        participation_type=participation_type,
        date_from=date_from,
        date_to=date_to,
        q=q,
        has_qr=has_qr,
        sort=sort,
        page=page,
        size=size,
    )
    return PaginatedEvents(
        items=items,
        total=total,
        page=page,
        size=size,
        pages=math.ceil(total / size) if size else 1,
    )


@router.get("/events/{event_id}", response_model=EventDetailResponse)
async def get_public_event(event_id: int, db: DB):
    return await _get_approved_event_or_404(db, event_id)


@router.get("/events/{event_id}/ics")
async def download_ics(event_id: int, db: DB):
    event = await _get_approved_event_or_404(db, event_id)
    location_name = event.location.name if event.location else None  # type: ignore[union-attr]
    ics_bytes = generate_ics_bytes(
        title=event.title,
        starts_at=event.starts_at,
        ends_at=event.ends_at,
        location=location_name,
        description=event.description,
        uid=f"unievents-{event.id}@usv.ro",
    )
    return Response(
        content=ics_bytes,
        media_type="text/calendar; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="event-{event_id}.ics"'},
    )


@router.get("/events/{event_id}/gcal")
async def google_calendar_url(event_id: int, db: DB):
    event = await _get_approved_event_or_404(db, event_id)
    location_name = event.location.name if event.location else None  # type: ignore[union-attr]
    url = build_google_calendar_url(
        title=event.title,
        starts_at=event.starts_at,
        ends_at=event.ends_at,
        location=location_name,
        description=event.description,
    )
    return {"url": url}


@router.get("/events/{event_id}/qr.png")
async def get_event_qr(event_id: int, db: DB):
    event = await _get_approved_event_or_404(db, event_id)
    if not event.qr_token:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No QR code for this event")
    qr_content = f"{settings.FRONTEND_BASE_URL}/evenimente/{event_id}"
    png_bytes = generate_qr_png(qr_content, scale=8)
    return Response(content=png_bytes, media_type="image/png")


@router.get("/events/{event_id}/materials", response_model=list[MaterialResponse])
async def get_public_event_materials(event_id: int, db: DB):
    await _get_approved_event_or_404(db, event_id)
    return await get_materials_by_event(db, event_id)


@router.get("/events/{event_id}/registration-info")
async def get_registration_info(event_id: int, db: DB):
    event = await _get_approved_event_or_404(db, event_id)
    confirmed = await count_confirmed(db, event_id) if event.capacity else 0
    return {
        "capacity": event.capacity,
        "confirmed_count": confirmed,
        "is_full": bool(event.capacity and confirmed >= event.capacity),
        "participation_type": event.participation_type.value,
    }


@router.get("/events/{event_id}/feedback-summary", response_model=FeedbackSummary)
async def get_public_feedback_summary(event_id: int, db: DB):
    await _get_approved_event_or_404(db, event_id)
    return await fb_crud.get_summary(db, event_id)


@router.get("/organizers", response_model=list[OrganizerBrief])
async def list_public_organizers(db: DB):
    return await get_organizers_public(db)
