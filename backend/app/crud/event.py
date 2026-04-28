import re
import secrets
import unicodedata
import uuid
from datetime import datetime, timezone

from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.event import Event, EventModality, EventStatus, ParticipationType
from app.models.sponsor import Sponsor
from app.schemas.event import EventCreate, EventUpdate, SponsorCreate


def _slugify(text: str) -> str:
    text = unicodedata.normalize("NFKD", text)
    text = text.encode("ascii", "ignore").decode("ascii")
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-") or "event"


def _with_relations():
    return [
        selectinload(Event.category),
        selectinload(Event.location),
        selectinload(Event.organizer),
        selectinload(Event.sponsors),
    ]


async def get_event_by_id(db: AsyncSession, event_id: int) -> Event | None:
    result = await db.execute(
        select(Event).options(*_with_relations()).where(Event.id == event_id)
    )
    return result.scalar_one_or_none()


async def get_event_by_id_raw(db: AsyncSession, event_id: int) -> Event | None:
    result = await db.execute(select(Event).where(Event.id == event_id))
    return result.scalar_one_or_none()


async def get_events_by_organizer(
    db: AsyncSession,
    organizer_id: int,
    status: EventStatus | None = None,
    skip: int = 0,
    limit: int = 20,
) -> list[Event]:
    q = (
        select(Event)
        .options(*_with_relations())
        .where(Event.organizer_id == organizer_id)
    )
    if status is not None:
        q = q.where(Event.status == status)
    q = q.order_by(Event.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(q)
    return list(result.scalars().all())


async def get_pending_events(
    db: AsyncSession, skip: int = 0, limit: int = 50
) -> list[Event]:
    result = await db.execute(
        select(Event)
        .options(*_with_relations())
        .where(Event.status == EventStatus.PENDING)
        .order_by(Event.created_at.asc())
        .offset(skip)
        .limit(limit)
    )
    return list(result.scalars().all())


async def create_event(
    db: AsyncSession,
    organizer_id: int,
    data: EventCreate,
    location_id: int | None = None,
) -> Event:
    slug = _slugify(data.title) + "-" + uuid.uuid4().hex[:8]
    event = Event(
        title=data.title,
        slug=slug,
        description=data.description,
        starts_at=data.starts_at,
        ends_at=data.ends_at,
        location_id=location_id if location_id is not None else data.location_id,
        category_id=data.category_id,
        organizer_id=organizer_id,
        modality=data.modality,
        participation_type=data.participation_type,
        registration_link=data.registration_link,
        registration_deadline=data.registration_deadline,
        capacity=data.capacity,
        max_file_size_mb=data.max_file_size_mb,
        max_files=data.max_files,
        cover_image_position=data.cover_image_position,
        status=EventStatus.DRAFT,
    )
    db.add(event)
    await db.commit()
    await db.refresh(event)
    return await get_event_by_id(db, event.id)  # type: ignore[return-value]


async def update_event(
    db: AsyncSession,
    event: Event,
    data: EventUpdate,
    location_id: int | None = None,
) -> Event:
    update_data = data.model_dump(exclude_unset=True, exclude={"new_location"})
    if location_id is not None:
        update_data["location_id"] = location_id
    for field, value in update_data.items():
        setattr(event, field, value)
    await db.commit()
    return await get_event_by_id(db, event.id)  # type: ignore[return-value]


async def delete_event(db: AsyncSession, event: Event) -> None:
    await db.delete(event)
    await db.commit()


async def submit_event(db: AsyncSession, event: Event) -> Event:
    event.status = EventStatus.PENDING
    await db.commit()
    return await get_event_by_id(db, event.id)  # type: ignore[return-value]


async def approve_event(db: AsyncSession, event: Event, admin_id: int) -> Event:
    event.status = EventStatus.APPROVED
    event.approved_by_id = admin_id
    event.approved_at = datetime.now(timezone.utc)
    event.qr_token = secrets.token_urlsafe(32)
    await db.commit()
    return await get_event_by_id(db, event.id)  # type: ignore[return-value]


async def reject_event(db: AsyncSession, event: Event, reason: str) -> Event:
    event.status = EventStatus.REJECTED
    event.rejection_reason = reason
    await db.commit()
    return await get_event_by_id(db, event.id)  # type: ignore[return-value]


async def set_cover_image(db: AsyncSession, event: Event, filename: str) -> Event:
    event.cover_image_path = filename
    await db.commit()
    return await get_event_by_id(db, event.id)  # type: ignore[return-value]


async def get_public_events(
    db: AsyncSession,
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
) -> tuple[list[Event], int]:
    conditions = [Event.status == EventStatus.APPROVED]

    if category_id:
        conditions.append(Event.category_id == category_id)
    if location_id:
        conditions.append(Event.location_id == location_id)
    if organizer_id:
        conditions.append(Event.organizer_id == organizer_id)
    if modality:
        conditions.append(Event.modality == modality)
    if participation_type:
        conditions.append(Event.participation_type == participation_type)
    if date_from:
        conditions.append(Event.starts_at >= date_from)
    if date_to:
        conditions.append(Event.starts_at <= date_to)
    if q:
        pat = f"%{q}%"
        conditions.append(or_(Event.title.ilike(pat), Event.description.ilike(pat)))
    if has_qr is True:
        conditions.append(Event.qr_token.isnot(None))

    where = and_(*conditions)
    total = (await db.execute(select(func.count(Event.id)).where(where))).scalar_one()

    if sort == "title":
        order_col = Event.title.asc()
    elif sort == "-starts_at":
        order_col = Event.starts_at.desc()
    else:
        order_col = Event.starts_at.asc()

    result = await db.execute(
        select(Event)
        .options(*_with_relations())
        .where(where)
        .order_by(order_col)
        .offset((page - 1) * size)
        .limit(size)
    )
    return list(result.scalars().all()), total


# Sponsor CRUD

async def get_sponsor_by_id(db: AsyncSession, sponsor_id: int) -> Sponsor | None:
    result = await db.execute(select(Sponsor).where(Sponsor.id == sponsor_id))
    return result.scalar_one_or_none()


async def create_sponsor(
    db: AsyncSession,
    event_id: int,
    data: SponsorCreate,
    logo_path: str | None = None,
) -> Sponsor:
    sponsor = Sponsor(
        event_id=event_id,
        name=data.name,
        website_url=data.website_url,
        display_order=data.display_order,
        logo_path=logo_path,
    )
    db.add(sponsor)
    await db.commit()
    await db.refresh(sponsor)
    return sponsor


async def delete_sponsor(db: AsyncSession, sponsor: Sponsor) -> None:
    await db.delete(sponsor)
    await db.commit()
