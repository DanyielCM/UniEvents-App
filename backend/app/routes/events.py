from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user, require_role
from app.config import settings
from app.crud import event as event_crud
from app.crud.location import create_location
from app.crud.material import (
    create_material,
    delete_material,
    get_material_by_id,
    get_materials_by_event,
)
from app.database import get_db
from app.email_service import send_event_approved, send_event_rejected, send_event_submitted_to_admin
from app.models.event import EventStatus
from app.models.user import User, UserRole
from app.schemas.event import (
    AdminRejectRequest,
    EventCreate,
    EventDetailResponse,
    EventUpdate,
    SponsorCreate,
    SponsorResponse,
)
from app.schemas.material import MaterialResponse
from app.services.files import delete_file, save_upload

router = APIRouter(prefix="/api/v1/events", tags=["events"])

CurrentUser = Annotated[User, Depends(get_current_user)]
DB = Annotated[AsyncSession, Depends(get_db)]
OrganizerUser = Annotated[User, Depends(require_role(UserRole.ORGANIZER))]
AdminUser = Annotated[User, Depends(require_role(UserRole.ADMIN))]


async def _get_own_event_or_404(
    event_id: int,
    current_user: User,
    db: AsyncSession,
    allow_admin: bool = True,
) -> object:
    event = await event_crud.get_event_by_id_raw(db, event_id)
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    if allow_admin and current_user.role == UserRole.ADMIN:
        return event
    if event.organizer_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your event")
    return event


@router.post("/", response_model=EventDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_event(
    data: EventCreate,
    current_user: OrganizerUser,
    background: BackgroundTasks,
    db: DB,
):
    location_id = data.location_id
    if data.new_location and location_id is None:
        loc = await create_location(
            db,
            name=data.new_location.name,
            address=data.new_location.address,
            is_online=data.new_location.is_online,
        )
        location_id = loc.id

    event = await event_crud.create_event(db, current_user.id, data, location_id=location_id)
    return event


@router.get("/mine", response_model=list[EventDetailResponse])
async def list_my_events(
    current_user: OrganizerUser,
    db: DB,
    status_filter: EventStatus | None = None,
    skip: int = 0,
    limit: int = 20,
):
    return await event_crud.get_events_by_organizer(
        db, current_user.id, status=status_filter, skip=skip, limit=limit
    )


@router.get("/pending", response_model=list[EventDetailResponse])
async def list_pending_events(
    _admin: AdminUser,
    db: DB,
    skip: int = 0,
    limit: int = 50,
):
    return await event_crud.get_pending_events(db, skip=skip, limit=limit)


@router.get("/{event_id}", response_model=EventDetailResponse)
async def get_event(
    event_id: int,
    current_user: CurrentUser,
    db: DB,
):
    event = await event_crud.get_event_by_id(db, event_id)
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    if current_user.role == UserRole.ADMIN:
        return event
    if event.organizer_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your event")
    return event


@router.patch("/{event_id}", response_model=EventDetailResponse)
async def update_event(
    event_id: int,
    data: EventUpdate,
    current_user: CurrentUser,
    db: DB,
):
    _VISUAL_FIELDS = {"cover_image_position"}
    event = await _get_own_event_or_404(event_id, current_user, db)
    updated_fields = set(data.model_dump(exclude_unset=True, exclude={"new_location"}).keys())
    content_changes = updated_fields - _VISUAL_FIELDS
    if (
        content_changes
        and current_user.role != UserRole.ADMIN
        and event.status not in (EventStatus.DRAFT, EventStatus.REJECTED)
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Can only edit content of events in draft or rejected status",
        )

    location_id = None
    if data.new_location and data.location_id is None:
        loc = await create_location(
            db,
            name=data.new_location.name,
            address=data.new_location.address,
            is_online=data.new_location.is_online,
        )
        location_id = loc.id

    return await event_crud.update_event(db, event, data, location_id=location_id)


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_event(
    event_id: int,
    current_user: CurrentUser,
    db: DB,
):
    event = await _get_own_event_or_404(event_id, current_user, db)
    if current_user.role != UserRole.ADMIN and event.status not in (
        EventStatus.DRAFT,
        EventStatus.REJECTED,
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Can only delete events in draft or rejected status",
        )
    await event_crud.delete_event(db, event)


@router.post("/{event_id}/submit", response_model=EventDetailResponse)
async def submit_event(
    event_id: int,
    current_user: OrganizerUser,
    background: BackgroundTasks,
    db: DB,
):
    event = await _get_own_event_or_404(event_id, current_user, db, allow_admin=False)
    if event.status != EventStatus.DRAFT:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only draft events can be submitted for review",
        )
    updated = await event_crud.submit_event(db, event)
    if settings.ADMIN_SEED_EMAIL:
        background.add_task(
            send_event_submitted_to_admin,
            to=settings.ADMIN_SEED_EMAIL,
            event_title=updated.title,
            event_id=updated.id,
        )
    return updated


@router.post("/{event_id}/cover", response_model=EventDetailResponse)
async def upload_cover(
    event_id: int,
    current_user: CurrentUser,
    db: DB,
    cover: UploadFile = File(...),
):
    event = await _get_own_event_or_404(event_id, current_user, db)
    max_mb = event.max_file_size_mb or settings.UPLOAD_MAX_SIZE_MB
    result = await save_upload(cover, subdir="covers", max_size_mb=max_mb, upload_dir=settings.UPLOAD_DIR)
    if event.cover_image_path:
        delete_file(event.cover_image_path, settings.UPLOAD_DIR)
    return await event_crud.set_cover_image(db, event, result["filename"])


@router.post("/{event_id}/approve", response_model=EventDetailResponse)
async def approve_event(
    event_id: int,
    admin: AdminUser,
    background: BackgroundTasks,
    db: DB,
):
    event = await event_crud.get_event_by_id_raw(db, event_id)
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    if event.status != EventStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only pending events can be approved",
        )
    full = await event_crud.get_event_by_id(db, event_id)
    updated = await event_crud.approve_event(db, event, admin.id)
    background.add_task(
        send_event_approved,
        to=full.organizer.email,  # type: ignore[union-attr]
        organizer_name=full.organizer.first_name,  # type: ignore[union-attr]
        event_title=updated.title,
    )
    return updated


@router.post("/{event_id}/reject", response_model=EventDetailResponse)
async def reject_event(
    event_id: int,
    body: AdminRejectRequest,
    admin: AdminUser,
    background: BackgroundTasks,
    db: DB,
):
    event = await event_crud.get_event_by_id_raw(db, event_id)
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    if event.status != EventStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only pending events can be rejected",
        )
    full = await event_crud.get_event_by_id(db, event_id)
    updated = await event_crud.reject_event(db, event, body.reason)
    background.add_task(
        send_event_rejected,
        to=full.organizer.email,  # type: ignore[union-attr]
        organizer_name=full.organizer.first_name,  # type: ignore[union-attr]
        event_title=updated.title,
        reason=body.reason,
    )
    return updated


@router.post(
    "/{event_id}/sponsors",
    response_model=SponsorResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_sponsor(
    event_id: int,
    current_user: CurrentUser,
    db: DB,
    name: str = Form(...),
    website_url: str | None = Form(None),
    display_order: int = Form(0),
    logo: UploadFile | None = File(None),
):
    event = await _get_own_event_or_404(event_id, current_user, db)
    logo_path = None
    if logo and logo.filename:
        result = await save_upload(
            logo, subdir="logos", max_size_mb=5, upload_dir=settings.UPLOAD_DIR
        )
        logo_path = result["filename"]
    sponsor_data = SponsorCreate(name=name, website_url=website_url, display_order=display_order)
    return await event_crud.create_sponsor(db, event_id, sponsor_data, logo_path=logo_path)


@router.delete("/{event_id}/sponsors/{sponsor_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_sponsor(
    event_id: int,
    sponsor_id: int,
    current_user: CurrentUser,
    db: DB,
):
    await _get_own_event_or_404(event_id, current_user, db)
    sponsor = await event_crud.get_sponsor_by_id(db, sponsor_id)
    if not sponsor or sponsor.event_id != event_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sponsor not found")
    if sponsor.logo_path:
        delete_file(sponsor.logo_path, settings.UPLOAD_DIR)
    await event_crud.delete_sponsor(db, sponsor)


# ── Materials ─────────────────────────────────────────────────────────────────

@router.post(
    "/{event_id}/materials",
    response_model=MaterialResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_material(
    event_id: int,
    current_user: CurrentUser,
    db: DB,
    file: UploadFile = File(...),
):
    event = await _get_own_event_or_404(event_id, current_user, db)
    max_mb = event.max_file_size_mb or settings.UPLOAD_MAX_SIZE_MB

    if event.max_files:
        existing = await get_materials_by_event(db, event_id)
        if len(existing) >= event.max_files:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Maximum {event.max_files} materials allowed for this event",
            )

    info = await save_upload(
        file,
        subdir=f"materials/{event_id}",
        max_size_mb=max_mb,
        upload_dir=settings.UPLOAD_DIR,
    )
    return await create_material(db, event_id, current_user.id, info)


@router.get("/{event_id}/materials", response_model=list[MaterialResponse])
async def list_materials(
    event_id: int,
    current_user: CurrentUser,
    db: DB,
):
    await _get_own_event_or_404(event_id, current_user, db)
    return await get_materials_by_event(db, event_id)


@router.delete("/{event_id}/materials/{material_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_material_endpoint(
    event_id: int,
    material_id: int,
    current_user: CurrentUser,
    db: DB,
):
    await _get_own_event_or_404(event_id, current_user, db)
    material = await get_material_by_id(db, material_id)
    if not material or material.event_id != event_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Material not found")
    delete_file(material.filename, settings.UPLOAD_DIR)
    await delete_material(db, material)
