from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, computed_field

from app.config import settings


class MaterialResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    filename: str = Field(exclude=True)
    original_name: str
    mime_type: str
    size_bytes: int
    uploaded_at: datetime

    @computed_field
    @property
    def download_url(self) -> str:
        return f"{settings.BACKEND_BASE_URL}/uploads/{self.filename}"
