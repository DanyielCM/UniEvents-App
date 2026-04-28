import asyncio

from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.models.category import Category

CATEGORIES = [
    {"name": "Academic", "slug": "academic", "color_hex": "#8EAEE0"},
    {"name": "Sport", "slug": "sport", "color_hex": "#A1D6CB"},
    {"name": "Carieră", "slug": "cariera", "color_hex": "#FFB899"},
    {"name": "Voluntariat", "slug": "voluntariat", "color_hex": "#8DC9A0"},
    {"name": "Cultural", "slug": "cultural", "color_hex": "#A19AD3"},
    {"name": "Social", "slug": "social", "color_hex": "#E6A1C0"},
]


async def seed() -> None:
    async with AsyncSessionLocal() as session:
        for data in CATEGORIES:
            result = await session.execute(
                select(Category).where(Category.slug == data["slug"])
            )
            if result.scalar_one_or_none() is None:
                session.add(Category(**data))
                print(f"  created: {data['name']}")
            else:
                print(f"  exists:  {data['name']}")
        await session.commit()
    print("Done.")


if __name__ == "__main__":
    asyncio.run(seed())
