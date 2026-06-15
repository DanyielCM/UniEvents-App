# UniEvents USV

Platform for managing university events at Universitatea "Stefan cel Mare" din Suceava.

## Quickstart

```bash
# 1. Configure env files
cp backend/.env.example backend/.env      # fill in JWT secret, Google OAuth, admin seed
cp frontend/.env.example frontend/.env    # fill in VITE_GOOGLE_CLIENT_ID

# 2. Start everything
docker compose up --build

# 3. Seed initial data (first run only)
docker compose exec backend python -m app.scripts.seed_admin
docker compose exec backend python -m app.scripts.seed_categories
```

App: http://localhost:3000 · API docs: http://localhost:8000/docs · Mailhog: http://localhost:8025

Full setup, config and troubleshooting: see [DOCUMENTATIE.md](./DOCUMENTATIE.md).

## Architecture

UniEvents/
├── docker-compose.yml          # 4 services: backend, frontend, db, mailhog
├── backend/                    # FastAPI + SQLAlchemy + Alembic
│   ├── Dockerfile
│   ├── entrypoint.sh           # applies migrations, then starts server
│   ├── requirements.txt
│   ├── alembic/                # Database migrations (auto-applied on boot)
│   └── app/
│       ├── main.py             # FastAPI app entrypoint
│       ├── config.py           # pydantic-settings config
│       ├── database.py         # async engine / session
│       ├── email_service.py    # async SMTP (aiosmtplib)
│       ├── auth/               # JWT + Google OAuth verification
│       ├── crud/               # Database operations
│       ├── models/             # SQLAlchemy models
│       ├── routes/             # API endpoints (/api/v1/...)
│       ├── schemas/            # Pydantic schemas
│       ├── services/           # QR, .ics, PDF reports, reminders, sentiment, Google Calendar, files
│       └── scripts/            # Seed scripts (admin, categories, organizer, events)
└── frontend/                   # React + Vite + TailwindCSS
├── Dockerfile
├── vite.config.js          # proxies /api/v1 to backend
└── src/
├── main.jsx
├── App.jsx
├── components/         # Navbar, ProtectedRoute, GoogleSignInButton, events/, feedback/, forms/
├── contexts/           # AuthContext
├── hooks/              # useAuth
├── pages/              # Landing, Login, Dashboard, Events, EventDetail, EventEditor,
│                       # Organizer* (events, participants, materials, stats),
│                       # Admin* (validation, requests, reports, users), My* (favorites, registrations)
└── services/           # API layer (api, auth, events, favorites, feedback, registrations, users)

## Services (Docker Compose)

- **backend** :8000 — FastAPI REST API under `/api/v1`
- **frontend** :3000 — React SPA (Vite dev server, proxies API calls)
- **db** :5432 — PostgreSQL 17 (not exposed outside the internal network)
- **mailhog** :1025 (SMTP) / :8025 (web UI) — catches dev emails

## Auth Flows

- **Students**: Google OAuth on the landing page. Only `@student.usv.ro` emails accepted.
- **Organizers**: Account created by admin directly, or via a public request form approved by admin. Login via `/login` with email+password.
- **Admin**: Seeded via `seed_admin` script (not a migration). Login via `/login` with email+password.
