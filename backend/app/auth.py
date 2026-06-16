import random
from datetime import datetime, timedelta
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from app.config import settings
from app.database import DBService

security = HTTPBearer()

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    phone = data.get("sub", "")
    user_id = data.get("user_id", "")
    
    to_encode.update({
        "exp": expire,
        "sub": phone,
        "phone": phone,
        "user_id": user_id
    })
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        phone: str = payload.get("sub")
        if phone is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = DBService.get_user(phone)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user

def generate_otp() -> str:
    return "".join(random.choices("0123456789", k=6))

def send_sms(phone: str, message_text: str) -> bool:
    if settings.SMS_PROVIDER == "twilio" and settings.TWILIO_ACCOUNT_SID:
        try:
            from twilio.rest import Client
            client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
            client.messages.create(
                body=message_text,
                from_=settings.TWILIO_FROM_NUMBER or settings.TWILIO_PHONE_NUMBER,
                to=phone
            )
            print(f"Sent Twilio SMS to {phone}")
            return True
        except Exception as e:
            print(f"Twilio SMS sending failed: {e}")
            
    print(f"[SMS Bypass] Bypassed backend Twilio dispatch for {phone} (native device handles composition)")
    return True

def send_sms_otp(phone: str, otp: str) -> bool:
    message_text = f"[FEMME] Your verification OTP is: {otp}. Valid for 10 minutes."
    if settings.SMS_PROVIDER != "twilio":
        print("==================================================")
        print(f"🔑 [SIMULATED OTP SMS] TO {phone}: {message_text}")
        print("==================================================")
        return True
    return send_sms(phone, message_text)

def send_twilio_verify_otp(phone: str) -> bool:
    if settings.SMS_PROVIDER == "twilio" and settings.TWILIO_ACCOUNT_SID and settings.TWILIO_VERIFY_SERVICE_SID:
        try:
            from twilio.rest import Client
            client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
            client.verify.v2.services(settings.TWILIO_VERIFY_SERVICE_SID) \
                .verifications \
                .create(to=phone, channel='sms')
            print(f"[TWILIO VERIFY] Dispatched SMS verification to {phone}")
            return True
        except Exception as e:
            print(f"[TWILIO VERIFY] Failed to send via Twilio API: {e}. Falling back to simulation.")
    return False

def check_twilio_verify_otp(phone: str, code: str) -> bool:
    if settings.SMS_PROVIDER == "twilio" and settings.TWILIO_ACCOUNT_SID and settings.TWILIO_VERIFY_SERVICE_SID:
        try:
            from twilio.rest import Client
            client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
            check = client.verify.v2.services(settings.TWILIO_VERIFY_SERVICE_SID) \
                .verification_checks \
                .create(to=phone, code=code)
            return check.status == "approved"
        except Exception as e:
            print(f"[TWILIO VERIFY] Verification failed: {e}. Checking local database.")
    return False
