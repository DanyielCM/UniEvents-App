from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.event import _with_relations
from app.models.event import Event
from app.models.favorite import Favorite


async def get_favorite(db: AsyncSession, event_id: int, user_id: int) -> Favorite | None:
    result = await db.execute(
        select(Favorite).where(Favorite.event_id == event_id, Favorite.user_id == user_id)
    )
    return result.scalar_one_or_none()


async def add_favorite(db: AsyncSession, event_id: int, user_id: int) -> Favorite:
    existing = await get_favorite(db, event_id, user_id)
    if existing:
        return existing
    favorite = Favorite(event_id=event_id, user_id=user_id)
    db.add(favorite)
    await db.commit()
    await db.refresh(favorite)
    return favorite


async def remove_favorite(db: AsyncSession, event_id: int, user_id: int) -> None:
    await db.execute(
        delete(Favorite).where(Favorite.event_id == event_id, Favorite.user_id == user_id)
    )
    await db.commit()


async def get_favorite_event_ids(db: AsyncSession, user_id: int) -> list[int]:
    result = await db.execute(select(Favorite.event_id).where(Favorite.user_id == user_id))
    return [row[0] for row in result.all()]


async def get_favorited_events(db: AsyncSession, user_id: int) -> list[Event]:
    result = await db.execute(
        select(Event)
        .options(*_with_relations())
        .join(Favorite, Favorite.event_id == Event.id)
        .where(Favorite.user_id == user_id)
        .order_by(Favorite.created_at.desc())
    )
    return list(result.scalars().all())
