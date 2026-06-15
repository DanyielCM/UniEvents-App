"""Seed feedback/reviews for past events.

Adds 6 reviews for "USV Green Campus: Acțiune de Ecologizare și Plantare"
and 1-2 reviews for every other event that has already ended. Idempotent —
skips any (event, user) pair that already has feedback.

Run with: docker compose exec backend python -m app.scripts.seed_feedback_past_events
"""
import asyncio
from datetime import timedelta, timezone

from pwdlib import PasswordHash
from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.crud.feedback import get_by_event_user
from app.models.event import Event
from app.models.feedback import Feedback
from app.models.user import User, UserRole
from app.services.sentiment import analyze_sentiment

password_hash = PasswordHash.recommended()

# New placeholder student accounts needed to reach 6 reviewers for the
# Green Campus event (3 students already exist in the DB).
NEW_STUDENTS = [
    {
        "email": "student3@test.usv.ro",
        "first_name": "Cristina",
        "last_name": "Vasile",
    },
    {
        "email": "student4@test.usv.ro",
        "first_name": "Alexandru",
        "last_name": "Pop",
    },
    {
        "email": "student5@test.usv.ro",
        "first_name": "Roxana",
        "last_name": "Munteanu",
    },
    {
        "email": "student6@test.usv.ro",
        "first_name": "Bogdan",
        "last_name": "Tudor",
    },
    {
        "email": "student7@test.usv.ro",
        "first_name": "Elena",
        "last_name": "Marin",
    },
]

EXISTING_STUDENT_EMAILS = [
    "mihaela.capusneac@student.usv.ro",
    "student@test.usv.ro",
    "student2@test.usv.ro",
]

# Reviews per event title. Each entry is (reviewer_email, rating, comment).
REVIEWS = {
    "USV Green Campus: Acțiune de Ecologizare și Plantare": [
        ("student@test.usv.ro", 5, "O experienta minunata! Am plantat peste 20 de puieti si organizarea a fost impecabila. Recomand cu caldura!"),
        ("student2@test.usv.ro", 5, "Felicitari organizatorilor, totul a fost foarte bine pus la punct. M-am simtit util pentru comunitate."),
        ("mihaela.capusneac@student.usv.ro", 4, "Activitate frumoasa si utila, doar ca am asteptat putin la inceput pentru distribuirea uneltelor."),
        ("student3@test.usv.ro", 5, "Cea mai faina actiune de voluntariat la care am participat. Echipa a fost super organizata!"),
        ("student4@test.usv.ro", 3, "Ideea e buna, dar locul de plantare era cam departe si nu au fost suficiente unelte pentru toata lumea."),
        ("student5@test.usv.ro", 5, "Super experienta, natura iti multumeste! Sigur particip si anul viitor."),
        ("student6@test.usv.ro", 1, "Dezastru organizatoric, am asteptat foarte mult si nu au fost deloc unelte pentru participanti. Sunt dezamagit."),
        ("student7@test.usv.ro", 2, "Activitate dezorganizata, locatia a fost schimbata in ultimul moment fara nicio anuntare. Plictisitor si haotic."),
    ],
    "Workshop Python USV": [
        ("student2@test.usv.ro", 5, "Workshop excelent, am invatat foarte multe lucruri practice despre Python. Multumesc!"),
    ],
    "Workshop Python - Începători": [
        ("mihaela.capusneac@student.usv.ro", 4, "Bun pentru incepatori, ritmul a fost potrivit, dar mi-ar fi placut mai multe exercitii practice."),
    ],
    "Conferință de Inteligență Artificială și Machine Learning": [
        ("student3@test.usv.ro", 5, "Conferinta a fost extrem de interesanta, cu vorbitori de top din industrie."),
        ("student4@test.usv.ro", 4, "Foarte utila, mi-ar fi placut totusi mai mult timp pentru sesiunea de intrebari."),
    ],
    "Cupa Universității la Fotbal 5v5": [
        ("student5@test.usv.ro", 5, "Atmosfera superba, echipele au fost foarte bine organizate. Felicitari!"),
        ("student2@test.usv.ro", 3, "Distractiv, dar a fost o intarziere destul de mare la inceputul turneului."),
    ],
    "Career Fair USV 2026 — Întâlnire cu Angajatorii": [
        ("student@test.usv.ro", 5, "Am gasit oferte foarte interesante si am discutat direct cu reprezentantii companiilor. Recomand!"),
        ("mihaela.capusneac@student.usv.ro", 4, "Util pentru cariera, standurile au fost bine organizate."),
    ],
    "Zi de Voluntariat — Curățenie în Parcul Cetății": [
        ("student3@test.usv.ro", 5, "Activitate frumoasa, am simtit ca am contribuit cu adevarat la comunitate. Felicitari organizatorilor!"),
    ],
    "Festivalul de Film Studențesc — Scurt pe Doi": [
        ("student4@test.usv.ro", 5, "Scurtmetrajele au fost de o calitate impresionanta, atmosfera a fost minunata!"),
        ("student5@test.usv.ro", 2, "Sunetul a avut probleme tehnice in prima parte, destul de plictisitor la momente."),
    ],
    "Speed Networking Studențesc — Primăvara Conexiunilor": [
        ("student2@test.usv.ro", 4, "Format interesant, am facut conexiuni utile pentru proiecte viitoare."),
    ],
}


async def seed() -> None:
    async with AsyncSessionLocal() as session:
        # Ensure the extra placeholder student accounts exist
        for data in NEW_STUDENTS:
            existing = (
                await session.execute(select(User).where(User.email == data["email"]))
            ).scalar_one_or_none()
            if existing is None:
                user = User(
                    email=data["email"],
                    hashed_password=password_hash.hash("student-placeholder-pw"),
                    first_name=data["first_name"],
                    last_name=data["last_name"],
                    role=UserRole.STUDENT,
                    is_active=True,
                )
                session.add(user)
                await session.flush()
                print(f"Created student: {data['email']} (id={user.id})")

        # Load all relevant students by email
        all_emails = EXISTING_STUDENT_EMAILS + [s["email"] for s in NEW_STUDENTS]
        users_result = await session.execute(
            select(User).where(User.email.in_(all_emails))
        )
        users_by_email = {u.email: u for u in users_result.scalars().all()}

        for title, reviews in REVIEWS.items():
            event = (
                await session.execute(select(Event).where(Event.title == title))
            ).scalar_one_or_none()
            if event is None:
                print(f"  SKIP (event not found): {title}")
                continue

            for email, rating, comment in reviews:
                user = users_by_email.get(email)
                if user is None:
                    print(f"  SKIP (user not found): {email}")
                    continue

                existing = await get_by_event_user(session, event.id, user.id)
                if existing is not None:
                    print(f"  exists:  [{title}] {email}")
                    continue

                feedback = Feedback(
                    event_id=event.id,
                    user_id=user.id,
                    rating=rating,
                    comment=comment,
                    sentiment=analyze_sentiment(rating, comment),
                    submitted_at=event.ends_at.astimezone(timezone.utc) + timedelta(days=1),
                )
                session.add(feedback)
                print(f"  created: [{title}] {email} ({rating}*)")

        await session.commit()
    print("Done.")


if __name__ == "__main__":
    asyncio.run(seed())
