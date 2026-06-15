import os
import uvicorn
from fastapi import FastAPI, Depends, HTTPException, status, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List
from datetime import datetime, timedelta

from app.config import settings
from app.database import init_sqlite_db, DBService
from app.auth import get_current_user, create_access_token, generate_otp, send_sms_otp
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

# Authentication Request models
class PhoneAuthRequest(BaseModel):
    phone: str

class OTPVerifyRequest(BaseModel):
    phone: str
    otp: str
    name: Optional[str] = None

# JWT & OTP Authentication Routes
@app.post(f"{settings.API_V1_STR}/auth/request-otp", response_model=Dict)
async def request_otp(payload: PhoneAuthRequest):
    phone = payload.phone.strip()
    if not phone:
        raise HTTPException(status_code=400, detail="Phone number is required")
        
    otp = generate_otp()
    expires_at = datetime.utcnow() + timedelta(minutes=10)
    
    DBService.create_otp(phone, otp, expires_at)
    send_sms_otp(phone, otp)
    
    return {
        "status": "success",
        "message": f"Verification code sent successfully to {phone} (Simulated in terminal)."
    }

@app.post(f"{settings.API_V1_STR}/auth/verify-otp", response_model=Dict)
async def verify_otp(payload: OTPVerifyRequest):
    phone = payload.phone.strip()
    otp = payload.otp.strip()
    
    # Bypass logic for easy hackathon demo (e.g. 123456 or 999999 always matches)
    is_valid = False
    if otp in ["123456", "999999", "000000"] or DBService.verify_otp(phone, otp):
        is_valid = True
        
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP verification code."
        )
        
    # Check if user exists, else create
    user = DBService.get_user(phone)
    if not user:
        user = DBService.create_user(phone, name=payload.name or "Femme Traveler")
        
    # Generate access token
    access_token = create_access_token(data={"sub": phone})
    
    return {
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
