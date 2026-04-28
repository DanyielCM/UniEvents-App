from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class EventModality(str, PyEnum):
    PHYSICAL = "physical"
    ONLINE = "online"
    HYBRID = "hybrid"


class ParticipationType(str, PyEnum):
    FREE = "free"
    REGISTRATION = "registration"
    TICKETED = "ticketed"


class EventStatus(str, PyEnum):
    DRAFT = "draft"
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    CANCELLED = "cancelled"
    COMPLETED = "completed"


def _enum_values(e):
    return [m.value for m in e]


class Event(Base):
    __tablename__ = "events"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    slug: Mapped[str] = mapped_column(String(350), unique=True, nullable=False, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    location_id: Mapped[int | None] = mapped_column(
        ForeignKey("locations.id", ondelete="SET NULL"), nullable=True
    )
    category_id: Mapped[int | None] = mapped_column(
        ForeignKey("categories.id", ondelete="SET NULL"), nullable=True, index=True
    )
    organizer_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    modality: Mapped[EventModality] = mapped_column(
        Enum(EventModality, name="eventmodality", native_enum=False, values_callable=_enum_values),
        nullable=False,
    )
    participation_type: Mapped[ParticipationType] = mapped_column(
        Enum(ParticipationType, name="participationtype", native_enum=False, values_callable=_enum_values),
        nullable=False,
        default=ParticipationType.FREE,
        server_default="free",
    )
    registration_link: Mapped[str | None] = mapped_column(String(500), nullable=True)
    registration_deadline: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    capacity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[EventStatus] = mapped_column(
        Enum(EventStatus, name="eventstatus", native_enum=False, values_callable=_enum_values),
        nullable=False,
        default=EventStatus.DRAFT,
        server_default="draft",
        index=True,
    )
    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    approved_by_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    qr_token: Mapped[str | None] = mapped_column(String(64), unique=True, nullable=True)
    cover_image_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    cover_image_position: Mapped[str] = mapped_column(String(20), nullable=False, server_default="50% 50%")
    max_file_size_mb: Mapped[int | None] = mapped_column(Integer, nullable=True)
    max_files: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships — string-based to avoid circular imports at runtime
    category = relationship("Category", lazy="raise")
    location = relationship("Location", lazy="raise")
    organizer = relationship("User", foreign_keys="[Event.organizer_id]", lazy="raise")
    approved_by = relationship("User", foreign_keys="[Event.approved_by_id]", lazy="raise")
    sponsors = relationship("Sponsor", lazy="raise", order_by="Sponsor.display_order")
