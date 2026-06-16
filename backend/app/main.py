import os
import uvicorn
from fastapi import FastAPI, Depends, HTTPException, status, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List, Optional
from datetime import datetime, timedelta

from app.config import settings
from app.database import init_sqlite_db, DBService
from app.auth import get_current_user, create_access_token, generate_otp, send_sms_otp, send_twilio_verify_otp, check_twilio_verify_otp
from app.utils.phone_validation import format_to_e164
from app.routes import journeys, contacts, evidence, reports, simulation

# Initialize local SQLite DB tables
init_sqlite_db()

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="FEMME: She Travels. We Guard. AI-powered Invisible Travel Guardian.",
    version="1.0.0"
)

# Set up CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For local development and easy hackathon connectivity
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
@app.get(f"{settings.API_V1_STR}/health")
async def health_check():
    return {"status": "healthy", "message": "FEMME Passive Safety Backend is reachable"}

# Authentication Request models
class PhoneAuthRequest(BaseModel):
    phone: str

class OTPVerifyRequest(BaseModel):
    phone: str
    otp: Optional[str] = None
    code: Optional[str] = None
    name: Optional[str] = None

# JWT & OTP Authentication Routes
@app.post(f"{settings.API_V1_STR}/auth/send-otp", response_model=Dict)
async def send_otp(payload: PhoneAuthRequest):
    phone = payload.phone.strip()
    if not phone:
        raise HTTPException(status_code=400, detail="Phone number is required")
        
    print(f"[OTP] Sending OTP request to: {phone}")
    sent_via_twilio = send_twilio_verify_otp(phone)
    
    # Generate local DB OTP anyway for simulation/fallback compatibility
    otp = generate_otp()
    expires_at = datetime.utcnow() + timedelta(minutes=10)
    DBService.create_otp(phone, otp, expires_at)
    
    if not sent_via_twilio:
        # Fallback to simulated terminal SMS
        send_sms_otp(phone, otp)
        msg = f"OTP code {otp} sent successfully to {phone} (Simulated in terminal)."
    else:
        msg = "OTP successfully dispatched via Twilio Verify API."
        
    return {
        "success": True,
        "status": "success",
        "message": msg
    }

@app.post(f"{settings.API_V1_STR}/auth/request-otp", response_model=Dict)
async def request_otp(payload: PhoneAuthRequest):
    # Alias mapping for backwards compatibility
    return await send_otp(payload)

@app.post(f"{settings.API_V1_STR}/auth/verify-otp", response_model=Dict)
async def verify_otp(payload: OTPVerifyRequest):
    phone = payload.phone.strip()
    
    # Support both code and otp parameters from request payload
    verify_code = payload.code.strip() if payload.code else (payload.otp.strip() if payload.otp else "")
    
    if not verify_code:
        raise HTTPException(status_code=400, detail="OTP/Verification code is required")
        
    is_valid = False
    
    print(f"[OTP] Verifying code {verify_code} for phone {phone}")
    
    # 1. Try checking with Twilio Verify first
    if check_twilio_verify_otp(phone, verify_code):
        is_valid = True
    # 2. Bypass rules for easy hackathon demo (e.g. 123456 or 999999) or local database check
    elif verify_code in ["123456", "999999", "000000"] or DBService.verify_otp(phone, verify_code):
        is_valid = True
        
    if not is_valid:
        return {
            "success": False,
            "message": "Invalid OTP"
        }
        
    # Check if user exists, else create
    user = DBService.get_user(phone)
    if not user:
        user = DBService.create_user(phone, name=payload.name or "Femme Traveler")
        
    # Generate access token containing user_id and phone in its payload
    access_token = create_access_token(data={
        "sub": phone,
        "user_id": user.get("id", ""),
        "phone": phone
    })
    
    return {
        "success": True,
        "token": access_token,
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@app.get(f"{settings.API_V1_STR}/auth/me", response_model=Dict)
async def get_me(current_user: Dict = Depends(get_current_user)):
    return current_user

@app.put(f"{settings.API_V1_STR}/auth/profile", response_model=Dict)
async def update_profile(profile_data: Dict, current_user: Dict = Depends(get_current_user)):
    return DBService.update_user_profile(current_user["phone"], profile_data)

@app.put(f"{settings.API_V1_STR}/auth/settings", response_model=Dict)
async def update_settings(settings_data: Dict, current_user: Dict = Depends(get_current_user)):
    return DBService.update_user_settings(current_user["phone"], settings_data)


@app.post(f"{settings.API_V1_STR}/sos/trigger", response_model=Dict)
async def sos_trigger(current_user: Dict = Depends(get_current_user)):
    print("SOS Triggered")
    user_phone = current_user["phone"]
    
    # 1. Retrieve active journey. If none, create an ad-hoc emergency journey
    journey = DBService.get_active_journey(user_phone)
    if not journey:
        journey = DBService.create_journey(user_phone, {
            "cab_number": "EMERGENCY_SOS",
            "provider": "adhoc",
            "pickup_address": "SOS Quick Trigger Point",
            "pickup_lat": 12.9716,
            "pickup_lng": 77.5946,
            "dest_address": "Emergency Safehouse",
            "dest_lat": 12.9716,
            "dest_lng": 77.5946,
            "expected_route": []
        })

    # 2. Retrieve latest GPS location
    lat = journey.get("current_lat") or journey.get("pickup_lat") or 12.9716
    lng = journey.get("current_lng") or journey.get("pickup_lng") or 77.5946

    # 3. Retrieve trusted contacts
    contacts = DBService.get_contacts(user_phone)
    print("Guardian Contacts Loaded")

    # 4. Create emergency record & 5. Lock journey evidence
    updates = {"status": "emergency"}
    updated_journey = DBService.update_journey(journey["id"], updates)
    DBService.lock_evidence(journey["id"])

    # Create immediate emergency evidence capsule
    DBService.create_capsule({
        "journey_id": journey["id"],
        "user_phone": user_phone,
        "timestamp": datetime.utcnow().isoformat(),
        "latitude": lat,
        "longitude": lng,
        "speed": 0.0,
        "speed_history": [],
        "motion_anomaly": True,
        "audio_anomaly": True,
        "route_deviation": True,
        "raw_audio_features": {"sos_trigger": True},
        "locked": 1
    })

    # 6. Start emergency tracking (handled via ws channel logic and emergency state updates)
    
    # 8. Generate tracking link
    tracking_link = f"http://femme-safety.app/track/{journey['id']}"

    # 7. Send emergency alerts (formatted text output matching user's template exactly)
    timestamp_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
    origin = journey.get("pickup_address", "Unknown Origin")
    destination = journey.get("dest_address", "Unknown Destination")
    cab_number = journey.get("cab_number", "Unknown Cab")
    user_name = current_user.get("name", "User")
    
    alert_message = (
        f"🚨 FEMME EMERGENCY ALERT\n\n"
        f"User: {user_name}\n\n"
        f"Location:\n"
        f"https://maps.google.com/?q={lat},{lng}\n\n"
        f"Cab:\n"
        f"{cab_number}\n\n"
        f"Timestamp:\n"
        f"{timestamp_str}\n\n"
        f"Possible emergency detected."
    )

    print("Initializing Notification Provider")
    from app.utils.notification_providers import get_configured_provider
    provider = get_configured_provider()
    
    sms_sent = False
    call_initiated = False
    sms_status = "Bypassed"

    # Send multi-channel alerts to emergency contacts using NotificationProvider abstraction
    for c in contacts:
        raw_phone = c.get("phone", "")
        formatted_phone = format_to_e164(raw_phone) or raw_phone
        
        # Build text-to-speech string
        speech_text = f"Emergency alert from FEMME. {user_name} may be in danger. Open the location link sent by SMS immediately."
        
        sms_delivery = 'failed'
        call_delivery = 'failed'
        
        if provider:
            # Dispatch real SMS
            sms_ok = provider.send_sms(formatted_phone, alert_message)
            if sms_ok:
                sms_delivery = 'delivered'
                sms_sent = True
            
            # Dispatch real Voice Call
            call_ok = provider.make_voice_call(formatted_phone, speech_text)
            if call_ok:
                call_delivery = 'connected'
                call_initiated = True
        else:
            print(f"[SOS] Warning: No production NotificationProvider configured for {c['name']} ({formatted_phone})")

        # Save actual statuses in SQLite DB
        DBService.create_emergency_alert(
            journey_id=journey["id"],
            contact_name=c["name"],
            contact_phone=formatted_phone,
            sms_status=sms_delivery,
            call_status=call_delivery
        )

    # Log overall status
    if len(contacts) == 0:
        sms_status = "SMS Failed: No trusted contacts saved."
        print(sms_status)
    elif provider:
        sms_status = "SMS Dispatched via active NotificationProvider"
        print(sms_status)
    else:
        sms_status = "No provider keys set. Local simulation bypass active."
        print(sms_status)

    # 9. Create FIR draft entry (pre-compiles ReportLab PDF template)
    try:
        from app.utils.pdf_generator import generate_fir_pdf
        pdf_filename = f"FIR_Report_{journey['id']}.pdf"
        pdf_dir = "./temp_reports"
        os.makedirs(pdf_dir, exist_ok=True)
        pdf_path = os.path.join(pdf_dir, pdf_filename)
        
        capsules = DBService.get_capsules(journey["id"])
        generate_fir_pdf(updated_journey, capsules, contacts, pdf_path)
    except Exception as e:
        print(f"FIR Draft compilation failed: {e}")

    return {
        "success": True,
        "sms_sent": sms_sent,
        "sms_status": sms_status,
        "call_initiated": call_initiated,
        "tracking_link": tracking_link,
        "contacts_notified": len(contacts)
    }


@app.post("/debug/test-sms", response_model=Dict)
async def test_sms(recipient_phone: str):
    print("Test SMS Triggered")
    
    if not settings.TWILIO_ACCOUNT_SID or not settings.TWILIO_AUTH_TOKEN or not settings.TWILIO_FROM_NUMBER:
        raise HTTPException(
            status_code=500,
            detail="Twilio configuration is missing required variables."
        )
        
    formatted_phone = format_to_e164(recipient_phone)
    if not formatted_phone:
        print(f"Invalid phone number: {recipient_phone}")
        return {
            "twilio_sid": None,
            "recipient": recipient_phone,
            "delivery_status": "SMS Failed: Invalid Phone Number",
            "Twilio SID": None,
            "Recipient": recipient_phone,
            "Delivery Status": "SMS Failed: Invalid Phone Number"
        }
        
    try:
        from twilio.rest import Client
        client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        
        test_message = "🚨 FEMME Test Emergency Alert SMS. If you receive this, end-to-end Twilio delivery is verified."
        
        message = client.messages.create(
            body=test_message,
            from_=settings.TWILIO_FROM_NUMBER,
            to=formatted_phone
        )
        
        print("SMS Sent Successfully")
        return {
            "twilio_sid": message.sid,
            "recipient": formatted_phone,
            "delivery_status": "SMS Sent",
            "Twilio SID": message.sid,
            "Recipient": formatted_phone,
            "Delivery Status": "SMS Sent"
        }
    except Exception as e:
        print("SMS Failed")
        return {
            "twilio_sid": None,
            "recipient": formatted_phone,
            "delivery_status": f"SMS Failed: {e}",
            "Twilio SID": None,
            "Recipient": formatted_phone,
            "Delivery Status": f"SMS Failed: {e}"
        }


@app.get(f"{settings.API_V1_STR}/sos/status/{{journey_id}}", response_model=List[Dict])
async def get_sos_status(journey_id: str, current_user: Dict = Depends(get_current_user)):
    journey = DBService.get_journey(journey_id)
    if not journey:
        raise HTTPException(status_code=404, detail="Journey not found")
    if journey["user_phone"] != current_user["phone"]:
        raise HTTPException(status_code=403, detail="Not authorized to inspect status")
    return DBService.get_emergency_alerts(journey_id)

@app.post(f"{settings.API_V1_STR}/sos/acknowledge/{{journey_id}}")
async def sos_acknowledge(journey_id: str, phone: Optional[str] = None):
    alerts = DBService.get_emergency_alerts(journey_id)
    updated = []
    for a in alerts:
        if not phone or a["contact_phone"] == phone:
            DBService.update_emergency_alert(a["id"], {"acknowledged": 1})
            updated.append(a["id"])
    return {"status": "success", "acknowledged_ids": updated}

# Include Feature Routers
app.include_router(journeys.router, prefix=settings.API_V1_STR)
app.include_router(contacts.router, prefix=settings.API_V1_STR)
app.include_router(evidence.router, prefix=settings.API_V1_STR)
app.include_router(reports.router, prefix=settings.API_V1_STR)
app.include_router(simulation.router, prefix=settings.API_V1_STR)


# Real-time WebSocket Location Sharing Server
class ConnectionManager:
    def __init__(self):
        # Maps journey_id -> List of WebSockets
        self.active_rooms: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, room_id: str):
        await websocket.accept()
        if room_id not in self.active_rooms:
            self.active_rooms[room_id] = []
        self.active_rooms[room_id].append(websocket)
        print(f"WebSocket client connected to journey tracking room: {room_id}")

    def disconnect(self, websocket: WebSocket, room_id: str):
        if room_id in self.active_rooms:
            if websocket in self.active_rooms[room_id]:
                self.active_rooms[room_id].remove(websocket)
                if not self.active_rooms[room_id]:
                    del self.active_rooms[room_id]
        print(f"WebSocket client disconnected from journey room: {room_id}")

    async def broadcast_to_room(self, room_id: str, message: dict):
        if room_id in self.active_rooms:
            for connection in self.active_rooms[room_id]:
                try:
                    await connection.send_json(message)
                except Exception:
                    # Connection might be dead, handled during cleanups or disconnects
                    pass

manager = ConnectionManager()

@app.websocket(f"{settings.API_V1_STR}/ws/track/{{journey_id}}")
async def websocket_tracking_endpoint(websocket: WebSocket, journey_id: str):
    await manager.connect(websocket, journey_id)
    try:
        # Keep connection open and listen for client-sent coordinates if they stream via WS
        while True:
            data = await websocket.receive_json()
            # If coordinates are sent via websocket: broadcast it to other viewers in the room!
            if "latitude" in data and "longitude" in data:
                # Add timestamp
                data["timestamp"] = datetime.utcnow().isoformat()
                await manager.broadcast_to_room(journey_id, data)
    except WebSocketDisconnect:
        manager.disconnect(websocket, journey_id)
    except Exception as e:
        print(f"WebSocket Error: {e}")
        manager.disconnect(websocket, journey_id)

# Helper function to trigger ws broadcast from HTTP telemetry calls
@app.post(f"{settings.API_V1_STR}/simulation/broadcast/{{journey_id}}")
async def trigger_ws_broadcast(journey_id: str, payload: Dict):
    """
    HTTP Hook allowing background loops to trigger WebSocket broadcasts to maps/contacts.
    """
    payload["timestamp"] = datetime.utcnow().isoformat()
    await manager.broadcast_to_room(journey_id, payload)
    return {"status": "success"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
