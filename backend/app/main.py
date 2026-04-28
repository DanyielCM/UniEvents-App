import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from app.config import settings
from app.database import engine
from app.routes.auth import router as auth_router
from app.routes.categories import router as categories_router
from app.routes.events import router as events_router
from app.routes.events_public import router as events_public_router
from app.routes.feedback import router as feedback_router
from app.routes.stats import router as stats_router
from app.routes.registrations import router as registrations_router
from app.routes.locations import router as locations_router
from app.routes.organizer_requests import router as organizer_requests_router
from app.routes.users import router as users_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
    yield
    await engine.dispose()


app = FastAPI(
    title="UniEvents API",
    description="Platform for managing university events at USV.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.CORS_ORIGINS.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR, check_dir=False), name="uploads")

app.include_router(events_public_router)
app.include_router(registrations_router)
app.include_router(feedback_router)
app.include_router(stats_router)
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(organizer_requests_router)
app.include_router(events_router)
app.include_router(categories_router)
app.include_router(locations_router)


@app.get("/health", tags=["health"])
async def health_check():
    async with engine.connect() as conn:
        await conn.execute(text("SELECT 1"))
    return {"status": "healthy"}
