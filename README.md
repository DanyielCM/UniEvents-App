# UniEvents USV

Platform for managing university events at Universitatea "Stefan cel Mare" din Suceava.

Three roles: **student** (Google OAuth), **organizer** (email+password), **admin** (email+password, seeded).

## Prerequisites

- Docker and Docker Compose
- A Google Cloud project with OAuth 2.0 credentials (for student login)

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select an existing one)
3. Go to **APIs & Services > Credentials**
4. Click **Create Credentials > OAuth client ID**
5. Application type: **Web application**
6. Authorized JavaScript origins: `http://localhost:3000`
7. Authorized redirect URIs: `http://localhost:3000`
8. Click **Create** and copy the **Client ID** and **Client Secret**
9. Go to **APIs & Services > OAuth consent screen**
10. Configure the consent screen (External, add your test users)
11. Add scope: `email`, `profile`, `openid`

## Setup

1. Clone the repository:

```bash
git clone <repo-url>
cd UniEvents
```

2. Copy the environment files:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

3. Edit `backend/.env`:
   - Set `JWT_SECRET_KEY` to a random string (`python -c "import secrets; print(secrets.token_hex(32))"`)
   - Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` from the Google Cloud Console
   - Adjust `POSTGRES_*` and `DATABASE_URL` if needed

4. Edit `frontend/.env`:
   - Set `VITE_GOOGLE_CLIENT_ID` to the same Google Client ID

5. Start the application:

```bash
docker compose up --build
```

6. Access:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API docs: http://localhost:8000/docs

## Default Admin Account

After first startup, an admin account is seeded:
- Email: `admin@usv.ro`
- Password: `admin`

Change this password immediately in production.

## Architecture

```
UniEvents/
├── docker-compose.yml
├── backend/          # FastAPI + SQLAlchemy + Alembic
│   ├── app/
│   │   ├── auth/     # JWT + Google OAuth verification
│   │   ├── crud/     # Database operations
│   │   ├── models/   # SQLAlchemy models
│   │   ├── routes/   # API endpoints (/api/v1/...)
│   │   └── schemas/  # Pydantic schemas
│   └── alembic/      # Database migrations
└── frontend/         # React + Vite + TailwindCSS
    └── src/
        ├── components/  # Reusable components (ProtectedRoute)
        ├── contexts/    # React Context (AuthContext)
        ├── hooks/       # Custom hooks (useAuth)
        ├── pages/       # Page components (Landing, Login, Dashboard)
        └── services/    # API service layer
```

## Auth Flows

- **Students**: Google OAuth on the landing page. Only `@student.usv.ro` emails accepted.
- **Organizers**: Created by admin, login via `/login` with email+password.
- **Admin**: Seeded via migration, login via `/login` with email+password.
