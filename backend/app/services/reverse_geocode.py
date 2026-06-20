import httpx
from typing import Dict

NOMINATIM_REVERSE_URL = "https://nominatim.openstreetmap.org/reverse"

async def reverse_geocode(lat: float, lng: float) -> Dict:
    """Reverse geocode coordinates using Nominatim.
    Returns dict with 'display_name' and optional 'address'."""
    params = {"lat": lat, "lon": lng, "format": "json"}
    headers = {"User-Agent": "FEMME-App"}
    async with httpx.AsyncClient() as client:
        resp = await client.get(NOMINATIM_REVERSE_URL, params=params, headers=headers, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        return {"display_name": data.get("display_name", ""), "address": data.get("address", {})}
