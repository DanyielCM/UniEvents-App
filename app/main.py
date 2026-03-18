from contextlib import asynccontextmanager

from fastapi import FastAPI
from sqlalchemy import text

from app.database import engine
from app.routes.auth import router as auth_router
from app.routes.users import router as users_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await engine.dispose()


app = FastAPI(
    title="UniEvents API",
    description="Async FastAPI application with PostgreSQL, JWT authentication, and user management.",
    version="1.0.0",
    lifespan=lifespan,
)

app.include_router(auth_router)
app.include_router(users_router)


@app.get("/health", tags=["health"])
async def health_check():
    async with engine.connect() as conn:
        await conn.execute(text("SELECT 1"))
    return {"status": "healthy"}
