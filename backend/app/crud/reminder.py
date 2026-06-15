from datetime import datetime

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.event import Event
from app.models.registration import Registration
from app.models.reminder import Reminder


async def create_for_registration(
    db: AsyncSession, registration_id: int, remind_at: datetime
) -> Reminder:
    reminder = Reminder(registration_id=registration_id, remind_at=remind_at)
    db.add(reminder)
    await db.commit()
    await db.refresh(reminder)
    return reminder


async def delete_for_registration(db: AsyncSession, registration_id: int) -> None:
    await db.execute(delete(Reminder).where(Reminder.registration_id == registration_id))
    await db.commit()


async def get_due_reminders(db: AsyncSession, now: datetime) -> list[Reminder]:
    result = await db.execute(
        select(Reminder)
        .options(
            selectinload(Reminder.registration).selectinload(Registration.user),
            selectinload(Reminder.registration)
            .selectinload(Registration.event)
            .selectinload(Event.location),
        )
        .where(Reminder.sent_at.is_(None), Reminder.remind_at <= now)
    )
    return list(result.scalars().all())


async def mark_sent(db: AsyncSession, reminder: Reminder, sent_at: datetime) -> None:
    reminder.sent_at = sent_at
    await db.commit()
