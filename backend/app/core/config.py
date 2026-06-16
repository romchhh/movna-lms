from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
        populate_by_name=True,
    )

    APP_NAME: str = "MOVNA LMS"
    DEBUG: bool = True

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./movna.db"

    # JWT
    SECRET_KEY: str = "CHANGE_ME_IN_PRODUCTION_USE_RANDOM_32_BYTES"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24        # 1 day
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # CORS / Frontend
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    FRONTEND_URL: str = "http://localhost:3000"

    # Optimate CRM
    OPTIMATE_PUBLIC_BASE_URL: str = Field(
        default="https://api.optimate.online",
        validation_alias="PUBLIC_BASE_URL",
    )
    OPTIMATE_BASE_URL: str = Field(default="", validation_alias="BASE_URL")
    OPTIMATE_PUBLIC_API_KEY: str = ""
    OPTIMATE_TOKEN: str = ""
    OPTIMATE_VERIFY_ON_LOGIN: bool = True
    OPTIMATE_CACHE_BALANCES_TTL: int = 600       # 10 хв — баланси рідко змінюються
    OPTIMATE_CACHE_TRANSACTIONS_TTL: int = 600   # 10 хв
    OPTIMATE_CACHE_EVENTS_TTL: int = 300         # 5 хв — розклад актуальніший
    OPTIMATE_CACHE_TEACHER_SCHEDULE_TTL: int = 600
    OPTIMATE_CACHE_TEACHER_EVENTS_TTL: int = 300
    OPTIMATE_CACHE_ADMIN_LIST_TTL: int = 300     # 5 хв — списки admin
    OPTIMATE_CACHE_ADMIN_DETAIL_TTL: int = 600   # 10 хв — деталі admin
    OPTIMATE_CACHE_ADMIN_EVENTS_TTL: int = 300   # 5 хв — події admin
    OPTIMATE_CACHE_ADMIN_OVERVIEW_TTL: int = 180 # 3 хв — дашборд admin

    # Legacy aliases (still read from .env if present)
    OPTIMEIT_BASE_URL: str = ""
    OPTIMEIT_API_KEY: str = ""

    # Google OAuth
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/auth/google/callback"

    # Google Sheets
    GOOGLE_SHEETS_CREDENTIALS_JSON: str = ""
    GOOGLE_SHEETS_CREDENTIALS_PATH: str = ""
    GOOGLE_SHEETS_SPREADSHEET_ID: str = "1PG1qn3J3xDwtALK57aQ7dR_c-9OOOoGgsYhY286_R1o"
    SHEETS_SYNC_INTERVAL_MINUTES: int = 15

    # File storage (local for dev, S3/R2 for prod)
    STORAGE_BACKEND: str = "local"
    LOCAL_UPLOAD_DIR: str = "./uploads"
    S3_BUCKET: str = ""
    S3_ENDPOINT_URL: str = ""
    S3_ACCESS_KEY: str = ""
    S3_SECRET_KEY: str = ""

    @property
    def optimate_public_base_url(self) -> str:
        return self.OPTIMATE_PUBLIC_BASE_URL or "https://api.optimate.online"

    @property
    def optimate_tenant_url(self) -> str:
        return self.OPTIMATE_BASE_URL or self.OPTIMEIT_BASE_URL

    @property
    def optimate_api_key(self) -> str:
        return self.OPTIMATE_PUBLIC_API_KEY or self.OPTIMATE_TOKEN or self.OPTIMEIT_API_KEY

    @property
    def google_oauth_configured(self) -> bool:
        return bool(self.GOOGLE_CLIENT_ID and self.GOOGLE_CLIENT_SECRET)


settings = Settings()
