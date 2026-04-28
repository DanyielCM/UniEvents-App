from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator

from app.schemas.event import OrganizerBrief


class FeedbackCreate(BaseModel):
    rating: int
    comment: str | None = None

    @field_validator("rating")
    @classmethod
    def validate_rating(cls, v: int) -> int:
        if not 1 <= v <= 5:
            raise ValueError("Rating must be between 1 and 5")
        return v


class FeedbackResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    rating: int
    comment: str | None = None
    sentiment: str | None = None
    submitted_at: datetime
    user: OrganizerBrief


class MyFeedbackResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    rating: int
    comment: str | None = None
    submitted_at: datetime


class FeedbackSummary(BaseModel):
    avg_rating: float | None = None
    count: int
    distribution: dict[int, int]
