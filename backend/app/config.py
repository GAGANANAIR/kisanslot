import os
from pathlib import Path
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = (BASE_DIR / "kisanslot.db").as_posix()

class Settings(BaseSettings):
    PROJECT_NAME: str = "KisanSlot"
    API_V1_PREFIX: str = "/api/v1"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "super-secret-kisanslot-jwt-token-key-2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{DB_PATH}")
    
    # Pluggable Notification Service Settings
    NOTIFICATION_PROVIDER: str = os.getenv("NOTIFICATION_PROVIDER", "mock")  # "mock", "twilio", "fast2sms"
    TWILIO_ACCOUNT_SID: str = os.getenv("TWILIO_ACCOUNT_SID", "")
    TWILIO_AUTH_TOKEN: str = os.getenv("TWILIO_AUTH_TOKEN", "")
    TWILIO_FROM_NUMBER: str = os.getenv("TWILIO_FROM_NUMBER", "")
    FAST2SMS_API_KEY: str = os.getenv("FAST2SMS_API_KEY", "")

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
