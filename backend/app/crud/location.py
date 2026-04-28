from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.location import Location


async def get_location_by_id(db: AsyncSession, location_id: int) -> Location | None:
    result = await db.execute(select(Location).where(Location.id == location_id))
    return result.scalar_one_or_none()


async def get_locations(
    db: AsyncSession, skip: int = 0, limit: int = 100
) -> list[Location]:
    result = await db.execute(
        select(Location).order_by(Location.name).offset(skip).limit(limit)
    )
    return list(result.scalars().all())


async def create_location(
    db: AsyncSession,
    name: str,
    address: str | None = None,
    is_online: bool = False,
) -> Location:
    loc = Location(name=name, address=address, is_online=is_online)
    db.add(loc)
    await db.commit()
    await db.refresh(loc)
    return loc
