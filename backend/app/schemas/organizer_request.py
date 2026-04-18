from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.organizer_request import OrganizerType, OrganizerRequestStatus


class OrganizerRequestCreate(BaseModel):
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    organization: str = Field(min_length=2, max_length=255)
    organizer_type: OrganizerType
    motivation: str = Field(min_length=30, max_length=2000)


class OrganizerRequestReject(BaseModel):
    rejection_reason: str = Field(min_length=10, max_length=1000)


class OrganizerRequestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    first_name: str
    last_name: str
    organization: str
    organizer_type: OrganizerType
    motivation: str
    status: OrganizerRequestStatus
    rejection_reason: str | None
    reviewed_by_id: int | None
    reviewed_at: datetime | None
    created_at: datetime


class OrganizerCreateByAdmin(BaseModel):
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
