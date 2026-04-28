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


async def send_waitlist_promoted(
    to: str, first_name: str, event_title: str, ticket_url: str
) -> None:
    subject = f"Loc disponibil — {event_title}"
    body = (
        f"Bună, {first_name}!\n\n"
        f"Vești bune! Un loc s-a eliberat la evenimentul «{event_title}».\n"
        "Înscrierea ta a fost confirmată automat și ai primit un bilet QR.\n\n"
        f"Accesează biletul tău: {ticket_url}\n\n"
        "— Echipa UniEvents USV"
    )
    await _send(to, subject, body)


async def send_registration_confirmed(
    to: str,
    first_name: str,
    event_title: str,
    event_start: str,
    ticket_token: str,
    ticket_url: str,
) -> None:
    subject = f"Înregistrare confirmată — {event_title}"
    body = (
        f"Bună, {first_name}!\n\n"
        f"Înscrierea ta la evenimentul «{event_title}» a fost confirmată.\n\n"
        f"📅 Data: {event_start}\n"
        f"🎫 Codul biletului tău: {ticket_token}\n\n"
        f"Accesează biletul QR aici: {ticket_url}\n\n"
        "Prezintă codul QR la intrare pentru a fi înregistrat ca participant.\n\n"
        "— Echipa UniEvents USV"
    )
    await _send(to, subject, body)


async def send_registration_cancelled(
    to: str, first_name: str, event_title: str
) -> None:
    subject = f"Înregistrare anulată — {event_title}"
    body = (
        f"Bună, {first_name}!\n\n"
        f"Înscrierea ta la evenimentul «{event_title}» a fost anulată.\n\n"
        "Dacă ai anulat din greșeală, te poți reînscrie oricând dacă mai sunt locuri disponibile.\n\n"
        "— Echipa UniEvents USV"
    )
    await _send(to, subject, body)


async def send_event_submitted_to_admin(
    to: str, event_title: str, event_id: int
) -> None:
    subject = f"[UniEvents] Eveniment nou pentru validare: {event_title}"
    body = (
        f"Un organizator a trimis un eveniment nou pentru validare:\n\n"
        f"• Titlu: {event_title}\n"
        f"• ID: {event_id}\n\n"
        f"Revizuiește evenimentul: {settings.FRONTEND_BASE_URL}/admin/validare-evenimente\n\n"
        "— UniEvents USV"
    )
    await _send(to, subject, body)


async def send_event_approved(
    to: str, organizer_name: str, event_title: str
) -> None:
    subject = f"Evenimentul tău a fost aprobat — {event_title}"
    body = (
        f"Bună, {organizer_name}!\n\n"
        f"Evenimentul «{event_title}» a fost aprobat și este acum vizibil pe platformă.\n\n"
        f"Vizualizează-l: {settings.FRONTEND_BASE_URL}/evenimente\n\n"
        "— Echipa UniEvents USV"
    )
    await _send(to, subject, body)


async def send_event_rejected(
    to: str, organizer_name: str, event_title: str, reason: str
) -> None:
    subject = f"Evenimentul tău a fost respins — {event_title}"
    body = (
        f"Bună, {organizer_name}!\n\n"
        f"Evenimentul «{event_title}» nu a putut fi publicat.\n\n"
        f"Motiv: {reason}\n\n"
        "Poți edita evenimentul și retrimite cererea din contul tău de organizator.\n\n"
        f"Autentifică-te: {settings.FRONTEND_BASE_URL}/login\n\n"
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
