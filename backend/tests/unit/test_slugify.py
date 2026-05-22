import pytest

from app.crud.event import _slugify


@pytest.mark.parametrize("text,expected", [
    ("Hello World", "hello-world"),
    ("UniEvents USV 2025", "unievents-usv-2025"),
    ("  spaces  ", "spaces"),
    ("multiple   spaces", "multiple-spaces"),
    ("Special!@#$Characters", "special-characters"),
    ("Congres Studențesc", "congres-studentesc"),
    ("Informatică și Tehnologie", "informatica-si-tehnologie"),
    ("123", "123"),
    ("already-a-slug", "already-a-slug"),
    ("", "event"),
    ("---", "event"),
    ("!!!???", "event"),
])
def test_slugify(text, expected):
    assert _slugify(text) == expected


def test_slugify_returns_string():
    assert isinstance(_slugify("orice text"), str)


def test_slugify_no_leading_trailing_dashes():
    result = _slugify("  -test-  ")
    assert not result.startswith("-")
    assert not result.endswith("-")


def test_slugify_lowercase_output():
    assert _slugify("UPPERCASE") == "uppercase"
