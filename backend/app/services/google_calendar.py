from datetime import datetime, timezone
from urllib.parse import urlencode


def _fmt(dt: datetime) -> str:
    utc = dt.astimezone(timezone.utc)
    return utc.strftime("%Y%m%dT%H%M%SZ")


def build_google_calendar_url(
    title: str,
    starts_at: datetime,
    ends_at: datetime,
    location: str | None = None,
    description: str | None = None,
) -> str:
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
