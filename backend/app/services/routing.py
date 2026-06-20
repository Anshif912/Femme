import httpx
import os
from typing import List, Dict, Any

ORS_DIRECTIONS_URL = "https://api.openrouteservice.org/v2/directions/driving-car"

async def get_route(origin: Dict[str, float], destination: Dict[str, float]) -> Dict:
    """Call OpenRouteService Directions API to obtain route geometry, distance, duration.
    `origin` and `destination` are dicts with keys 'lat' and 'lng'.
    Returns a dict with 'geometry' (list of [lat,lng]), 'distance' (meters), 'duration' (seconds), 'name'.
    """
    key = os.getenv("OPENROUTE_SERVICE_KEY")
    if not key:
        raise RuntimeError("OpenRouteService API key not configured")
    params = {
        "api_key": key,
        "start": f"{origin['lng']},{origin['lat']}",
        "end": f"{destination['lng']},{destination['lat']}",
    }
    async with httpx.AsyncClient() as client:
        resp = await client.get(ORS_DIRECTIONS_URL, params=params, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        route = data.get("features", [])[0]
        geometry_coords = route["geometry"]["coordinates"]  # list of [lon, lat]
        geometry = [[lat, lng] for lng, lat in geometry_coords]
        properties = route.get("properties", {})
        return {
            "geometry": geometry,
            "distance": properties.get("summary", {}).get("distance", 0),
            "duration": properties.get("summary", {}).get("duration", 0),
            "name": properties.get("summary", {}).get("description", "Route"),
        }
