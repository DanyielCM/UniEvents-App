import secrets
from datetime import datetime, timezone

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.event import Event
from app.models.registration import Registration, RegistrationStatus


def _load_event():
    return [
        selectinload(Registration.event).selectinload(Event.location),
        selectinload(Registration.event).selectinload(Event.category),
    ]


def _load_user():
    return [selectinload(Registration.user)]


async def get_by_id(db: AsyncSession, reg_id: int) -> Registration | None:
    result = await db.execute(select(Registration).where(Registration.id == reg_id))
    return result.scalar_one_or_none()


async def get_by_event_user(
    db: AsyncSession, event_id: int, user_id: int
) -> Registration | None:
    result = await db.execute(
        select(Registration).where(
            Registration.event_id == event_id,
            Registration.user_id == user_id,
        )
    )
    return result.scalar_one_or_none()


async def get_by_ticket_token(
    db: AsyncSession, ticket_token: str
) -> Registration | None:
    result = await db.execute(
        select(Registration).where(Registration.ticket_token == ticket_token)
    )
    return result.scalar_one_or_none()


async def get_by_user(
    db: AsyncSession, user_id: int, skip: int = 0, limit: int = 50
) -> list[Registration]:
    result = await db.execute(
        select(Registration)
        .options(*_load_event())
        .where(Registration.user_id == user_id)
        .order_by(Registration.registered_at.desc())
        .offset(skip)
        .limit(limit)
    )
    return list(result.scalars().all())


async def get_by_event(
    db: AsyncSession,
    event_id: int,
    status: RegistrationStatus | None = None,
    skip: int = 0,
    limit: int = 100,
) -> tuple[list[Registration], int]:
    conditions = [Registration.event_id == event_id]
    if status:
        conditions.append(Registration.status == status)
    where = and_(*conditions)

    total = (
        await db.execute(select(func.count(Registration.id)).where(where))
    ).scalar_one()

    result = await db.execute(
        select(Registration)
        .options(*_load_user())
        .where(where)
        .order_by(Registration.registered_at.asc())
        .offset(skip)
        .limit(limit)
    )
    return list(result.scalars().all()), total


async def count_confirmed(db: AsyncSession, event_id: int) -> int:
    return (
        await db.execute(
            select(func.count(Registration.id)).where(
                Registration.event_id == event_id,
                Registration.status == RegistrationStatus.CONFIRMED,
            )
        )
    ).scalar_one()


async def get_first_waitlisted(
    db: AsyncSession, event_id: int
) -> Registration | None:
    result = await db.execute(
        select(Registration)
        .options(selectinload(Registration.user))
        .where(
            Registration.event_id == event_id,
            Registration.status == RegistrationStatus.WAITLISTED,
        )
        .order_by(Registration.registered_at.asc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def promote_from_waitlist(db: AsyncSession, reg: Registration) -> Registration:
    reg.status = RegistrationStatus.CONFIRMED
    reg.ticket_token = secrets.token_urlsafe(32)
    await db.commit()
    result = await db.execute(
        select(Registration)
        .options(selectinload(Registration.user))
        .where(Registration.id == reg.id)
    )
    return result.scalar_one()


async def create(
    db: AsyncSession, event_id: int, user_id: int, waitlisted: bool = False
) -> Registration:
    st = RegistrationStatus.WAITLISTED if waitlisted else RegistrationStatus.CONFIRMED
    reg = Registration(
        event_id=event_id,
        user_id=user_id,
        status=st,
        ticket_token=None if waitlisted else secrets.token_urlsafe(32),
    )
    db.add(reg)
    await db.commit()
    await db.refresh(reg)
    # Reload with event details for the response
    result = await db.execute(
        select(Registration)
        .options(*_load_event())
        .where(Registration.id == reg.id)
    )
    return result.scalar_one()


async def cancel(db: AsyncSession, reg: Registration) -> Registration:
    reg.status = RegistrationStatus.CANCELLED
    reg.cancelled_at = datetime.now(timezone.utc)
    await db.commit()
    result = await db.execute(
        select(Registration)
        .options(*_load_event())
        .where(Registration.id == reg.id)
    )
    return result.scalar_one()


async def checkin(db: AsyncSession, reg: Registration) -> Registration:
    reg.status = RegistrationStatus.ATTENDED
    reg.checked_in_at = datetime.now(timezone.utc)
    await db.commit()
    result = await db.execute(
        select(Registration)
        .options(*_load_user())
        .where(Registration.id == reg.id)
    )
    return result.scalar_one()
