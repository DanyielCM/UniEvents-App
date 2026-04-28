from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import DateTime, Enum, JSON, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ScrapedEventStatus(str, PyEnum):
    NEW = "new"
    IMPORTED = "imported"
    DISMISSED = "dismissed"


class ScrapedEvent(Base):
    __tablename__ = "scraped_events"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    source_url: Mapped[str] = mapped_column(String(1000), unique=True, nullable=False)
    source_site: Mapped[str] = mapped_column(String(100), nullable=False)
    raw_payload: Mapped[dict] = mapped_column(JSON, nullable=False)
    suggested_title: Mapped[str] = mapped_column(String(300), nullable=False)
    suggested_starts_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[ScrapedEventStatus] = mapped_column(
        Enum(
            ScrapedEventStatus,
            name="scrapedeventstatus",
            native_enum=False,
            values_callable=lambda e: [m.value for m in e],
        ),
        nullable=False,
        default=ScrapedEventStatus.NEW,
        server_default="new",
        index=True,
    )
    fetched_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
