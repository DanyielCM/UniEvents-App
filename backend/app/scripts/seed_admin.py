"""Seed the admin user from ADMIN_SEED_EMAIL / ADMIN_SEED_PASSWORD env vars.

Run with: docker compose exec backend python -m app.scripts.seed_admin
"""
import asyncio
import sys

from pwdlib import PasswordHash
from sqlalchemy import select

from app.config import settings
from app.database import AsyncSessionLocal
from app.models.user import User, UserRole

password_hash = PasswordHash.recommended()


async def seed_admin() -> int:
    email = settings.ADMIN_SEED_EMAIL.strip()
    password = settings.ADMIN_SEED_PASSWORD

    if not email or not password:
        print("ERROR: ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD must be set in .env")
        return 1

    async with AsyncSessionLocal() as db:
        existing = (
            await db.execute(select(User).where(User.email == email))
        ).scalar_one_or_none()

        if existing is not None:
            changed = False
            if existing.role != UserRole.ADMIN:
                existing.role = UserRole.ADMIN
                changed = True
            if not existing.is_active:
                existing.is_active = True
                changed = True
            if changed:
                await db.commit()
                print(f"OK: promoted existing user {email} to admin")
            else:
                print(f"OK: admin {email} already exists (id={existing.id})")
            return 0

        user = User(
            email=email,
            hashed_password=password_hash.hash(password),
            first_name="Admin",
            last_name="UniEvents",
            role=UserRole.ADMIN,
            is_active=True,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        print(f"OK: created admin {email} (id={user.id})")
        return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(seed_admin()))
