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
    TWILIO_VERIFY_SERVICE_SID: str = os.getenv("TWILIO_VERIFY_SERVICE_SID", "")
    TWILIO_FROM_NUMBER: str = os.getenv("TWILIO_FROM_NUMBER", os.getenv("TWILIO_PHONE_NUMBER", ""))
    JWT_SECRET: str = os.getenv("JWT_SECRET", "dev_fallback_secret_key_change_me_in_production")

    # Anomaly settings (Thresholds)
    ROUTE_DEVIATION_THRESHOLD_METERS: float = 150.0  # 150m deviation triggers check
    UNUSUAL_STOP_THRESHOLD_SECONDS: int = 120  # 2 minutes stop triggers check
    AUDIO_DISTRESS_THRESHOLD_DB: float = 80.0  # Scream threshold (db equivalent)
    NO_RESPONSE_TIMEOUT_SECONDS: int = 60  # Escalate if no response to Are You Okay after 60s

    class Config:
        case_sensitive = True

settings = Settings()

# Startup validation for Twilio variables
if settings.SMS_PROVIDER == "twilio":
    missing_vars = []
    if not settings.TWILIO_ACCOUNT_SID:
        missing_vars.append("TWILIO_ACCOUNT_SID")
    if not settings.TWILIO_AUTH_TOKEN:
        missing_vars.append("TWILIO_AUTH_TOKEN")
    if not settings.TWILIO_FROM_NUMBER:
        missing_vars.append("TWILIO_FROM_NUMBER")
        
    if missing_vars:
        error_msg = f"CRITICAL ERROR: Twilio configuration missing required variables: {', '.join(missing_vars)}"
        print("==================================================")
        print(error_msg)
        print("==================================================")
        raise SystemExit(error_msg)
    else:
        print("==================================================")
        print("Twilio SID Loaded")
        try:
            from twilio.rest import Client
            Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
            print("Twilio Client Initialized")
        except Exception as e:
            raise SystemExit(f"Twilio Client Initialization failed: {e}")
        print("==================================================")
