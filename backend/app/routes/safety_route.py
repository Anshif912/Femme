from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
from app.auth import get_current_user
from app.config import settings
import random

router = APIRouter(prefix="/route", tags=["Safety Route"])

class Coord(BaseModel):
    lat: float
    lng: float

class SafetyRouteRequest(BaseModel):
    origin: Coord
    destination: Coord

# Helper to call OpenRouteService (placeholder – returns simple straight line)
def get_route_geometry(origin: Coord, destination: Coord) -> List[List[float]]:
    # In a real implementation, call ORS. Here return just start and end.
    return [[origin.lat, origin.lng], [destination.lat, destination.lng]]

# Hard‑coded weighting model (Phase 1)
WEIGHTS = {
    "police": 0.20,
    "lighting": 0.15,
    "crowd": 0.10,
    "community": 0.10,
    "unsafe": 0.10,
    "hospital": 0.10,
    "transport": 0.10,
    "historical": 0.05,
    "night": 0.05,
    "emergency": 0.05,
}

def compute_score() -> int:
    # Placeholder deterministic score for demo purposes
    return random.randint(70, 95)

def generate_route(route_type: str, origin: Coord, destination: Coord) -> Dict[str, Any]:
    geometry = get_route_geometry(origin, destination)
    distance = random.randint(5, 15) * 1000  # meters
    duration = random.randint(5, 20) * 60   # seconds
    score = compute_score()
    # Determine risk level based on score
    if score >= 71:
        risk = "Low"
    elif score >= 41:
        risk = "Medium"
    else:
        risk = "High"
    reasons = [
        "Near police station",
        "Better street lighting",
        "High public activity",
        "Near hospital",
        "Low incident reports",
    ]
    return {
        "type": route_type,
        "geometry": geometry,
        "distance": distance,
        "duration": duration,
        "score": score,
        "risk_level": risk,
        "reasons": reasons,
    }

@router.post("/safety", response_model=List[Dict])
async def safety_routes(payload: SafetyRouteRequest, current_user: Dict = Depends(get_current_user)):
    # Verify API key presence
    if not settings.OPENROUTE_SERVICE_KEY:
        raise HTTPException(status_code=503, detail="OpenRouteService API key not configured")
    origin = payload.origin
    destination = payload.destination
    # For demo, generate three routes
    routes = [
        generate_route("Safest", origin, destination),
        generate_route("Fastest", origin, destination),
        generate_route("Balanced", origin, destination),
    ]
    return routes
