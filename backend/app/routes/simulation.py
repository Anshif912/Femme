import re
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Dict, Optional
from datetime import datetime
from app.auth import get_current_user
from app.database import DBService
from app.routes.journeys import start_journey, JourneyCreate

router = APIRouter(prefix="/simulation", tags=["Notification Simulator"])

class NotificationInput(BaseModel):
    text: str

# Mock coordinate mapping for simulation
COORDS = {
    "koramangala": (12.9352, 77.6245, "Koramangala 4th Block, Bengaluru"),
    "indiranagar": (12.9719, 77.6412, "Indiranagar Double Road, Bengaluru"),
    "hsr layout": (12.9141, 77.6411, "HSR Layout Sector 3, Bengaluru"),
    "bellandur": (12.9304, 77.6784, "Bellandur Ecospace, Bengaluru"),
    "hal museum": (12.9562, 77.6698, "HAL Aerospace Museum, Bengaluru"),
    "majestic": (12.9779, 77.5707, "Majestic Metro Station, Bengaluru"),
    "whitefield": (12.9698, 77.7499, "Whitefield ITPL, Bengaluru")
}

def parse_cab_notification(text: str) -> Optional[Dict]:
    """
    Parses typical cab notifications to extract cab plate, provider, pickup and destination.
    """
    text_lower = text.lower()
    
    # Determine provider
    provider = "other"
    if "uber" in text_lower:
        provider = "uber"
    elif "ola" in text_lower:
        provider = "ola"
    elif "rapido" in text_lower:
        provider = "rapido"

    # Extract Cab plate (common Indian vehicle plate pattern: State-code District-code Letter-combo Number)
    # E.g., KA03MM1122, KA 03 MM 1122, KA-03-MM-1122
    plate_pattern = r'([A-Z]{2}[ -]?[0-9]{2}[ -]?[A-Z]{1,3}[ -]?[0-9]{4})'
    plate_match = re.search(plate_pattern, text.upper())
    cab_number = plate_match.group(1).replace(" ", "").replace("-", "") if plate_match else "KA01SAFE99"

    # Simple keyword-based extraction of pickup/dest from mock locations
    pickup_address = "Current Location"
    pickup_lat, pickup_lng = 12.9352, 77.6245 # Koramangala default
    
    dest_address = "Destination Office"
    dest_lat, dest_lng = 12.9719, 77.6412 # Indiranagar default

    # Look for known locations in text
    found_locs = []
    for loc_key, details in COORDS.items():
        if loc_key in text_lower:
            found_locs.append((text_lower.find(loc_key), details))
            
    # Sort by their appearance order
    found_locs.sort(key=lambda x: x[0])
    
    if len(found_locs) >= 2:
        # First mentioned is pickup, second is destination
        pickup_lat, pickup_lng, pickup_address = found_locs[0][1]
        dest_lat, dest_lng, dest_address = found_locs[1][1]
    elif len(found_locs) == 1:
        # If only one found, assume it is destination
        dest_lat, dest_lng, dest_address = found_locs[0][1]
        
    return {
        "cab_number": cab_number,
        "provider": provider,
        "pickup_address": pickup_address,
        "pickup_lat": pickup_lat,
        "pickup_lng": pickup_lng,
        "dest_address": dest_address,
        "dest_lat": dest_lat,
        "dest_lng": dest_lng
    }

@router.post("/trigger-notification", response_model=Dict)
async def trigger_notification(payload: NotificationInput, current_user: Dict = Depends(get_current_user)):
    parsed = parse_cab_notification(payload.text)
    if not parsed:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Could not extract journey details from notification text."
        )

    # Automatically call the start journey endpoint logic
    try:
        jc = JourneyCreate(**parsed)
        res = await start_journey(jc, current_user)
        return {
            "status": "success",
            "message": f"Successfully intercepted notification. Journey automatically started with {parsed['provider'].upper()}.",
            "journey": res
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Auto-start failed: {e}"
        )
