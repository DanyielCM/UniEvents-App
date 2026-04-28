from pydantic import BaseModel

from app.schemas.event import OrganizerBrief


class EventStats(BaseModel):
    total_registrations: int
    confirmed: int
    attended: int
    cancelled: int
    waitlisted: int
    show_up_rate: float | None
    avg_rating: float | None
    feedback_count: int
    rating_distribution: dict[int, int]
    capacity: int | None
    occupancy_rate: float | None


class MonthlyReportItem(BaseModel):
    month: int
    month_name: str
    events_count: int
    total_registrations: int
    avg_registrations: float | None


class MonthlyReport(BaseModel):
    year: int
    months: list[MonthlyReportItem]


class OrganizerReportItem(BaseModel):
    organizer: OrganizerBrief
    events_count: int
    avg_rating: float | None
    total_participants: int


class PlatformOverview(BaseModel):
    total_events: int
    approved_events: int
    pending_events: int
    total_registrations: int
    total_feedback: int
    avg_rating: float | None
    total_organizers: int
    total_students: int
