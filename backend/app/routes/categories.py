from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.category import get_categories
from app.database import get_db
from app.schemas.event import CategoryResponse

router = APIRouter(prefix="/api/v1/categories", tags=["categories"])

DB = Annotated[AsyncSession, Depends(get_db)]


@router.get("/", response_model=list[CategoryResponse])
async def list_categories(db: DB):
    return await get_categories(db)
