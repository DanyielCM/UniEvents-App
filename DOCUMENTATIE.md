# UniEvents USV — Documentație tehnică

Platformă centralizată pentru managementul evenimentelor universitare la
Universitatea „Ștefan cel Mare" din Suceava (USV), dezvoltată ca proiect pentru
disciplina TWAAOS-SIC, conform `resources/Caiet de sarcini TWAAOS-SIC,
2025-2026.pdf`.

---

## 1. Prezentare generală

Studenții, cadrele didactice și organizațiile studențești promovează evenimente
(conferințe, workshop-uri, concursuri, acțiuni de voluntariat etc.) pe canale
disparate (e-mail, social media, afișe), ceea ce face descoperirea lor dificilă.
UniEvents oferă un singur loc în care evenimentele USV pot fi căutate, filtrate,
vizualizate într-un calendar, și la care utilizatorii se pot înscrie.

Aplicația definește **3 roluri**:

- **Student** — se autentifică prin Google OAuth (cont `@student.usv.ro`),
  descoperă evenimente, se înscrie, primește remindere, dă feedback și are
  recomandări personalizate.
- **Organizator** — cont creat de admin sau prin cerere aprobată, gestionează
  propriile evenimente (CRUD, materiale, sponsori, participanți, statistici).
- **Administrator** — validează evenimente, gestionează conturile de
  organizator/utilizator și generează rapoarte (inclusiv PDF).

---

## 2. Arhitectură

```
                 ┌──────────────────────────┐
                 │        Browser            │
                 └─────────────┬─────────────┘
                                │ HTTP :3000
                                ▼
                 ┌──────────────────────────┐
                 │  Frontend (React + Vite)   │   container "frontend"
                 │  vite dev server :3000     │
                 │  proxy /api/v1 → backend    │
                 └─────────────┬─────────────┘
                                │ /api/v1/* (proxy) → http://backend:8000
                                ▼
                 ┌──────────────────────────┐
                 │  Backend (FastAPI)          │   container "backend"
                 │  uvicorn --reload :8000      │
                 │  app/main.py + routers       │
                 └───┬──────────┬────────────┬─┘
                     │          │            │
        SQLAlchemy   │   SMTP   │   HTTP     │ APScheduler (in-process)
        asyncpg      │          │  (userinfo)│ job "run_due_reminders" /15min
                     ▼          ▼            ▼
            ┌────────────┐ ┌─────────┐ ┌─────────────────┐
            │ PostgreSQL  │ │ Mailhog │ │ accounts.google. │
            │ "db" :5432  │ │ "mailhog"│ │ com (OAuth        │
            │ (postgres17)│ │1025/8025 │ │ userinfo)         │
            └────────────┘ └─────────┘ └─────────────────┘
```

**Flux tipic** (ex. listare evenimente): `Browser → Vite proxy (/api/v1/public/events)
→ FastAPI router events_public.py → CRUD app/crud/event.py → SQLAlchemy async
→ asyncpg → PostgreSQL`, răspunsul fiind serializat prin scheme Pydantic
(`app/schemas/event.py`) către client.

**Servicii externe**:
- **Google OAuth** — autentificarea studenților (`@react-oauth/google` pe
  frontend, validare token pe backend prin `app/auth/google.py` contra
  `https://www.googleapis.com/oauth2/v3/userinfo`).
- **Google Calendar** — buton "adaugă în calendar" generează un URL
  `calendar.google.com/calendar/render` (`app/services/google_calendar.py`),
  nu necesită API key.
- **SMTP** — `app/email_service.py` trimite e-mailuri (confirmare înscriere,
  remindere, notificări admin/organizator) via `aiosmtplib`; în dev rulează
  prin containerul **Mailhog** (SMTP pe `1025`, UI web pe `8025`).
- **Fișiere statice** — uploads (poze evenimente, materiale, sigle sponsori)
  sunt salvate pe disc în volumul `uploads_data` și servite de FastAPI prin
  `app.mount("/uploads", StaticFiles(...))`.

---

## 3. Stack tehnologic și decizii

| Strat | Tehnologii |
|---|---|
| Backend | FastAPI 0.135, SQLAlchemy 2.0 (async), asyncpg, Alembic, Pydantic v2, PyJWT, pwdlib (Argon2) |
| Servicii suport | segno (cod QR), icalendar (export .ics), fpdf2 (rapoarte PDF), apscheduler, aiosmtplib, beautifulsoup4/lxml/openpyxl |
| Frontend | React 18 + Vite, React Router, TailwindCSS 4, Framer Motion, `@react-oauth/google`, FullCalendar, react-hook-form, recharts |
| Bază de date | PostgreSQL 17 (alpine), dockerizată |
| Infrastructură | Docker Compose (4 servicii: `backend`, `frontend`, `db`, `mailhog`) |

**De ce async (FastAPI + SQLAlchemy async + asyncpg)?** Majoritatea
operațiilor sunt I/O-bound (interogări DB, apeluri către Google, SMTP).
Stack-ul async permite servirii multor cereri concurente (ex. listarea
evenimentelor de către mulți studenți simultan) fără a bloca worker-ul
uvicorn pe fiecare query.

**De ce `BackgroundTasks` + APScheduler și nu Celery?** Task-urile async ale
aplicației sunt fie *fire-and-forget* per-request (trimiterea unui e-mail de
confirmare după înscriere, folosind `BackgroundTasks` din FastAPI), fie un
job periodic simplu (verificarea remindere-lor scadente, la 15 minute, pornit
în `lifespan` din `app/main.py` cu `AsyncIOScheduler`). Ambele rulează
in-process, fără stare persistentă proprie — adăugarea unui broker de mesaje
(Redis/RabbitMQ) și a unor worker-e Celery separate ar fi infrastructură
suplimentară nejustificată la acest volum de task-uri.

---

## 4. Funcționalități pe rol

Legendă: ✅ implementat · 🟡 parțial · ⛔ neimplementat

### A. Student
| # | Cerință | Stare | Notă |
|---|---|---|---|
| 1 | Login Google OAuth, doar `@student.usv.ro` | ✅ | `POST /api/v1/auth/google`, verifică domeniul (`ALLOWED_EMAIL_DOMAIN`) |
| 2 | Listă + calendar interactiv, detalii eveniment | ✅ | `Events.jsx` (FullCalendar), `EventDetail.jsx` |
| 3 | Filtrare/căutare (facultate, dată, categorie, locație, organizator, modalitate, intrare liberă/înscriere/QR) | ✅ | `GET /api/v1/public/events` cu `category_id`, `location_id`, `organizer_id`, `modality`, `participation_type`, `date_from/to`, `q`, `has_qr` |
| 4 | Adăugare în Google Calendar + export `.ics` | ✅ | `GET /api/v1/public/events/{id}/gcal`, `.../ics` |
| 5 | Feedback/rating după eveniment | ✅ | `app/routes/feedback.py` |
| 6 | Sortare evenimente | ✅ | parametru `sort` |
| 7 | Filtre combinabile AND/OR | 🟡 | filtrele se combină cu AND; fără operator OR configurabil din UI |
| 8 | Înscriere (+ e-mail confirmare, listă de așteptare) | ✅ | `app/routes/registrations.py`, `app/email_service.py` |
| 9 | Abandonare înscriere | ✅ | `DELETE /api/v1/registrations/events/{id}` |
| 10 | Notificări/remindere pentru evenimente preferate | ✅ | favorite (`app/routes/favorites.py`) + remindere automate la 24h înainte pentru înscrieri (`app/services/reminders.py`, job APScheduler) |
| 11 | Bilete/cod QR generate automat | ✅ | `qr_token` la aprobarea evenimentului; QR per înscriere `GET /api/v1/registrations/{id}/qr.png` |
| 12 | Recomandări personalizate | ✅ | `GET /api/v1/recommendations`, pe baza categoriilor din istoricul de înscrieri/favorite |
| 13 | Analiză de sentiment pe feedback | ✅ | `app/services/sentiment.py` (reguli pe cuvinte-cheie RO + scor) |

### B. Organizator
| # | Cerință | Stare | Notă |
|---|---|---|---|
| 1 | Login user/parolă | ✅ | `POST /api/v1/auth/login`, doar roluri `organizer`/`admin` |
| 2 | CRUD evenimente (titlu, descriere, dată start/sfârșit, locație, categorie, modalitate, organizator, link înscriere, cod QR, sponsori) | ✅ | `app/routes/events.py`, model `app/models/event.py`, `app/models/sponsor.py` |
| 3 | Management participanți (listă, export, check-in) | ✅ | `GET .../participants`, `GET .../export`, `POST .../check-in` |
| 4 | Upload/publicare materiale (prezentări, poze, PDF) | ✅ | `app/routes/events.py` (materiale), `app/services/files.py` |
| 5 | Statistici (participanți, feedback) | ✅ | `GET /api/v1/events/{id}/stats`, `OrganizerEventStats.jsx` |
| 6 | Limite număr/dimensiune fișiere per eveniment | ✅ | câmpuri `max_file_size_mb`, `max_files` pe `Event` |
| 7 | Înscriere cu capacitate, deadline, gestionare înscriși | ✅ | câmpuri `capacity`, `registration_deadline` + listă participanți |

### C. Administrator
| # | Cerință | Stare | Notă |
|---|---|---|---|
| 1 | Login user/parolă | ✅ | comun cu organizatorul, rol `admin` |
| 2 | Gestionare conturi organizator | ✅ | `app/routes/organizer_requests.py` (cereri) + `POST /api/v1/users/organizers` (creare directă) |
| 3 | Validare evenimente înainte de publicare | ✅ | `POST /api/v1/events/{id}/approve` / `/reject` |
| 4 | Rapoarte (evenimente/lună, participare medie, evenimente per organizator) | ✅ | `GET /api/v1/admin/reports/overview`, `/monthly`, `/organizers` |
| 5 | Rapoarte PDF | ✅ | `GET /api/v1/admin/reports/pdf` (`app/services/pdf_report.py`, fpdf2) |
| 6 | Gestionare conturi utilizatori (rol, activare/dezactivare) | ✅ | `GET/PATCH /api/v1/users/...`, `AdminUsers.jsx` |

### D. Bonus
| # | Cerință | Stare | Notă |
|---|---|---|---|
| 1 | Scraping AI de evenimente din alte site-uri din Suceava | ⛔ | doar modelul de date `app/models/scraped_event.py` + tabela din migrare există; fără serviciu de scraping sau rută API |

---

## 5. Instalare, configurare și rulare (din codul sursă, cu Docker Compose)

### 5.1 Cerințe

- Docker Desktop (sau Docker Engine + Docker Compose v2)
- Porturi libere pe host: **3000** (frontend), **8000** (backend), **1025** și
  **8025** (Mailhog). Portul PostgreSQL nu este expus pe host.

### 5.2 Structura relevantă

```
UniEvents/
├── docker-compose.yml
├── backend/
│   ├── Dockerfile, entrypoint.sh, requirements.txt
│   ├── .env                 # configurare backend + Postgres
│   ├── alembic/              # migrări (rulate automat la pornire)
│   └── app/
│       ├── main.py           # FastAPI app + routere
│       ├── config.py         # Settings (pydantic-settings, citește .env)
│       └── scripts/           # seed_admin.py, seed_categories.py, ...
└── frontend/
    ├── Dockerfile
    ├── .env                  # VITE_GOOGLE_CLIENT_ID, VITE_API_BASE_URL
    └── vite.config.js        # dev server :3000 + proxy /api/v1 → backend:8000
```

### 5.3 Variabile de mediu — `backend/.env`

```env
# PostgreSQL
POSTGRES_DB=app_db
POSTGRES_USER=app_user
POSTGRES_PASSWORD=changeme
DATABASE_URL=postgresql+asyncpg://app_user:changeme@db:5432/app_db

# JWT
JWT_SECRET_KEY=<cheie generată, vezi mai jos>
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7

# Google OAuth (autentificare studenți)
GOOGLE_CLIENT_ID=<client id din Google Cloud Console>
GOOGLE_CLIENT_SECRET=<client secret>
ALLOWED_EMAIL_DOMAIN=student.usv.ro

# Upload fișiere
UPLOAD_MAX_SIZE_MB=10
UPLOAD_DIR=/app/uploads
QR_CODE_BASE_URL=http://localhost:3000/events

# Cont admin inițial (folosit de scriptul de seed)
ADMIN_SEED_EMAIL=admin@example.com
ADMIN_SEED_PASSWORD=<parolă admin>

# SMTP (în dev: Mailhog)
SMTP_HOST=mailhog
SMTP_PORT=1025
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM_EMAIL=noreply@usv.ro
SMTP_FROM_NAME=UniEvents USV
SMTP_USE_TLS=false

# CORS — originile frontend permise
CORS_ORIGINS=http://localhost:3000
```

Generează un `JWT_SECRET_KEY` aleator:

```bash
python -c "import secrets; print(secrets.token_urlsafe(64))"
```

> `backend/.env` este și sursa de variabile pentru containerul `db` (citește
> `POSTGRES_DB`/`POSTGRES_USER`/`POSTGRES_PASSWORD` — vezi `docker-compose.yml`).

### 5.4 Variabile de mediu — `frontend/.env`

```env
VITE_GOOGLE_CLIENT_ID=<același client id ca în backend>
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

### 5.5 Configurare Google OAuth

Autentificarea studenților folosește fluxul implicit din
`@react-oauth/google` (frontend obține un access token, backend îl validează
prin `userinfo` și verifică domeniul de e-mail).

1. Intră în [Google Cloud Console](https://console.cloud.google.com/) →
   *APIs & Services* → *Credentials*.
2. Creează un **OAuth client ID** de tip **Web application**.
3. La **Authorized JavaScript origins** adaugă `http://localhost:3000`
   (originea frontend-ului — fluxul implicit nu necesită redirect URI).
4. Copiază **Client ID** (și opțional *Client secret*, neutilizat momentan de
   backend, dar prezent ca placeholder în `Settings`):
   - `frontend/.env` → `VITE_GOOGLE_CLIENT_ID`
   - `backend/.env` → `GOOGLE_CLIENT_ID` (și `GOOGLE_CLIENT_SECRET`, opțional)
5. Setează `ALLOWED_EMAIL_DOMAIN=student.usv.ro` în `backend/.env` — login-ul
   Google este respins (403) pentru orice alt domeniu și pentru orice cont
   care nu are rolul `student`.

### 5.6 Pornirea aplicației

Din rădăcina proiectului:

```bash
docker compose up --build
```

Acest comandă:
1. Construiește imaginile `backend` (Python 3.13-slim, multi-stage) și
   `frontend` (Node 20-alpine).
2. Pornește `db` (Postgres 17) și așteaptă să fie *healthy*
   (`pg_isready`, vezi healthcheck în `docker-compose.yml`).
3. La pornirea containerului `backend`, `entrypoint.sh` rulează automat
   `alembic upgrade head`, apoi pornește `uvicorn app.main:app --reload`.
4. Pornește `frontend` (`npm run dev`, Vite pe `0.0.0.0:3000`) și `mailhog`.

Pentru rulare în background: `docker compose up --build -d`.

### 5.7 Date inițiale (seed)

Migrările creează schema, dar **nu** populează date de bază — rulează după
primul `up`:

```bash
# Cont administrator (folosește ADMIN_SEED_EMAIL / ADMIN_SEED_PASSWORD din .env)
docker compose exec backend python -m app.scripts.seed_admin

# Cele 6 categorii (academic, sport, cariera, voluntariat, cultural, social)
docker compose exec backend python -m app.scripts.seed_categories

# Opțional: evenimente demo
docker compose exec backend python -m app.scripts.seed_events
docker compose exec backend python -m app.scripts.seed_usv_organizer
docker compose exec backend python -m app.scripts.seed_events_summer2026
```

Toate scripturile din `app/scripts/` sunt idempotente (verifică existența
înainte de a crea).

### 5.8 Verificare

- Backend health check: `curl http://localhost:8000/health` → `{"status": "healthy"}`
- Documentație API interactivă: [http://localhost:8000/docs](http://localhost:8000/docs) (Swagger) sau `/redoc`
- Aplicație web: [http://localhost:3000](http://localhost:3000)
- E-mailuri trimise în dev (confirmări, remindere): UI Mailhog la
  [http://localhost:8025](http://localhost:8025)
- Autentificare admin: din `/login`, cu `ADMIN_SEED_EMAIL` /
  `ADMIN_SEED_PASSWORD`.

### 5.9 Migrări Alembic

Migrările sunt în `backend/alembic/versions/` și se aplică automat la
pornirea containerului `backend` (`alembic upgrade head` în `entrypoint.sh`).
Migrările existente (în ordine): `0001_initial`, `0002_add_roles_and_google_oauth`,
`0003_seed_admin` (no-op, sigea seedul a fost mutat în script),
`0004_organizer_requests_and_role_normalization`, `0005_core_event_domain`
(evenimente, categorii, locații, înscrieri, favorite, remindere, feedback,
sponsori, materiale), `0006_event_cover_position`, `0007_user_organization`.

Pentru o nouă modificare de schemă:

```bash
# 1. modifică modelul SQLAlchemy în app/models/
# 2. generează migrarea
docker compose exec backend alembic revision --autogenerate -m "descriere"
# 3. revizuiește fișierul generat în alembic/versions/
# 4. aplic-o
docker compose exec backend alembic upgrade head
```

Comenzi utile: `docker compose exec backend alembic current`,
`docker compose exec backend alembic history --verbose`.

### 5.10 Troubleshooting

- **`backend` se restartează în buclă** — verifică `docker compose logs backend`;
  cel mai frecvent motiv este `DATABASE_URL` greșit sau `db` neavailable
  (compose are deja `depends_on: db: condition: service_healthy`, deci de
  obicei nu e nevoie de retry manual).
- **Login Google dă 403 "rezervată adreselor @student.usv.ro"** —
  `ALLOWED_EMAIL_DOMAIN` din `backend/.env` nu corespunde domeniului folosit la
  testare, sau contul folosit are alt rol decât `student`.
- **CORS error în consola browser-ului** — `CORS_ORIGINS` din `backend/.env`
  trebuie să includă originea exactă a frontend-ului (`http://localhost:3000`).
- **Modificările de cod nu apar** — `backend` și `frontend` montează codul ca
  volum (`./backend:/app`, `./frontend:/app`) și rulează cu reload (`--reload`
  / `vite dev`); o reconstrucție (`--build`) e necesară doar la schimbarea
  dependențelor (`requirements.txt` / `package.json`).
- **Reset complet al bazei de date**: `docker compose down -v` (șterge și
  volumul `postgres_data`), urmat de `docker compose up --build` și re-seed.
- **Fișiere uploadate (poze, materiale) "dispar"** — sunt persistate în
  volumul named `uploads_data` (`/app/uploads` în container); nu sunt șterse
  la `docker compose down` (fără `-v`).

---

## 6. Endpoints API — prezentare generală

Toate rutele de business sunt sub prefixul `/api/v1`. Documentația completă,
interactivă, este la `/docs`.

| Grup | Prefix | Exemple de endpoint-uri | Acces |
|---|---|---|---|
| Auth | `/api/v1/auth` | `POST /google`, `POST /login`, `POST /refresh`, `POST /logout`, `GET /me` | public / autentificat |
| Utilizatori | `/api/v1/users` | `GET /me`, `GET /`, `PATCH /{id}`, `PATCH /me`, `DELETE /me`, `POST /organizers` | autentificat / admin |
| Evenimente publice | `/api/v1/public` | `GET /events` (filtre+paginare), `GET /events/{id}`, `.../ics`, `.../gcal`, `.../qr.png`, `.../materials`, `.../feedback-summary`, `GET /organizers` | public |
| Evenimente (CRUD) | `/api/v1/events` | `POST /`, `GET /mine`, `GET /pending`, `PATCH /{id}`, `DELETE /{id}`, `POST /{id}/submit`, `POST /{id}/approve`, `POST /{id}/reject`, `POST /{id}/cover`, sponsori, materiale | organizator / admin |
| Categorii | `/api/v1/categories` | `GET /` | public |
| Locații | `/api/v1/locations` | `GET /`, `POST /` | public / organizator |
| Înscrieri | `/api/v1/registrations` | `GET /mine`, `POST /events/{id}`, `DELETE /events/{id}`, `GET /{id}/qr.png`, `GET /events/{id}/participants`, `GET /events/{id}/export`, `POST /events/{id}/check-in` | student / organizator |
| Favorite | `/api/v1/favorites` | `GET /mine`, `GET /mine/ids`, `POST /events/{id}`, `DELETE /events/{id}` | student |
| Recomandări | `/api/v1/recommendations` | `GET /` | student |
| Feedback | `/api/v1/feedback` | `POST /`, `GET /events/{id}`, `GET /events/{id}/mine`, `GET /events/{id}/summary` | public / autentificat |
| Cereri organizator | `/api/v1/organizer-requests` | `POST /`, `GET /`, `POST /{id}/approve`, `POST /{id}/reject` | public / admin |
| Statistici & rapoarte | `/api/v1/events/{id}/stats`, `/api/v1/admin/reports/{overview,monthly,organizers,pdf}` | organizator (event) / admin (rapoarte) |
| Health | `/health` | status DB | public |
