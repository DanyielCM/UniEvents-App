from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, computed_field, model_validator

from app.config import settings
from app.models.event import EventModality, EventStatus, ParticipationType


class LocationInline(BaseModel):
    name: str
    address: str | None = None
    is_online: bool = False


class EventCreate(BaseModel):
    title: str
    description: str
    starts_at: datetime
    ends_at: datetime
    category_id: int | None = None
    location_id: int | None = None
    new_location: LocationInline | None = None
    modality: EventModality
    participation_type: ParticipationType = ParticipationType.FREE
    registration_link: str | None = None
    registration_deadline: datetime | None = None
    capacity: int | None = None
    max_file_size_mb: int | None = None
    max_files: int | None = None
    cover_image_position: str = "50% 50%"

    @model_validator(mode="after")
    def ends_after_starts(self):
        if self.ends_at <= self.starts_at:
            raise ValueError("ends_at must be after starts_at")
        return self


class EventUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    category_id: int | None = None
    location_id: int | None = None
    new_location: LocationInline | None = None
    modality: EventModality | None = None
    participation_type: ParticipationType | None = None
    registration_link: str | None = None
    registration_deadline: datetime | None = None
    capacity: int | None = None
    max_file_size_mb: int | None = None
    max_files: int | None = None
    cover_image_position: str | None = None


class AdminRejectRequest(BaseModel):
    reason: str


class SponsorCreate(BaseModel):
    name: str
    website_url: str | None = None
    display_order: int = 0


class CategoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    slug: str
    color_hex: str


class LocationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    address: str | None = None
    is_online: bool


class OrganizerBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    first_name: str
    last_name: str
    email: str


class SponsorResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    logo_path: str | None = Field(None, exclude=True)
    website_url: str | None = None
    display_order: int

    @computed_field
    @property
    def logo_url(self) -> str | None:
        if self.logo_path:
            return f"{settings.BACKEND_BASE_URL}/uploads/{self.logo_path}"
        return None


class EventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    slug: str
    description: str
    starts_at: datetime
    ends_at: datetime
    modality: EventModality
    participation_type: ParticipationType
    status: EventStatus
    registration_link: str | None = None
    registration_deadline: datetime | None = None
    capacity: int | None = None
    cover_image_path: str | None = Field(None, exclude=True)
    cover_image_position: str = "50% 50%"
    qr_token: str | None = None
    category: CategoryResponse | None = None
    location: LocationResponse | None = None
    organizer: OrganizerBrief
    created_at: datetime
    updated_at: datetime

    @computed_field
    @property
    def cover_image_url(self) -> str | None:
        if self.cover_image_path:
            return f"{settings.BACKEND_BASE_URL}/uploads/{self.cover_image_path}"
        return None


class PaginatedEvents(BaseModel):
    items: list[EventResponse]
    total: int
    page: int
    size: int
    pages: int


class EventDetailResponse(EventResponse):
    rejection_reason: str | None = None
    max_file_size_mb: int | None = None
    max_files: int | None = None
    sponsors: list[SponsorResponse] = []
