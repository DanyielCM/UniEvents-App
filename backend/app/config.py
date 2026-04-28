from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    DATABASE_URL: str

    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    ALLOWED_EMAIL_DOMAIN: str = "student.usv.ro"

    ADMIN_SEED_EMAIL: str = ""
    ADMIN_SEED_PASSWORD: str = ""

    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = ""
    SMTP_FROM_NAME: str = "UniEvents USV"
    SMTP_USE_TLS: bool = True

    FRONTEND_BASE_URL: str = "http://localhost:3000"
    CORS_ORIGINS: str = "http://localhost:3000"
    BACKEND_BASE_URL: str = "http://localhost:8000"

    UPLOAD_DIR: str = "/app/uploads"
    UPLOAD_MAX_SIZE_MB: int = 10
    QR_CODE_BASE_URL: str = "http://localhost:3000/events"


settings = Settings()
