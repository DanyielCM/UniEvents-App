from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class OrganizerType(str, PyEnum):
    USV_STAFF = "usv_staff"
    USV_ASSOCIATION = "usv_association"
    EXTERNAL_COMPANY = "external_company"
    EXTERNAL_NGO = "external_ngo"
    EXTERNAL_INDIVIDUAL = "external_individual"


class OrganizerRequestStatus(str, PyEnum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class OrganizerRequest(Base):
    __tablename__ = "organizer_requests"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    organization: Mapped[str] = mapped_column(String(255), nullable=False)
    organizer_type: Mapped[OrganizerType] = mapped_column(
        Enum(
            OrganizerType,
            name="organizertype",
            native_enum=False,
            values_callable=lambda e: [m.value for m in e],
        ),
        nullable=False,
    )
    motivation: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[OrganizerRequestStatus] = mapped_column(
        Enum(
            OrganizerRequestStatus,
            name="organizerrequeststatus",
            native_enum=False,
            values_callable=lambda e: [m.value for m in e],
        ),
        nullable=False,
        default=OrganizerRequestStatus.PENDING,
        server_default="pending",
        index=True,
    )
    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    reviewed_by_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
