from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.feedback import Feedback, SentimentLabel
from app.schemas.feedback import FeedbackCreate
from app.services.sentiment import analyze_sentiment


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

    sentiment_rows = await db.execute(
        select(Feedback.sentiment, func.count(Feedback.id))
        .where(Feedback.event_id == event_id)
        .group_by(Feedback.sentiment)
    )
    sentiment_counts = {label.value: 0 for label in SentimentLabel}
    for sentiment, c in sentiment_rows:
        if sentiment is not None:
            sentiment_counts[sentiment.value] = c

    return {
        "avg_rating": round(float(avg_raw), 2) if avg_raw else None,
        "count": count,
        "distribution": distribution,
        "sentiment_counts": sentiment_counts,
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
        sentiment=analyze_sentiment(data.rating, data.comment),
    )
    db.add(fb)
    await db.commit()
    await db.refresh(fb)
    return fb
