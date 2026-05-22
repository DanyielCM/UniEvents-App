from datetime import datetime, timedelta, timezone

import pytest
from pydantic import ValidationError

from app.models.event import EventModality
from app.schemas.event import EventCreate


BASE_FIELDS = {
    "title": "Eveniment Test",
    "description": "Descriere eveniment de test.",
    "modality": EventModality.PHYSICAL,
}

T = datetime(2026, 9, 1, 10, 0, 0, tzinfo=timezone.utc)


@pytest.mark.parametrize("starts_at,ends_at", [
    (T, T + timedelta(hours=1)),
    (T, T + timedelta(days=3)),
    (T - timedelta(days=7), T),
    (T, T + timedelta(seconds=1)),
])
def test_valid_date_range_accepted(starts_at, ends_at):
    ev = EventCreate(**BASE_FIELDS, starts_at=starts_at, ends_at=ends_at)
    assert ev.ends_at > ev.starts_at


@pytest.mark.parametrize("starts_at,ends_at", [
    (T, T),
    (T, T - timedelta(seconds=1)),
    (T, T - timedelta(hours=2)),
    (T + timedelta(days=1), T),
])
def test_invalid_date_range_raises_validation_error(starts_at, ends_at):
    with pytest.raises(ValidationError) as exc_info:
        EventCreate(**BASE_FIELDS, starts_at=starts_at, ends_at=ends_at)
    assert "ends_at" in str(exc_info.value).lower() or "after" in str(exc_info.value).lower()


def test_capacity_is_optional():
    ev = EventCreate(**BASE_FIELDS, starts_at=T, ends_at=T + timedelta(hours=1))
    assert ev.capacity is None


def test_registration_deadline_is_optional():
    ev = EventCreate(**BASE_FIELDS, starts_at=T, ends_at=T + timedelta(hours=1))
    assert ev.registration_deadline is None


def test_default_cover_image_position():
    ev = EventCreate(**BASE_FIELDS, starts_at=T, ends_at=T + timedelta(hours=2))
    assert ev.cover_image_position == "50% 50%"
