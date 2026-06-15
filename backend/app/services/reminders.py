import logging
from datetime import datetime, timezone

from app.crud import reminder as reminder_crud
from app.database import AsyncSessionLocal
from app.email_service import send_event_reminder

logger = logging.getLogger(__name__)


async def run_due_reminders() -> None:
    async with AsyncSessionLocal() as db:
        now = datetime.now(timezone.utc)
        reminders = await reminder_crud.get_due_reminders(db, now)
        for reminder in reminders:
            registration = reminder.registration
            event = registration.event
            user = registration.user
            try:
                await send_event_reminder(
                    to=user.email,
                    first_name=user.first_name,
                    event_title=event.title,
                    event_start=event.starts_at.strftime("%d %b %Y, %H:%M"),
                    location=event.location.name if event.location else None,
                )
            except Exception:
                logger.exception("Failed to send reminder for registration %s", registration.id)
                continue
            await reminder_crud.mark_sent(db, reminder, now)
