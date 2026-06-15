import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "FEMME"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "dev_fallback_secret_key_change_me_in_production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # SQLite Database Configuration
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./femme_local.db")
    
    # Firebase Toggle (If empty, uses local SQLite fallback)
    USE_FIREBASE: bool = os.getenv("USE_FIREBASE", "false").lower() == "true"
    FIREBASE_CREDENTIALS_PATH: str = os.getenv("FIREBASE_CREDENTIALS_PATH", "")
    FIREBASE_DATABASE_URL: str = os.getenv("FIREBASE_DATABASE_URL", "")

    # Routing APIs
    OPENROUTE_SERVICE_KEY: str = os.getenv("OPENROUTE_SERVICE_KEY", "")
    # OSRM public URL
    OSRM_ROUTING_URL: str = os.getenv("OSRM_ROUTING_URL", "https://router.project-osrm.org/route/v1/driving/")

    # Twilio/OTP configuration (Fallback simulated through DB logs)
    SMS_PROVIDER: str = os.getenv("SMS_PROVIDER", "simulated")  # 'simulated' or 'twilio'
    TWILIO_ACCOUNT_SID: str = os.getenv("TWILIO_ACCOUNT_SID", "")
    TWILIO_AUTH_TOKEN: str = os.getenv("TWILIO_AUTH_TOKEN", "")
    TWILIO_PHONE_NUMBER: str = os.getenv("TWILIO_PHONE_NUMBER", "")

    # Anomaly settings (Thresholds)
    ROUTE_DEVIATION_THRESHOLD_METERS: float = 150.0  # 150m deviation triggers check
    UNUSUAL_STOP_THRESHOLD_SECONDS: int = 120  # 2 minutes stop triggers check
    AUDIO_DISTRESS_THRESHOLD_DB: float = 80.0  # Scream threshold (db equivalent)
    NO_RESPONSE_TIMEOUT_SECONDS: int = 60  # Escalate if no response to Are You Okay after 60s

    class Config:
        case_sensitive = True

settings = Settings()
