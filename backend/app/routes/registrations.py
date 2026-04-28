import csv
import io
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from fastapi.responses import Response, StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user, require_role
from app.config import settings
from app.crud import registration as reg_crud
from app.crud.event import get_event_by_id, get_event_by_id_raw
from app.database import get_db
from app.email_service import (
    send_registration_confirmed,
    send_registration_cancelled,
    send_waitlist_promoted,
)
from app.models.event import EventStatus, ParticipationType
from app.models.registration import RegistrationStatus
from app.models.user import User, UserRole
from app.schemas.registration import (
    CheckinRequest,
    ParticipantResponse,
    RegistrationResponse,
)
from app.services.qr import generate_qr_png

router = APIRouter(prefix="/api/v1/registrations", tags=["registrations"])

CurrentUser = Annotated[User, Depends(get_current_user)]
StudentUser = Annotated[User, Depends(require_role(UserRole.STUDENT))]
DB = Annotated[AsyncSession, Depends(get_db)]


async def _get_approved_event(db: AsyncSession, event_id: int):
    event = await get_event_by_id_raw(db, event_id)
    if not event or event.status != EventStatus.APPROVED:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    return event


async def _assert_organizer_access(event, current_user: User):
    if current_user.role == UserRole.ADMIN:
        return
    if current_user.role != UserRole.ORGANIZER or event.organizer_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")


# ── Student endpoints ─────────────────────────────────────────────────────────

@router.get("/mine", response_model=list[RegistrationResponse])
async def my_registrations(current_user: StudentUser, db: DB):
    return await reg_crud.get_by_user(db, current_user.id)


@router.get("/events/{event_id}/mine", response_model=RegistrationResponse)
async def my_registration_for_event(
    event_id: int, current_user: StudentUser, db: DB
):
    reg = await reg_crud.get_by_event_user(db, event_id, current_user.id)
    if not reg or reg.status == RegistrationStatus.CANCELLED:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not registered")
    # Reload with event details
    from app.crud.registration import _load_event
    from sqlalchemy import select
    from app.models.registration import Registration
    result = await db.execute(
        select(Registration).options(*_load_event()).where(Registration.id == reg.id)
    )
    return result.scalar_one()


@router.post("/events/{event_id}", response_model=RegistrationResponse, status_code=status.HTTP_201_CREATED)
async def register_for_event(
    event_id: int,
    current_user: StudentUser,
    background: BackgroundTasks,
    db: DB,
):
    event = await _get_approved_event(db, event_id)

    if event.participation_type == ParticipationType.FREE:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This event does not require registration",
        )

    if event.registration_deadline and event.registration_deadline < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Registration deadline has passed",
        )

    existing = await reg_crud.get_by_event_user(db, event_id, current_user.id)
    if existing and existing.status != RegistrationStatus.CANCELLED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Already registered for this event",
        )

    is_full = False
    if event.capacity:
        confirmed = await reg_crud.count_confirmed(db, event_id)
        if confirmed >= event.capacity:
            is_full = True

    reg = await reg_crud.create(db, event_id, current_user.id, waitlisted=is_full)
    if not is_full:
        background.add_task(
            send_registration_confirmed,
            to=current_user.email,
            first_name=current_user.first_name,
            event_title=event.title,
            event_start=event.starts_at.strftime("%d %b %Y, %H:%M"),
            ticket_token=reg.ticket_token or "",
            ticket_url=f"{settings.FRONTEND_BASE_URL}/inscrierile-mele",
        )
    return reg


@router.delete("/events/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_registration(
    event_id: int,
    current_user: StudentUser,
    background: BackgroundTasks,
    db: DB,
):
    reg = await reg_crud.get_by_event_user(db, event_id, current_user.id)
    if not reg or reg.status in (RegistrationStatus.CANCELLED, RegistrationStatus.ATTENDED):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Active registration not found",
        )
    was_confirmed = reg.status == RegistrationStatus.CONFIRMED
    event = await get_event_by_id_raw(db, event_id)
    await reg_crud.cancel(db, reg)
    if event:
        background.add_task(
            send_registration_cancelled,
            to=current_user.email,
            first_name=current_user.first_name,
            event_title=event.title,
        )

    # Auto-promote the first waitlisted registration when a confirmed slot opens
    if was_confirmed and event and event.capacity:
        first_waitlisted = await reg_crud.get_first_waitlisted(db, event_id)
        if first_waitlisted:
            promoted = await reg_crud.promote_from_waitlist(db, first_waitlisted)
            background.add_task(
                send_waitlist_promoted,
                to=promoted.user.email,
                first_name=promoted.user.first_name,
                event_title=event.title,
                ticket_url=f"{settings.FRONTEND_BASE_URL}/inscrierile-mele",
            )


@router.get("/{reg_id}/qr.png")
async def ticket_qr(reg_id: int, current_user: StudentUser, db: DB):
    reg = await reg_crud.get_by_id(db, reg_id)
    if not reg or reg.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Registration not found")
    if not reg.ticket_token:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No ticket for this registration")
    png = generate_qr_png(reg.ticket_token, scale=10)
    return Response(content=png, media_type="image/png")


# ── Organizer / admin endpoints ───────────────────────────────────────────────

@router.get("/events/{event_id}/participants", response_model=list[ParticipantResponse])
async def list_participants(
    event_id: int,
    current_user: CurrentUser,
    db: DB,
    status_filter: RegistrationStatus | None = None,
    skip: int = 0,
    limit: int = 100,
):
    event = await get_event_by_id_raw(db, event_id)
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    await _assert_organizer_access(event, current_user)
    participants, _ = await reg_crud.get_by_event(db, event_id, status=status_filter, skip=skip, limit=limit)
    return participants


@router.get("/events/{event_id}/export")
async def export_participants_csv(
    event_id: int,
    current_user: CurrentUser,
    db: DB,
):
    event = await get_event_by_id_raw(db, event_id)
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    await _assert_organizer_access(event, current_user)

    participants, _ = await reg_crud.get_by_event(db, event_id, limit=10000)

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["ID", "First Name", "Last Name", "Email", "Status", "Registered At", "Checked In At"])
    for p in participants:
        writer.writerow([
            p.id,
            p.user.first_name,
            p.user.last_name,
            p.user.email,
            p.status.value,
            p.registered_at.strftime("%Y-%m-%d %H:%M"),
            p.checked_in_at.strftime("%Y-%m-%d %H:%M") if p.checked_in_at else "",
        ])

    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="participants-event-{event_id}.csv"'},
    )


@router.post("/events/{event_id}/check-in", response_model=ParticipantResponse)
async def checkin_participant(
    event_id: int,
    body: CheckinRequest,
    current_user: CurrentUser,
    db: DB,
):
    event = await get_event_by_id_raw(db, event_id)
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    await _assert_organizer_access(event, current_user)

    reg = await reg_crud.get_by_ticket_token(db, body.ticket_token)
    if not reg or reg.event_id != event_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid ticket token")
    if reg.status == RegistrationStatus.ATTENDED:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Already checked in")
    if reg.status != RegistrationStatus.CONFIRMED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Registration status is '{reg.status.value}', cannot check in",
        )
    return await reg_crud.checkin(db, reg)
