"""Create the USV organizer account and reassign seeded events to it.

Run with: docker compose exec backend python -m app.scripts.seed_usv_organizer
"""
import asyncio

from pwdlib import PasswordHash
from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.models.event import Event
from app.models.user import User, UserRole

password_hash = PasswordHash.recommended()

USV_EMAIL = "organizare@usv.ro"
USV_FIRST_NAME = "USV"
USV_LAST_NAME = ""


async def seed() -> None:
    async with AsyncSessionLocal() as session:
        # Create or find the USV organizer
        existing = (
            await session.execute(select(User).where(User.email == USV_EMAIL))
        ).scalar_one_or_none()

        if existing is None:
            usv = User(
                email=USV_EMAIL,
                hashed_password=password_hash.hash("usv-placeholder-pw"),
                first_name=USV_FIRST_NAME,
                last_name=USV_LAST_NAME,
                role=UserRole.ORGANIZER,
                is_active=True,
            )
            session.add(usv)
            await session.flush()
            usv_id = usv.id
            print(f"Created USV organizer (id={usv_id})")
        else:
            if existing.role != UserRole.ORGANIZER:
                existing.role = UserRole.ORGANIZER
            existing.first_name = USV_FIRST_NAME
            existing.last_name = USV_LAST_NAME
            usv_id = existing.id
            print(f"USV organizer already exists (id={usv_id})")

        # Reassign all events not already owned by the USV organizer
        events_result = await session.execute(
            select(Event).where(Event.organizer_id != usv_id)
        )
        events = events_result.scalars().all()

        for event in events:
            event.organizer_id = usv_id
            event.approved_by_id = usv_id
            print(f"  reassigned: {event.title}")

        await session.commit()
    print("Done.")


if __name__ == "__main__":
    asyncio.run(seed())
