"""Google Calendar URL builder utilities for UniEvents."""

from datetime import datetime, timezone
from urllib.parse import urlencode


def _fmt(dt: datetime) -> str:
    """Format a datetime for Google Calendar URL parameters.

    Args:
        dt: The datetime to format.

    Returns:
        The datetime formatted as UTC in YYYYMMDDTHHMMSSZ form.
    """
    utc = dt.astimezone(timezone.utc)
    return utc.strftime("%Y%m%dT%H%M%SZ")


def build_google_calendar_url(
    title: str,
    starts_at: datetime,
    ends_at: datetime,
    location: str | None = None,
    description: str | None = None,
) -> str:
    """Build a Google Calendar event creation URL.

    Args:
        title: Event title.
        starts_at: Event start timestamp.
        ends_at: Event end timestamp.
        location: Optional event location.
        description: Optional event description.

    Returns:
        A URL string that opens the Google Calendar event template.
    """
    params: dict[str, str] = {
        "action": "TEMPLATE",
        "text": title,
        "dates": f"{_fmt(starts_at)}/{_fmt(ends_at)}",
    }
    if location:
        params["location"] = location
    if description:
        params["details"] = description[:500]

    return "https://calendar.google.com/calendar/render?" + urlencode(params)
