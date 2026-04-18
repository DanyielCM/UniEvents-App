import logging
from email.message import EmailMessage

import aiosmtplib

from app.config import settings

logger = logging.getLogger(__name__)


async def _send(to: str, subject: str, body: str) -> None:
    if not settings.SMTP_HOST or not settings.SMTP_FROM_EMAIL:
        logger.warning("SMTP not configured; skipping email to %s (%s)", to, subject)
        return

    msg = EmailMessage()
    msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(body)

    try:
        await aiosmtplib.send(
            msg,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USER or None,
            password=settings.SMTP_PASSWORD or None,
            start_tls=settings.SMTP_USE_TLS,
            timeout=15,
        )
        logger.info("Email sent to %s: %s", to, subject)
    except Exception as exc:
        logger.exception("Failed to send email to %s (%s): %s", to, subject, exc)


async def send_request_received_to_applicant(
    to: str, first_name: str
) -> None:
    subject = "Cererea ta de organizator a fost primită — UniEvents USV"
    body = (
        f"Bună, {first_name}!\n\n"
        "Am primit cererea ta de a deveni organizator pe platforma UniEvents USV.\n"
        "Un administrator o va analiza în cel mai scurt timp. Vei primi un email "
        "cu rezultatul (aprobare sau respingere).\n\n"
        "Dacă nu ai inițiat tu această cerere, te rugăm să ignori acest mesaj.\n\n"
        "— Echipa UniEvents USV"
    )
    await _send(to, subject, body)


async def send_new_request_to_admin(
    to: str, request_id: int, applicant_email: str, organization: str
) -> None:
    subject = f"[UniEvents] Cerere nouă organizator #{request_id}"
    body = (
        "O cerere nouă de organizator a fost trimisă:\n\n"
        f"• ID cerere: {request_id}\n"
        f"• Email solicitant: {applicant_email}\n"
        f"• Organizație: {organization}\n\n"
        f"Analizeaz-o în panoul admin: {settings.FRONTEND_BASE_URL}/admin/cereri-organizatori\n\n"
        "— UniEvents USV"
    )
    await _send(to, subject, body)


async def send_request_approved(to: str, first_name: str) -> None:
    subject = "Cererea ta a fost aprobată — UniEvents USV"
    body = (
        f"Bună, {first_name}!\n\n"
        "Cererea ta de organizator a fost aprobată. Acum te poți autentifica "
        f"cu email-ul și parola pe care le-ai folosit la înregistrare.\n\n"
        f"Autentifică-te aici: {settings.FRONTEND_BASE_URL}/login\n\n"
        "— Echipa UniEvents USV"
    )
    await _send(to, subject, body)


async def send_request_rejected(
    to: str, first_name: str, reason: str
) -> None:
    subject = "Rezultatul cererii tale de organizator — UniEvents USV"
    body = (
        f"Bună, {first_name}!\n\n"
        "Cererea ta de organizator a fost respinsă.\n\n"
        f"Motiv: {reason}\n\n"
        "Dacă ai întrebări sau vrei să trimiți o nouă cerere, ne poți contacta "
        "la adresa de mai jos.\n\n"
        "— Echipa UniEvents USV"
    )
    await _send(to, subject, body)


async def send_organizer_created_by_admin(
    to: str, first_name: str, temporary_password: str
) -> None:
    subject = "Cont organizator creat — UniEvents USV"
    body = (
        f"Bună, {first_name}!\n\n"
        "Un administrator ți-a creat un cont de organizator pe platforma UniEvents USV.\n\n"
        f"Email: {to}\n"
        f"Parolă temporară: {temporary_password}\n\n"
        f"Autentifică-te aici: {settings.FRONTEND_BASE_URL}/login\n"
        "Te rugăm să-ți schimbi parola la prima autentificare.\n\n"
        "— Echipa UniEvents USV"
    )
    await _send(to, subject, body)
