from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, computed_field

from app.config import settings
from app.models.event import EventModality, ParticipationType
from app.models.registration import RegistrationStatus
from app.schemas.event import LocationResponse, OrganizerBrief


class RegistrationEventBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    starts_at: datetime
    ends_at: datetime
    modality: EventModality
    participation_type: ParticipationType
    cover_image_path: str | None = Field(None, exclude=True)
    cover_image_position: str = "50% 50%"
    location: LocationResponse | None = None

    @computed_field
    @property
    def cover_image_url(self) -> str | None:
        if self.cover_image_path:
            return f"{settings.BACKEND_BASE_URL}/uploads/{self.cover_image_path}"
        return None


class RegistrationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    event_id: int
    user_id: int
    status: RegistrationStatus
    ticket_token: str | None = None
    registered_at: datetime
    cancelled_at: datetime | None = None
    checked_in_at: datetime | None = None
    event: RegistrationEventBrief


class ParticipantResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    status: RegistrationStatus
    ticket_token: str | None = None
    registered_at: datetime
    cancelled_at: datetime | None = None
    checked_in_at: datetime | None = None
    user: OrganizerBrief


class CheckinRequest(BaseModel):
    ticket_token: str
