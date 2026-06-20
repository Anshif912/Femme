import httpx
import os
from typing import Dict

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
ORS_GEOCODE_URL = "https://api.openrouteservice.org/geocode/search"

async def forward_geocode(address: str) -> Dict:
    """Geocode an address using Nominatim; fallback to OpenRouteService.
    Returns dict with 'lat', 'lng', 'display_name'."""
    params = {"q": address, "format": "json", "limit": 1}
    headers = {"User-Agent": "FEMME-App"}
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(NOMINATIM_URL, params=params, headers=headers, timeout=10)
            resp.raise_for_status()
            data = resp.json()
            if data:
                result = data[0]
                return {"lat": float(result["lat"]), "lng": float(result["lon"]), "display_name": result.get("display_name", "")}
        except Exception:
            pass
        # Fallback to ORS
        key = os.getenv("OPENROUTE_SERVICE_KEY")
        if not key:
            raise RuntimeError("OpenRouteService API key not configured for fallback geocoding")
        ors_params = {"api_key": key, "text": address, "size": 1}
        resp = await client.get(ORS_GEOCODE_URL, params=ors_params, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        features = data.get("features", [])
        if not features:
            raise RuntimeError(f"Geocoding failed for address: {address}")
        feat = features[0]
        coords = feat["geometry"]["coordinates"]  # [lng, lat]
        return {"lat": coords[1], "lng": coords[0], "display_name": feat.get("properties", {}).get("label", "")}
