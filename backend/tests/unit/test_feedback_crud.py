from unittest.mock import MagicMock

import pytest

from app.crud.feedback import create, get_by_event_user, get_summary
from app.models.feedback import Feedback
from app.schemas.feedback import FeedbackCreate


async def test_get_by_event_user_returns_feedback_when_found(mock_db):
    fake = Feedback(id=1, event_id=10, user_id=5, rating=4)
    mock_db.execute.return_value.scalar_one_or_none.return_value = fake

    result = await get_by_event_user(mock_db, event_id=10, user_id=5)

    mock_db.execute.assert_awaited_once()
    assert result is fake


async def test_get_by_event_user_returns_none_when_missing(mock_db):
    mock_db.execute.return_value.scalar_one_or_none.return_value = None

    result = await get_by_event_user(mock_db, event_id=99, user_id=99)

    assert result is None


async def test_create_calls_add_commit_refresh(mock_db):
    data = FeedbackCreate(rating=5, comment="Super!")

    async def fake_refresh(obj):
        obj.id = 42

    mock_db.refresh.side_effect = fake_refresh

    result = await create(mock_db, event_id=7, user_id=3, data=data)

    mock_db.add.assert_called_once()
    added_obj = mock_db.add.call_args.args[0]
    assert isinstance(added_obj, Feedback)
    assert added_obj.rating == 5
    assert added_obj.comment == "Super!"
    assert added_obj.event_id == 7
    assert added_obj.user_id == 3

    mock_db.commit.assert_awaited_once()
    mock_db.refresh.assert_awaited_once()
    assert result.id == 42


async def test_get_summary_no_feedback(mock_db):
    mock_db.execute.return_value.one.return_value = (None, 0)

    dist_result = MagicMock()
    dist_result.__iter__ = MagicMock(return_value=iter([]))

    mock_db.execute.side_effect = [
        MagicMock(one=MagicMock(return_value=(None, 0))),
        dist_result,
    ]

    summary = await get_summary(mock_db, event_id=1)

    assert summary["avg_rating"] is None
    assert summary["count"] == 0
    assert summary["distribution"] == {}


async def test_get_summary_with_feedback(mock_db):
    dist_rows = [(4, 2), (5, 3)]

    mock_db.execute.side_effect = [
        MagicMock(one=MagicMock(return_value=(4.6, 5))),
        MagicMock(__iter__=MagicMock(return_value=iter(dist_rows))),
    ]

    summary = await get_summary(mock_db, event_id=2)

    assert summary["avg_rating"] == 4.6
    assert summary["count"] == 5
    assert summary["distribution"] == {4: 2, 5: 3}
