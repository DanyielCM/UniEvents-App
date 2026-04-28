from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.feedback import Feedback
from app.schemas.feedback import FeedbackCreate


async def get_by_event_user(
    db: AsyncSession, event_id: int, user_id: int
) -> Feedback | None:
    result = await db.execute(
        select(Feedback).where(
            Feedback.event_id == event_id,
            Feedback.user_id == user_id,
        )
    )
    return result.scalar_one_or_none()


async def get_by_event(
    db: AsyncSession,
    event_id: int,
    skip: int = 0,
    limit: int = 100,
) -> list[Feedback]:
    result = await db.execute(
        select(Feedback)
        .options(selectinload(Feedback.user))
        .where(Feedback.event_id == event_id)
        .order_by(Feedback.submitted_at.desc())
        .offset(skip)
        .limit(limit)
    )
    return list(result.scalars().all())


async def get_summary(db: AsyncSession, event_id: int) -> dict:
    row = await db.execute(
        select(func.avg(Feedback.rating), func.count(Feedback.id)).where(
            Feedback.event_id == event_id
        )
    )
    avg_raw, count = row.one()

    dist_rows = await db.execute(
        select(Feedback.rating, func.count(Feedback.id))
        .where(Feedback.event_id == event_id)
        .group_by(Feedback.rating)
    )
    distribution = {int(r): c for r, c in dist_rows}

    return {
        "avg_rating": round(float(avg_raw), 2) if avg_raw else None,
        "count": count,
        "distribution": distribution,
    }


async def create(
    db: AsyncSession,
    event_id: int,
    user_id: int,
    data: FeedbackCreate,
) -> Feedback:
    fb = Feedback(
        event_id=event_id,
        user_id=user_id,
        rating=data.rating,
        comment=data.comment,
    )
    db.add(fb)
    await db.commit()
    await db.refresh(fb)
    return fb
