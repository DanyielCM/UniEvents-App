from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.material import EventMaterial


async def get_materials_by_event(
    db: AsyncSession, event_id: int
) -> list[EventMaterial]:
    result = await db.execute(
        select(EventMaterial)
        .where(EventMaterial.event_id == event_id)
        .order_by(EventMaterial.uploaded_at.desc())
    )
    return list(result.scalars().all())


async def get_material_by_id(
    db: AsyncSession, material_id: int
) -> EventMaterial | None:
    result = await db.execute(
        select(EventMaterial).where(EventMaterial.id == material_id)
    )
    return result.scalar_one_or_none()


async def create_material(
    db: AsyncSession,
    event_id: int,
    uploaded_by_id: int,
    info: dict,
) -> EventMaterial:
    mat = EventMaterial(
        event_id=event_id,
        filename=info["filename"],
        original_name=info["original_name"],
        mime_type=info["mime_type"],
        size_bytes=info["size_bytes"],
        uploaded_by_id=uploaded_by_id,
    )
    db.add(mat)
    await db.commit()
    await db.refresh(mat)
    return mat


async def delete_material(db: AsyncSession, material: EventMaterial) -> None:
    await db.delete(material)
    await db.commit()
