# UniEvents USV

Platform for managing university events at Universitatea "Stefan cel Mare" din Suceava.


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
