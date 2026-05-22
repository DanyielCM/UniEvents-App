import pytest
from pydantic import ValidationError

from app.schemas.feedback import FeedbackCreate


@pytest.mark.parametrize("rating", [1, 2, 3, 4, 5])
def test_valid_rating_accepted(rating):
    fb = FeedbackCreate(rating=rating)
    assert fb.rating == rating


@pytest.mark.parametrize("rating", [0, 6, -1, -999, 100])
def test_invalid_rating_raises_validation_error(rating):
    with pytest.raises(ValidationError):
        FeedbackCreate(rating=rating)


def test_comment_is_optional():
    fb = FeedbackCreate(rating=3)
    assert fb.comment is None


def test_comment_is_stored_when_provided():
    fb = FeedbackCreate(rating=5, comment="Eveniment excelent!")
    assert fb.comment == "Eveniment excelent!"


def test_comment_none_explicit():
    fb = FeedbackCreate(rating=2, comment=None)
    assert fb.comment is None


@pytest.mark.parametrize("bad_value", ["five", None, 3.5, [], {}])
def test_rating_type_coercion_or_rejection(bad_value):
    with pytest.raises((ValidationError, TypeError)):
        FeedbackCreate(rating=bad_value)
