from unittest.mock import AsyncMock, patch

import pytest

import app.email_service as email_module
from app.email_service import send_request_received_to_applicant


async def test_send_skipped_when_smtp_host_empty(monkeypatch):
    monkeypatch.setattr(email_module.settings, "SMTP_HOST", "")
    monkeypatch.setattr(email_module.settings, "SMTP_FROM_EMAIL", "")

    with patch("aiosmtplib.send", new_callable=AsyncMock) as mock_send:
        await email_module._send("user@usv.ro", "Subiect", "Corp")
        mock_send.assert_not_awaited()


async def test_send_skipped_when_from_email_empty(monkeypatch):
    monkeypatch.setattr(email_module.settings, "SMTP_HOST", "smtp.example.com")
    monkeypatch.setattr(email_module.settings, "SMTP_FROM_EMAIL", "")

    with patch("aiosmtplib.send", new_callable=AsyncMock) as mock_send:
        await email_module._send("user@usv.ro", "Subiect", "Corp")
        mock_send.assert_not_awaited()


async def test_send_calls_aiosmtplib_when_configured(monkeypatch):
    monkeypatch.setattr(email_module.settings, "SMTP_HOST", "smtp.usv.ro")
    monkeypatch.setattr(email_module.settings, "SMTP_FROM_EMAIL", "no-reply@usv.ro")
    monkeypatch.setattr(email_module.settings, "SMTP_FROM_NAME", "UniEvents USV")
    monkeypatch.setattr(email_module.settings, "SMTP_PORT", 587)
    monkeypatch.setattr(email_module.settings, "SMTP_USER", "")
    monkeypatch.setattr(email_module.settings, "SMTP_PASSWORD", "")
    monkeypatch.setattr(email_module.settings, "SMTP_USE_TLS", False)

    with patch("aiosmtplib.send", new_callable=AsyncMock) as mock_send:
        await email_module._send("student@usv.ro", "Test", "Mesaj")

        mock_send.assert_awaited_once()
        kwargs = mock_send.call_args.kwargs
        assert kwargs["hostname"] == "smtp.usv.ro"
        assert kwargs["port"] == 587


async def test_public_function_calls_send_with_correct_recipient(monkeypatch):
    monkeypatch.setattr(email_module.settings, "SMTP_HOST", "")
    monkeypatch.setattr(email_module.settings, "SMTP_FROM_EMAIL", "")

    with patch.object(email_module, "_send", new_callable=AsyncMock) as mock_send:
        await send_request_received_to_applicant("ana@usv.ro", "Ana")

        mock_send.assert_awaited_once()
        to, subject, body = mock_send.call_args.args
        assert to == "ana@usv.ro"
        assert "organizator" in subject.lower()
        assert "Ana" in body


async def test_public_function_mentions_first_name_in_body(monkeypatch):
    monkeypatch.setattr(email_module.settings, "SMTP_HOST", "")
    monkeypatch.setattr(email_module.settings, "SMTP_FROM_EMAIL", "")

    with patch.object(email_module, "_send", new_callable=AsyncMock) as mock_send:
        await send_request_received_to_applicant("ion@usv.ro", "Ion")

        _, _, body = mock_send.call_args.args
        assert "Ion" in body
