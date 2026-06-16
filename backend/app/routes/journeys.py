from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Dict, Optional, Any
from datetime import datetime
from app.auth import get_current_user, send_sms
from app.database import DBService
from app.utils.routing import fetch_route, check_route_deviation, score_safety, geocode_address
from app.utils.phone_validation import format_to_e164

router = APIRouter(prefix="/journeys", tags=["Journeys"])

class JourneyCreate(BaseModel):
    cab_number: str
    provider: str  # uber, ola, rapido, other
    pickup_address: str
    pickup_lat: Optional[float] = None
    pickup_lng: Optional[float] = None
    dest_address: str
    dest_lat: Optional[float] = None
    dest_lng: Optional[float] = None

class TelemetryUpdate(BaseModel):
    latitude: float
    longitude: float
    speed: float  # in m/s
    timestamp: str
    motion_anomaly: bool = False
    audio_anomaly: bool = False
    raw_audio_features: Optional[Dict[str, Any]] = None
    speed_history: Optional[List[float]] = None

@router.post("/start", response_model=Dict)
async def start_journey(journey_in: JourneyCreate, current_user: Dict = Depends(get_current_user)):
    user_phone = current_user["phone"]
    
    # Resolve geocoding coordinates internally
    p_lat = journey_in.pickup_lat
    p_lng = journey_in.pickup_lng
    if p_lat is None or p_lng is None:
        p_lat, p_lng = geocode_address(journey_in.pickup_address)

    d_lat = journey_in.dest_lat
    d_lng = journey_in.dest_lng
    if d_lat is None or d_lng is None:
        d_lat, d_lng = geocode_address(journey_in.dest_address)

    # Check if there is already an active journey
    active = DBService.get_active_journey(user_phone)
    if active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A journey is already active. Complete or cancel it first."
        )

    # Fetch expected route coordinates
    expected_route = fetch_route(p_lat, p_lng, d_lat, d_lng)

    journey_data = journey_in.dict()
    journey_data["pickup_lat"] = p_lat
    journey_data["pickup_lng"] = p_lng
    journey_data["dest_lat"] = d_lat
    journey_data["dest_lng"] = d_lng
    journey_data["expected_route"] = expected_route
    
    new_journey = DBService.create_journey(user_phone, journey_data)
    
    # Send Start Notification to Trusted Contacts (Real SMS if Twilio is enabled)
    contacts = DBService.get_contacts(user_phone)
    for c in contacts:
        msg = f"[FEMME Safeguard] {current_user.get('name', 'User')} has started a cab journey in {new_journey['provider'].upper()} (Plate: {new_journey['cab_number']}) from {new_journey['pickup_address']} to {new_journey['dest_address']}. Track live location here: http://femme-safety.app/track/{new_journey['id']}"
        raw_phone = c.get("phone", "")
        formatted_phone = format_to_e164(raw_phone) or raw_phone
        send_sms(formatted_phone, msg)

    return new_journey

@router.get("/active", response_model=Optional[Dict])
async def get_active_journey(current_user: Dict = Depends(get_current_user)):
    return DBService.get_active_journey(current_user["phone"])

@router.post("/active/telemetry", response_model=Dict)
async def update_telemetry(update: TelemetryUpdate, current_user: Dict = Depends(get_current_user)):
    user_phone = current_user["phone"]
    journey = DBService.get_active_journey(user_phone)
    if not journey:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active journey found."
        )

    # 1. Check Route Deviation
    expected_route = journey.get("expected_route", [])
    is_deviated, deviation_dist = check_route_deviation(update.latitude, update.longitude, expected_route)

    # 2. Save Evidence Capsule snapshot
    capsule_data = {
        "journey_id": journey["id"],
        "user_phone": user_phone,
        "timestamp": update.timestamp,
        "latitude": update.latitude,
        "longitude": update.longitude,
        "speed": update.speed,
        "speed_history": update.speed_history or [],
        "motion_anomaly": update.motion_anomaly,
        "audio_anomaly": update.audio_anomaly,
        "route_deviation": is_deviated,
        "raw_audio_features": update.raw_audio_features or {},
        "locked": 1 if journey["status"] == "emergency" else 0
    }
    
    capsule = DBService.create_capsule(capsule_data)

    # 3. Update Current Coordinates on Journey
    updates = {
        "current_lat": update.latitude,
        "current_lng": update.longitude
    }
    DBService.update_journey(journey["id"], updates)

    # Return assessment to frontend
    return {
        "journey_status": journey["status"],
        "route_deviation": is_deviated,
        "deviation_meters": deviation_dist,
        "motion_anomaly": update.motion_anomaly,
        "audio_anomaly": update.audio_anomaly,
        "trigger_check": is_deviated or update.motion_anomaly or update.audio_anomaly,
        "capsule_hash": capsule["integrity_hash"]
    }

@router.post("/active/complete", response_model=Dict)
async def complete_journey(current_user: Dict = Depends(get_current_user)):
    user_phone = current_user["phone"]
    journey = DBService.get_active_journey(user_phone)
    if not journey:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active journey found."
        )

    updates = {
        "status": "completed",
        "end_time": datetime.utcnow().isoformat(),
        "safe_arrival_notified": 1
    }
    updated_journey = DBService.update_journey(journey["id"], updates)

    # Notify contacts of safe arrival (Real SMS if Twilio is enabled)
    contacts = DBService.get_contacts(user_phone)
    for c in contacts:
        msg = f"[FEMME Safeguard] {current_user.get('name', 'User')} has arrived safely at {journey['dest_address']}. Monitoring completed."
        raw_phone = c.get("phone", "")
        formatted_phone = format_to_e164(raw_phone) or raw_phone
        send_sms(formatted_phone, msg)

    return updated_journey

@router.post("/active/cancel", response_model=Dict)
async def cancel_journey(current_user: Dict = Depends(get_current_user)):
    user_phone = current_user["phone"]
    journey = DBService.get_active_journey(user_phone)
    if not journey:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active journey found."
        )

    updates = {
        "status": "cancelled",
        "end_time": datetime.utcnow().isoformat()
    }
    return DBService.update_journey(journey["id"], updates)

@router.post("/active/sos", response_model=Dict)
async def trigger_sos(current_user: Dict = Depends(get_current_user)):
    print("SOS Triggered")
    user_phone = current_user["phone"]
    journey = DBService.get_active_journey(user_phone)
    
    # If no active journey, create a quick ad-hoc journey to log evidence
    if not journey:
        # Quick fallback
        journey = DBService.create_journey(user_phone, {
            "cab_number": "EMERGENCY_SOS",
            "provider": "adhoc",
            "pickup_address": "SOS Trigger Location",
            "pickup_lat": 12.9716, # default center if no coordinates
            "pickup_lng": 77.5946,
            "dest_address": "Emergency Station",
            "dest_lat": 12.9716,
            "dest_lng": 77.5946,
            "expected_route": []
        })

    # Update state to emergency
    updates = {"status": "emergency"}
    updated_journey = DBService.update_journey(journey["id"], updates)
    
    # Lock all evidence capsules
    DBService.lock_evidence(journey["id"])

    # Create immediate emergency evidence capsule
    lat = journey.get("current_lat") or journey.get("pickup_lat") or 12.9716
    lng = journey.get("current_lng") or journey.get("pickup_lng") or 77.5946
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

    # Notify emergency contacts immediately
    contacts = DBService.get_contacts(user_phone)
    print("Guardian Contacts Loaded")
    
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
        f"Journey:\n"
        f"{origin} → {destination}\n\n"
        f"Cab:\n"
        f"{cab_number}\n\n"
        f"Time:\n"
        f"{timestamp_str}\n\n"
        f"Please contact immediately."
    )

    print("Preparing SMS")
    
    sms_sent = False
    sms_errors = []

    for c in contacts:
        raw_phone = c.get("phone", "")
        formatted_phone = format_to_e164(raw_phone)
        if not formatted_phone:
            invalid_msg = f"Invalid phone number detected: {raw_phone}"
            print(invalid_msg)
            sms_errors.append(f"Invalid phone number for {c['name']}")
            continue

        print("Sending SMS")
        from app.config import settings
        if settings.SMS_PROVIDER == "twilio" and settings.TWILIO_ACCOUNT_SID:
            try:
                from twilio.rest import Client
                client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
                
                client.messages.create(
                    body=alert_message,
                    from_=settings.TWILIO_FROM_NUMBER,
                    to=formatted_phone
                )
                print("SMS Sent Successfully")
                sms_sent = True
            except Exception as e:
                print("SMS Failed")
                sms_errors.append(str(e))
        else:
            # Simulation Mode
            print("SMS Sent Successfully")
            sms_sent = True
            print("==================================================")
            print(f"🚨 [SIMULATED SMS] ALERT DISPATCHED TO {c['name']} ({formatted_phone}):")
            print(alert_message)
            print("==================================================")

    # Log overall status
    if len(contacts) == 0:
        sms_status = "SMS Failed: No trusted contacts saved."
        print(sms_status)
    elif sms_errors and not sms_sent:
        sms_status = f"SMS Failed: {'; '.join(sms_errors)}"
        print(sms_status)
    else:
        sms_status = "SMS Sent"
        print(sms_status)

    # Return structure matching expected journey
    return {
        "id": updated_journey["id"],
        "status": updated_journey["status"],
        "sms_sent": sms_sent,
        "sms_status": sms_status,
        "contacts_notified": len(contacts)
    }

@router.post("/score", response_model=Dict)
async def check_route_safety(route_coords: List[List[float]], current_user: Dict = Depends(get_current_user)):
    safe_zones = DBService.get_safe_zones()
    unsafe_zones = DBService.get_unsafe_zones()
    now_hour = datetime.now().hour
    
    # Convert route_coords back to list of tuples
    path = [(pt[0], pt[1]) for pt in route_coords]
    return score_safety(path, safe_zones, unsafe_zones, now_hour)

@router.get("/history", response_model=List[Dict])
async def get_history(current_user: Dict = Depends(get_current_user)):
    return DBService.get_user_journeys(current_user["phone"])
