"""Application settings — everything comes from the environment, no secrets in code."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Default is a LOCAL SQLite file for zero-config runs and the pytest
    # suite. Production MUST set DATABASE_URL to the Supabase Postgres URI
    # (see .env.example). SQLite is never valid for production.
    DATABASE_URL: str = "sqlite:///./data/apnadairy.db"
    JWT_SECRET: str = "dev-only-secret-change-me"
    JWT_ACCESS_MINUTES: int = 30
    JWT_REFRESH_DAYS: int = 7
    ADMIN_EMAIL: str = ""
    ADMIN_PASSWORD: str = ""
    SUPERADMIN_EMAIL: str = ""
    SUPERADMIN_PASSWORD: str = ""
    SUPPORT_NAME: str = "ApnaDairy Technical Support"
    SUPPORT_EMAIL: str = ""
    SUPPORT_PHONE: str = ""
    GROQ_API_KEY: str = ""
    DEMO_MODE: bool = True
    # Local demonstration automation. It writes explicitly simulated IoT
    # readings and demonstration-only AI predictions to the normal database.
    # Keep disabled in production unless a real scheduler/telemetry source is
    # deliberately configured.
    IOT_AI_AUTOMATION_ENABLED: bool = True
    IOT_AI_AUTOMATION_INTERVAL_SECONDS: int = 300
    IOT_AI_READING_INTERVAL_SECONDS: int = 300
    IOT_AI_PREDICTION_INTERVAL_SECONDS: int = 900
    IOT_AI_MAX_BATCHES_PER_CYCLE: int = 25
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173"

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
