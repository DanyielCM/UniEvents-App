"""Seed sample approved events covering all 6 categories.

Run with: docker compose exec backend python -m app.scripts.seed_events
"""
import asyncio
import secrets
import uuid
from datetime import datetime, timezone

from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.models.category import Category
from app.models.event import Event, EventModality, EventStatus, ParticipationType
from app.models.location import Location
from app.models.user import User, UserRole


def _slugify_simple(text: str) -> str:
    import re, unicodedata
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    text = re.sub(r"[^a-z0-9]+", "-", text.lower())
    return text.strip("-") or "event"


EVENTS = [
    {
        "title": "Conferință de Inteligență Artificială și Machine Learning",
        "description": (
            "O conferință dedicată celor mai recente progrese în domeniul inteligenței artificiale "
            "și machine learning. Speakeri din industrie și academia vor prezenta cercetări de vârf, "
            "studii de caz și tendințe pentru viitor. Participarea este deschisă studenților, "
            "masteranzilor și doctoranzilor din toate facultățile tehnice."
        ),
        "category_slug": "academic",
        "starts_at": datetime(2026, 5, 15, 10, 0, tzinfo=timezone.utc),
        "ends_at": datetime(2026, 5, 15, 18, 0, tzinfo=timezone.utc),
        "modality": EventModality.PHYSICAL,
        "participation_type": ParticipationType.REGISTRATION,
        "capacity": 200,
        "location_name": "Amfiteatrul A1, Corp A, USV",
        "location_address": "Str. Universității nr. 13, Suceava",
    },
    {
        "title": "Cupa Universității la Fotbal 5v5",
        "description": (
            "Turneul anual de fotbal în sală dedicat echipelor studențești de la toate facultățile "
            "Universității Ștefan cel Mare din Suceava. Înscrierile se fac pe echipe de 5 jucători. "
            "Meciurile se desfășoară pe parcursul a două weekenduri consecutive. Trofeul și "
            "premii în bani pentru primele trei locuri."
        ),
        "category_slug": "sport",
        "starts_at": datetime(2026, 5, 10, 9, 0, tzinfo=timezone.utc),
        "ends_at": datetime(2026, 5, 24, 17, 0, tzinfo=timezone.utc),
        "modality": EventModality.PHYSICAL,
        "participation_type": ParticipationType.REGISTRATION,
        "capacity": 120,
        "location_name": "Sala de Sport USV",
        "location_address": "Str. Universității nr. 13, Suceava",
    },
    {
        "title": "Career Fair USV 2026 — Întâlnire cu Angajatorii",
        "description": (
            "Cel mai mare târg de carieră din nordul Moldovei, organizat de USV în parteneriat cu "
            "companii de top din IT, inginerie, economie și drept. Participă cu CV-ul tău și discută "
            "direct cu recrutori pentru stagii de practică, programe de traineeship și posturi "
            "full-time. Peste 40 de companii confirmite prezente."
        ),
        "category_slug": "cariera",
        "starts_at": datetime(2026, 5, 20, 10, 0, tzinfo=timezone.utc),
        "ends_at": datetime(2026, 5, 20, 17, 0, tzinfo=timezone.utc),
        "modality": EventModality.PHYSICAL,
        "participation_type": ParticipationType.FREE,
        "capacity": 500,
        "location_name": "Sala Polivalentă, USV",
        "location_address": "Str. Universității nr. 13, Suceava",
    },
    {
        "title": "Zi de Voluntariat — Curățenie în Parcul Cetății",
        "description": (
            "Acțiune de voluntariat ecologic organizată de studenții USV în colaborare cu "
            "Primăria Suceava. Vom curăța Parcul Cetății de Scaun și vom planta 50 de arbuști. "
            "Toți participanții primesc un certificat de voluntariat și o gustare. Echipament de "
            "protecție oferit de organizatori. Vino alături de noi să facem orașul mai verde!"
        ),
        "category_slug": "voluntariat",
        "starts_at": datetime(2026, 5, 9, 8, 30, tzinfo=timezone.utc),
        "ends_at": datetime(2026, 5, 9, 13, 0, tzinfo=timezone.utc),
        "modality": EventModality.PHYSICAL,
        "participation_type": ParticipationType.FREE,
        "capacity": 80,
        "location_name": "Parcul Cetății de Scaun",
        "location_address": "Str. Cetății, Suceava",
    },
    {
        "title": "Festivalul de Film Studențesc — Scurt pe Doi",
        "description": (
            "A cincea ediție a festivalului de scurtmetraje realizate de studenți din întreaga țară. "
            "Timp de două zile vor fi proiectate peste 30 de filme în secțiunile: ficțiune, documentar "
            "și animație. Juriul internațional va acorda premii în fiecare categorie. Accesul la "
            "proiecții este gratuit pentru studenți cu legitimație valabilă."
        ),
        "category_slug": "cultural",
        "starts_at": datetime(2026, 6, 5, 17, 0, tzinfo=timezone.utc),
        "ends_at": datetime(2026, 6, 6, 22, 0, tzinfo=timezone.utc),
        "modality": EventModality.PHYSICAL,
        "participation_type": ParticipationType.FREE,
        "capacity": 150,
        "location_name": "Cinema Modern Suceava",
        "location_address": "Str. Nicolae Bălcescu nr. 4, Suceava",
    },
    {
        "title": "Speed Networking Studențesc — Primăvara Conexiunilor",
        "description": (
            "Un eveniment social inedit în care studenții din diferite facultăți se întâlnesc "
            "și schimbă idei în sesiuni scurte de 5 minute. Scopul este să spargi bula propriei "
            "facultăți, să găsești colegi pentru proiecte interdisciplinare și să-ți extinzi rețeaua. "
            "Seara se încheie cu un cocktail de socializare oferit de organizatori."
        ),
        "category_slug": "social",
        "starts_at": datetime(2026, 5, 28, 18, 0, tzinfo=timezone.utc),
        "ends_at": datetime(2026, 5, 28, 21, 30, tzinfo=timezone.utc),
        "modality": EventModality.PHYSICAL,
        "participation_type": ParticipationType.REGISTRATION,
        "capacity": 60,
        "location_name": "Aula Magna, USV",
        "location_address": "Str. Universității nr. 13, Suceava",
    },
]


async def seed() -> None:
    async with AsyncSessionLocal() as session:
        # Find any organizer or admin to assign as event organizer
        organizer = (
            await session.execute(
                select(User).where(User.role.in_([UserRole.ADMIN, UserRole.ORGANIZER]))
                .order_by(User.id)
                .limit(1)
            )
        ).scalar_one_or_none()

        if organizer is None:
            print("ERROR: No admin or organizer user found. Run seed_admin first.")
            return

        print(f"Using organizer: {organizer.email} (id={organizer.id})")

        # Load categories by slug
        categories_result = await session.execute(select(Category))
        categories = {c.slug: c for c in categories_result.scalars().all()}

        for data in EVENTS:
            # Skip if already exists by title
            existing = (
                await session.execute(select(Event).where(Event.title == data["title"]))
            ).scalar_one_or_none()
            if existing is not None:
                print(f"  exists:  {data['title']}")
                continue

            category = categories.get(data["category_slug"])
            if category is None:
                print(f"  SKIP (category not found): {data['category_slug']}")
                continue

            # Reuse or create location
            loc_result = await session.execute(
                select(Location).where(Location.name == data["location_name"])
            )
            location = loc_result.scalar_one_or_none()
            if location is None:
                location = Location(
                    name=data["location_name"],
                    address=data["location_address"],
                    is_online=False,
                )
                session.add(location)
                await session.flush()

            slug = _slugify_simple(data["title"]) + "-" + uuid.uuid4().hex[:8]
            event = Event(
                title=data["title"],
                slug=slug,
                description=data["description"],
                starts_at=data["starts_at"],
                ends_at=data["ends_at"],
                location_id=location.id,
                category_id=category.id,
                organizer_id=organizer.id,
                modality=data["modality"],
                participation_type=data["participation_type"],
                capacity=data.get("capacity"),
                status=EventStatus.APPROVED,
                approved_by_id=organizer.id,
                approved_at=datetime.now(timezone.utc),
                qr_token=secrets.token_urlsafe(32),
            )
            session.add(event)
            print(f"  created: [{data['category_slug']}] {data['title']}")

        await session.commit()
    print("Done.")


if __name__ == "__main__":
    asyncio.run(seed())
