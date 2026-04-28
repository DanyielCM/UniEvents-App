import uuid
from datetime import datetime

from icalendar import Calendar, Event


def generate_ics_bytes(
    title: str,
    starts_at: datetime,
    ends_at: datetime,
    location: str | None = None,
    description: str | None = None,
    uid: str | None = None,
) -> bytes:
    cal = Calendar()
    cal.add("prodid", "-//UniEvents USV//EN")
    cal.add("version", "2.0")
    cal.add("calscale", "GREGORIAN")

    event = Event()
    event.add("summary", title)
    event.add("dtstart", starts_at)
    event.add("dtend", ends_at)
    if location:
        event.add("location", location)
    if description:
        event.add("description", description)
    event.add("uid", uid or str(uuid.uuid4()))

    cal.add_component(event)
    return cal.to_ical()
