"""Seed 20 test events for summer 2026 (2026-06-20 .. 2026-07-31), covering all
6 categories with a realistic mix of modalities, participation types,
capacities/deadlines and QR check-in tokens.

Run with: docker compose exec backend python -m app.scripts.seed_events_summer2026
"""
import asyncio
import secrets
import uuid
from datetime import datetime, timezone

from pwdlib import PasswordHash
from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.models.category import Category
from app.models.event import Event, EventModality, EventStatus, ParticipationType
from app.models.location import Location
from app.models.user import User, UserRole

password_hash = PasswordHash.recommended()

FALLBACK_ORGANIZER_EMAIL = "organizare@usv.ro"


def _slugify_simple(text: str) -> str:
    import re, unicodedata
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    text = re.sub(r"[^a-z0-9]+", "-", text.lower())
    return text.strip("-") or "event"


EVENTS = [
    {
        "title": "Crosul Cetății – Cros Studențesc USV",
        "description": (
            "Ediția de vară a crosului studențesc, pe traseul din jurul Cetății de Scaun. "
            "Sunt disponibile distanțe de 3 km și 10 km, pentru toate nivelurile de pregătire. "
            "Accesul este liber pentru toți studenții și masteranzii USV, indiferent de facultate. "
            "La final, toți participanții primesc apă, fructe și o diplomă de participare."
        ),
        "category_slug": "sport",
        "starts_at": datetime(2026, 6, 20, 9, 0, tzinfo=timezone.utc),
        "ends_at": datetime(2026, 6, 20, 12, 0, tzinfo=timezone.utc),
        "modality": EventModality.PHYSICAL,
        "participation_type": ParticipationType.FREE,
        "location_name": "Parcul Cetății de Scaun",
        "location_address": "Str. Cetății, Suceava",
        "is_online": False,
    },
    {
        "title": "Școala de Vară de Robotică și Automatizări",
        "description": (
            "Program intensiv de o zi dedicat studenților pasionați de robotică, automatizări și "
            "sisteme embedded. Participanții lucrează în echipe mici, sub îndrumarea cadrelor "
            "didactice de la FIESC, pentru a construi și programa mici roboți mobili. "
            "Locurile sunt limitate, fiind necesară înscrierea în avans pe platformă."
        ),
        "category_slug": "academic",
        "starts_at": datetime(2026, 6, 22, 9, 0, tzinfo=timezone.utc),
        "ends_at": datetime(2026, 6, 22, 17, 0, tzinfo=timezone.utc),
        "modality": EventModality.PHYSICAL,
        "participation_type": ParticipationType.REGISTRATION,
        "capacity": 40,
        "registration_deadline": datetime(2026, 6, 18, 23, 59, tzinfo=timezone.utc),
        "with_qr": True,
        "location_name": "Corpul E, Facultatea de Inginerie Electrică și Știința Calculatoarelor (FIESC), USV",
        "location_address": "Str. Universității nr. 13, Suceava",
        "is_online": False,
    },
    {
        "title": "Webinar: Cum îți construiești un CV care contează",
        "description": (
            "Sesiune online interactivă susținută de specialiști în resurse umane, axată pe "
            "structurarea unui CV competitiv pentru piața muncii din IT și domenii conexe. "
            "Vor fi discutate erori frecvente, exemple de CV-uri reale și recomandări pentru "
            "profilul LinkedIn. Acces liber, fără înscriere prealabilă."
        ),
        "category_slug": "cariera",
        "starts_at": datetime(2026, 6, 23, 17, 0, tzinfo=timezone.utc),
        "ends_at": datetime(2026, 6, 23, 19, 0, tzinfo=timezone.utc),
        "modality": EventModality.ONLINE,
        "participation_type": ParticipationType.FREE,
        "location_name": "Platformă online (Microsoft Teams)",
        "location_address": None,
        "is_online": True,
    },
    {
        "title": "Atelier de Voluntariat: Reciclare Creativă",
        "description": (
            "Atelier practic în care studenții transformă materiale reciclabile (carton, plastic, "
            "textile) în obiecte utile pentru cămine și sălile de curs. Materialele sunt puse la "
            "dispoziție de organizatori. Evenimentul face parte din campania USV de promovare a "
            "sustenabilității în campus. Intrare liberă, fără înscriere."
        ),
        "category_slug": "voluntariat",
        "starts_at": datetime(2026, 6, 24, 16, 0, tzinfo=timezone.utc),
        "ends_at": datetime(2026, 6, 24, 19, 0, tzinfo=timezone.utc),
        "modality": EventModality.PHYSICAL,
        "participation_type": ParticipationType.FREE,
        "location_name": "Corpul D, Facultatea de Litere și Științe ale Comunicării, USV",
        "location_address": "Str. Universității nr. 13, Suceava",
        "is_online": False,
    },
    {
        "title": "Turneu de Baschet 3x3 – Cupa USV",
        "description": (
            "Competiție de baschet 3x3 deschisă echipelor formate din studenți ai oricărei "
            "facultăți USV. Turneul se desfășoară pe parcursul unei singure zile, în format "
            "eliminatoriu. Echipele câștigătoare primesc medalii și produse promoționale USV. "
            "Înscrierea echipelor se face în avans, locurile fiind limitate."
        ),
        "category_slug": "sport",
        "starts_at": datetime(2026, 6, 25, 10, 0, tzinfo=timezone.utc),
        "ends_at": datetime(2026, 6, 25, 18, 0, tzinfo=timezone.utc),
        "modality": EventModality.PHYSICAL,
        "participation_type": ParticipationType.REGISTRATION,
        "capacity": 64,
        "registration_deadline": datetime(2026, 6, 22, 23, 59, tzinfo=timezone.utc),
        "with_qr": True,
        "location_name": "Sala de Sport USV",
        "location_address": "Str. Universității nr. 13, Suceava",
        "is_online": False,
    },
    {
        "title": "Noaptea Cercetătorilor la USV – Ediție de Vară",
        "description": (
            "Eveniment de popularizare a cercetării științifice, cu standuri demonstrative, "
            "experimente live și prezentări scurte susținute de cadre didactice și doctoranzi "
            "din toate facultățile. Sesiunile pot fi urmărite și de la distanță, prin "
            "transmisiune live pentru cei care nu pot ajunge la USV. Acces liber pentru public."
        ),
        "category_slug": "academic",
        "starts_at": datetime(2026, 6, 26, 17, 0, tzinfo=timezone.utc),
        "ends_at": datetime(2026, 6, 26, 22, 0, tzinfo=timezone.utc),
        "modality": EventModality.HYBRID,
        "participation_type": ParticipationType.FREE,
        "location_name": "Amfiteatrul A1, Corp A, USV",
        "location_address": "Str. Universității nr. 13, Suceava",
        "is_online": False,
    },
    {
        "title": "Hackathon Smart City Suceava",
        "description": (
            "Competiție de 36 de ore în care echipe mixte de studenți dezvoltă prototipuri "
            "software pentru provocări reale ale orașului Suceava: mobilitate, eficiență "
            "energetică, servicii publice digitale. Mentorat oferit de specialiști din companii "
            "partenere și de cadre didactice de la FIMMM. Premii în bani pentru echipele "
            "câștigătoare. Înscrierea echipelor (2-5 membri) se face în avans."
        ),
        "category_slug": "cariera",
        "starts_at": datetime(2026, 6, 27, 9, 0, tzinfo=timezone.utc),
        "ends_at": datetime(2026, 6, 28, 18, 0, tzinfo=timezone.utc),
        "modality": EventModality.PHYSICAL,
        "participation_type": ParticipationType.REGISTRATION,
        "capacity": 60,
        "registration_deadline": datetime(2026, 6, 24, 23, 59, tzinfo=timezone.utc),
        "with_qr": True,
        "location_name": "Corpul C, Facultatea de Inginerie Mecanică, Mecatronică și Management, USV",
        "location_address": "Str. Universității nr. 13, Suceava",
        "is_online": False,
    },
    {
        "title": "Speed Dating Academic – Găsește-ți Echipa de Proiect",
        "description": (
            "Sesiune online de socializare în care studenții din ani și specializări diferite "
            "se prezintă pe rând, în runde scurte, pentru a-și găsi colegi de echipă pentru "
            "proiecte de cercetare, hackathoane sau concursuri. Organizat prin platforma de "
            "videoconferință a universității. Locurile sunt limitate pentru a păstra un format "
            "interactiv."
        ),
        "category_slug": "social",
        "starts_at": datetime(2026, 6, 29, 18, 0, tzinfo=timezone.utc),
        "ends_at": datetime(2026, 6, 29, 20, 0, tzinfo=timezone.utc),
        "modality": EventModality.ONLINE,
        "participation_type": ParticipationType.REGISTRATION,
        "capacity": 50,
        "registration_deadline": datetime(2026, 6, 27, 23, 59, tzinfo=timezone.utc),
        "with_qr": True,
        "location_name": "Platformă online (Zoom)",
        "location_address": None,
        "is_online": True,
    },
    {
        "title": "Seară de Filme sub Cerul Liber – Scurtmetraje Studențești",
        "description": (
            "Proiecție gratuită, în aer liber, a celor mai apreciate scurtmetraje realizate de "
            "studenți la atelierele de film organizate pe parcursul anului universitar. "
            "Atmosferă relaxată, cu loc de stat pe pernuțe și gustări oferite de organizatori. "
            "Acces liber, în limita locurilor disponibile la fața locului."
        ),
        "category_slug": "cultural",
        "starts_at": datetime(2026, 6, 30, 20, 30, tzinfo=timezone.utc),
        "ends_at": datetime(2026, 6, 30, 23, 0, tzinfo=timezone.utc),
        "modality": EventModality.PHYSICAL,
        "participation_type": ParticipationType.FREE,
        "location_name": "Cinema Modern Suceava",
        "location_address": "Str. Nicolae Bălcescu nr. 4, Suceava",
        "is_online": False,
    },
    {
        "title": "Zilele Carierei FEAA – Internship & Job Fair",
        "description": (
            "Eveniment de recrutare organizat de Facultatea de Științe Economice și Administrație "
            "Publică, cu participarea companiilor partenere din domeniile financiar-contabil, "
            "marketing și administrație. Standurile fizice din Corpul H sunt completate de "
            "sesiuni online de prezentare a companiilor, pentru cei care preferă participarea "
            "de la distanță. Înscrierea în avans este necesară pentru acces la interviurile "
            "programate."
        ),
        "category_slug": "cariera",
        "starts_at": datetime(2026, 7, 2, 10, 0, tzinfo=timezone.utc),
        "ends_at": datetime(2026, 7, 2, 17, 0, tzinfo=timezone.utc),
        "modality": EventModality.HYBRID,
        "participation_type": ParticipationType.REGISTRATION,
        "capacity": 150,
        "registration_deadline": datetime(2026, 6, 29, 23, 59, tzinfo=timezone.utc),
        "with_qr": True,
        "location_name": "Corpul H, Facultatea de Științe Economice și Administrație Publică (FEAA), USV",
        "location_address": "Str. Universității nr. 13, Suceava",
        "is_online": False,
    },
    {
        "title": "Picnic de Vară al Studenților USV",
        "description": (
            "Întâlnire informală în aer liber, pe spațiul verde din campus, dedicată socializării "
            "între studenții rămași în Suceava pe perioada vacanței de vară. Muzică, jocuri de "
            "societate și grătar vegetarian oferit de organizația studențească. Acces liber, "
            "fiecare participant este invitat să își aducă o gustare de partajat."
        ),
        "category_slug": "social",
        "starts_at": datetime(2026, 7, 4, 12, 0, tzinfo=timezone.utc),
        "ends_at": datetime(2026, 7, 4, 18, 0, tzinfo=timezone.utc),
        "modality": EventModality.PHYSICAL,
        "participation_type": ParticipationType.FREE,
        "location_name": "Spațiul Verde din Campusul USV",
        "location_address": "Str. Universității nr. 13, Suceava",
        "is_online": False,
    },
    {
        "title": "Conferința Studenților Economiști – Inovație și Sustenabilitate",
        "description": (
            "Conferință științifică studențească la care participanții prezintă lucrări de "
            "cercetare pe teme de economie verde, inovație în afaceri și digitalizare. "
            "Lucrările sunt evaluate de un comitet științific format din cadre didactice de la "
            "FEAA, iar autorii celor mai bune lucrări primesc diplome și premii. Înscrierea "
            "lucrărilor și a participanților se face în avans."
        ),
        "category_slug": "academic",
        "starts_at": datetime(2026, 7, 7, 9, 30, tzinfo=timezone.utc),
        "ends_at": datetime(2026, 7, 7, 16, 0, tzinfo=timezone.utc),
        "modality": EventModality.PHYSICAL,
        "participation_type": ParticipationType.REGISTRATION,
        "capacity": 100,
        "registration_deadline": datetime(2026, 7, 3, 23, 59, tzinfo=timezone.utc),
        "with_qr": True,
        "location_name": "Corpul H, Facultatea de Științe Economice și Administrație Publică (FEAA), USV",
        "location_address": "Str. Universității nr. 13, Suceava",
        "is_online": False,
    },
    {
        "title": "Donează Sânge pentru Comunitate",
        "description": (
            "Campanie de donare de sânge organizată în parteneriat cu Centrul de Transfuzie "
            "Sanguină Suceava, deschisă studenților, cadrelor didactice și personalului USV. "
            "Fiecare donator primește o gustare, o adeverință și o zi liberă de la cursuri, "
            "conform reglementărilor în vigoare. Acces liber, fără programare în avans."
        ),
        "category_slug": "voluntariat",
        "starts_at": datetime(2026, 7, 9, 9, 0, tzinfo=timezone.utc),
        "ends_at": datetime(2026, 7, 9, 14, 0, tzinfo=timezone.utc),
        "modality": EventModality.PHYSICAL,
        "participation_type": ParticipationType.FREE,
        "location_name": "Aula Magna, USV",
        "location_address": "Str. Universității nr. 13, Suceava",
        "is_online": False,
    },
    {
        "title": "Festivalul Internațional de Folclor Studențesc",
        "description": (
            "Eveniment cultural de două zile, cu participarea unor ansambluri de dansuri și "
            "muzică populară din România și din țări partenere ale USV. Programul include "
            "spectacole de seară în Sala Polivalentă, precum și un târg de artizanat tradițional. "
            "Accesul se face pe bază de bilet, biletele putând fi achiziționate și online."
        ),
        "category_slug": "cultural",
        "starts_at": datetime(2026, 7, 11, 18, 0, tzinfo=timezone.utc),
        "ends_at": datetime(2026, 7, 12, 23, 0, tzinfo=timezone.utc),
        "modality": EventModality.PHYSICAL,
        "participation_type": ParticipationType.TICKETED,
        "capacity": 400,
        "registration_deadline": datetime(2026, 7, 8, 23, 59, tzinfo=timezone.utc),
        "registration_link": "https://bilete.usv.ro/festival-folclor-2026",
        "with_qr": True,
        "location_name": "Sala Polivalentă, USV",
        "location_address": "Str. Universității nr. 13, Suceava",
        "is_online": False,
    },
    {
        "title": "Curs Intensiv Online: Introducere în Inteligența Artificială",
        "description": (
            "Curs introductiv pe parcursul a două seri, susținut online prin platforma de "
            "videoconferință a universității, dedicat conceptelor fundamentale de inteligență "
            "artificială și machine learning. Cursul include exemple practice în Python și "
            "recomandări de resurse pentru aprofundare. Numărul de locuri este limitat pentru a "
            "permite interacțiunea cu lectorul."
        ),
        "category_slug": "academic",
        "starts_at": datetime(2026, 7, 14, 17, 0, tzinfo=timezone.utc),
        "ends_at": datetime(2026, 7, 15, 20, 0, tzinfo=timezone.utc),
        "modality": EventModality.ONLINE,
        "participation_type": ParticipationType.REGISTRATION,
        "capacity": 120,
        "registration_deadline": datetime(2026, 7, 10, 23, 59, tzinfo=timezone.utc),
        "with_qr": True,
        "location_name": "Platformă online (Microsoft Teams)",
        "location_address": None,
        "is_online": True,
    },
    {
        "title": "Acțiune de Împădurire – Pădurea Zamca",
        "description": (
            "Acțiune ecologică de plantare a puieților de foioase în Pădurea Zamca, organizată "
            "împreună cu Ocolul Silvic Suceava. Participanții primesc echipament de protecție, "
            "unelte și instrucțiuni de plantare din partea specialiștilor silvici. La final, "
            "fiecare participant primește un certificat de voluntariat. Acces liber, fără "
            "înscriere prealabilă."
        ),
        "category_slug": "voluntariat",
        "starts_at": datetime(2026, 7, 18, 8, 0, tzinfo=timezone.utc),
        "ends_at": datetime(2026, 7, 18, 13, 0, tzinfo=timezone.utc),
        "modality": EventModality.PHYSICAL,
        "participation_type": ParticipationType.FREE,
        "location_name": "Pădurea Zamca, Suceava",
        "location_address": "Zamca, Suceava",
        "is_online": False,
    },
    {
        "title": "Turneu de Șah USV Open",
        "description": (
            "Turneu de șah cu sistem elvețian, deschis studenților, masteranzilor și "
            "doctoranzilor USV, indiferent de nivelul de pregătire. Turneul se desfășoară pe "
            "parcursul unei zile, în Biblioteca Universitară, cu mai multe runde cronometrate. "
            "Câștigătorii primesc cărți de specialitate și diplome. Numărul de table disponibile "
            "este limitat, fiind necesară înscrierea în avans."
        ),
        "category_slug": "sport",
        "starts_at": datetime(2026, 7, 21, 9, 0, tzinfo=timezone.utc),
        "ends_at": datetime(2026, 7, 21, 18, 0, tzinfo=timezone.utc),
        "modality": EventModality.PHYSICAL,
        "participation_type": ParticipationType.REGISTRATION,
        "capacity": 32,
        "registration_deadline": datetime(2026, 7, 17, 23, 59, tzinfo=timezone.utc),
        "with_qr": True,
        "location_name": "Biblioteca Universitară USV",
        "location_address": "Str. Universității nr. 13, Suceava",
        "is_online": False,
    },
    {
        "title": "Caravana Voluntarilor – Ateliere pentru Copii",
        "description": (
            "Ateliere educative și recreative pentru copii din centrele sociale partenere ale "
            "USV, susținute de studenți voluntari de la toate facultățile. Activitățile includ "
            "jocuri științifice, desen și mișcare. Voluntarii primesc o scurtă instruire înainte "
            "de eveniment și un certificat de participare la final. Numărul de voluntari este "
            "limitat, fiind necesară înscrierea în avans."
        ),
        "category_slug": "voluntariat",
        "starts_at": datetime(2026, 7, 25, 10, 0, tzinfo=timezone.utc),
        "ends_at": datetime(2026, 7, 25, 15, 0, tzinfo=timezone.utc),
        "modality": EventModality.PHYSICAL,
        "participation_type": ParticipationType.REGISTRATION,
        "capacity": 25,
        "registration_deadline": datetime(2026, 7, 22, 23, 59, tzinfo=timezone.utc),
        "with_qr": True,
        "location_name": "Corpul B, Facultatea de Educație Fizică și Sport, USV",
        "location_address": "Str. Universității nr. 13, Suceava",
        "is_online": False,
    },
    {
        "title": "Gala Absolvenților USV 2026",
        "description": (
            "Eveniment festiv de încheiere a anului universitar, dedicat absolvenților din "
            "promoția 2026. Programul include decernarea diplomelor de excelență, momente "
            "artistice și o sesiune de fotografii oficiale. Pentru absolvenții și familiile care "
            "nu pot fi prezenți fizic, evenimentul este transmis live. Accesul în sală se face "
            "pe bază de bilet, disponibil și în format online."
        ),
        "category_slug": "social",
        "starts_at": datetime(2026, 7, 28, 19, 0, tzinfo=timezone.utc),
        "ends_at": datetime(2026, 7, 28, 23, 59, tzinfo=timezone.utc),
        "modality": EventModality.HYBRID,
        "participation_type": ParticipationType.TICKETED,
        "capacity": 300,
        "registration_deadline": datetime(2026, 7, 24, 23, 59, tzinfo=timezone.utc),
        "registration_link": "https://bilete.usv.ro/gala-absolventilor-2026",
        "with_qr": True,
        "location_name": "Sala Polivalentă, USV",
        "location_address": "Str. Universității nr. 13, Suceava",
        "is_online": False,
    },
    {
        "title": "Workshop Practic: Dezvoltare Web cu React",
        "description": (
            "Workshop practic de o zi, destinat studenților care vor să își îmbunătățească "
            "abilitățile de dezvoltare front-end folosind React. Participanții lucrează pe laptop "
            "propriu, sub îndrumarea unui formator cu experiență în industrie, la o aplicație "
            "demonstrativă. Sesiunea poate fi urmărită și online, pentru cei care preferă "
            "participarea de la distanță. Numărul de locuri fizice este limitat, fiind necesară "
            "înscrierea în avans."
        ),
        "category_slug": "academic",
        "starts_at": datetime(2026, 7, 31, 10, 0, tzinfo=timezone.utc),
        "ends_at": datetime(2026, 7, 31, 16, 0, tzinfo=timezone.utc),
        "modality": EventModality.HYBRID,
        "participation_type": ParticipationType.REGISTRATION,
        "capacity": 40,
        "registration_deadline": datetime(2026, 7, 28, 23, 59, tzinfo=timezone.utc),
        "with_qr": True,
        "location_name": "Corpul E, Facultatea de Inginerie Electrică și Știința Calculatoarelor (FIESC), USV",
        "location_address": "Str. Universității nr. 13, Suceava",
        "is_online": False,
    },
]


async def seed() -> None:
    async with AsyncSessionLocal() as session:
        # Find an existing admin or organizer to assign as event organizer
        organizer = (
            await session.execute(
                select(User).where(User.role.in_([UserRole.ADMIN, UserRole.ORGANIZER]))
                .order_by(User.id)
                .limit(1)
            )
        ).scalar_one_or_none()

        if organizer is None:
            # No admin/organizer exists yet — create the USV organizer account
            # (same convention as seed_usv_organizer.py) so the seed is self-sufficient.
            organizer = (
                await session.execute(
                    select(User).where(User.email == FALLBACK_ORGANIZER_EMAIL)
                )
            ).scalar_one_or_none()
            if organizer is None:
                organizer = User(
                    email=FALLBACK_ORGANIZER_EMAIL,
                    hashed_password=password_hash.hash("usv-placeholder-pw"),
                    first_name="USV",
                    last_name="",
                    role=UserRole.ORGANIZER,
                    is_active=True,
                )
                session.add(organizer)
                await session.flush()
                print(f"Created USV organizer (id={organizer.id})")

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
                    is_online=data["is_online"],
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
                registration_link=data.get("registration_link"),
                registration_deadline=data.get("registration_deadline"),
                status=EventStatus.APPROVED,
                approved_by_id=organizer.id,
                approved_at=datetime.now(timezone.utc),
                qr_token=secrets.token_urlsafe(32) if data.get("with_qr") else None,
            )
            session.add(event)
            print(f"  created: [{data['category_slug']}] {data['title']}")

        await session.commit()
    print("Done.")


if __name__ == "__main__":
    asyncio.run(seed())
