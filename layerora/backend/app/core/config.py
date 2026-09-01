from pydantic_settings import BaseSettings
from pydantic import Field, SecretStr, validator
from functools import lru_cache
from pathlib import Path
class Settings(BaseSettings):
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    BACKEND_URL: str = "http://127.0.0.1:8000"
    # App
    APP_NAME: str = "Layerora"
    DEBUG: bool = False
    ENVIRONMENT: str = "production"

    # Database
    DATABASE_URL: SecretStr = Field(..., alias="DATABASE_URL")
    TEST_DATABASE_URL: SecretStr | None = None

    # Redis
    REDIS_URL: SecretStr = Field(..., alias="REDIS_URL")

    # Object Storage
    S3_ACCESS_KEY: SecretStr
    S3_SECRET_KEY: SecretStr
    S3_BUCKET: str
    S3_REGION: str = "us-east-1"
    S3_ENDPOINT_URL: str | None = None   # for R2, MinIO

    # AI Providers
    OPENAI_API_KEY: SecretStr | None = None
    GOOGLE_VISION_API_KEY: SecretStr | None = None
    REPLICATE_API_TOKEN: SecretStr | None = None

    # Security
    JWT_SECRET: SecretStr
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    AUTH_COOKIE_SECURE: bool = True

    # Rate Limiting
    RATE_LIMIT_REQUESTS: int = 100
    RATE_LIMIT_PERIOD: int = 60  # seconds

    # Business
    GUEST_FREE_IMAGE_LIMIT: int = 1
    DAILY_FREE_EXTRACTIONS: int = 2
    DAILY_FREE_ASK_AI: int = 0   # not yet enabled
    MAX_DESIGNS_FREE: int = 10
    MAX_LAYERS_PER_DESIGN: int = 50
    UPLOAD_MAX_SIZE_MB: int = 5
    UPLOAD_MAX_WIDTH: int = 2048
    UPLOAD_MAX_HEIGHT: int = 2048
    AUTOSAVE_DEBOUNCE_MS: int = 1000

    # Celery
    CELERY_BROKER_URL: SecretStr = Field(..., alias="REDIS_URL")  # reuse Redis
    CELERY_RESULT_BACKEND: SecretStr = Field(..., alias="REDIS_URL")

    # Payments (Razorpay)
    RAZORPAY_KEY_ID: SecretStr | None = None
    RAZORPAY_KEY_SECRET: SecretStr | None = None
    RAZORPAY_WEBHOOK_SECRET: SecretStr | None = None

    # Feature Flags
    ENABLE_ASK_AI: bool = False
    AI_PROVIDER: str = "mock"  # options: openai, google, replicate, mock
    @validator("DATABASE_URL", pre=True)
    def validate_db_url(cls, v):
        if v and v.startswith("postgres://"):
            # Force asyncpg scheme
            return v.replace("postgres://", "postgresql+asyncpg://")
        return v

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"

@lru_cache()
def get_settings() -> Settings:
    return Settings()