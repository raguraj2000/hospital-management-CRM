"""Application configuration via Pydantic Settings."""

from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    APP_NAME: str = "HMS-Backend"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    PORT: int = 8000
    HOST: str = "0.0.0.0"

    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://hms_admin:Admin%40123@127.0.0.1:5432/hospital_management_system"
    DATABASE_POOL_SIZE: int = 20
    DATABASE_MAX_OVERFLOW: int = 10
    DATABASE_POOL_TIMEOUT: int = 30

    # Sessions & Cookies
    SECRET_KEY: str = "change-this-in-production-to-a-secure-random-64-character-string"
    SESSION_COOKIE_NAME: str = "sid"
    SESSION_MAX_AGE_SECONDS: int = 604800  # 7 days
    COOKIE_SECURE: bool = False
    COOKIE_SAMESITE: str = "lax"

    DEFAULT_PAGE_SIZE: int = 20
    MAX_PAGE_SIZE: int = 100


settings = Settings()

