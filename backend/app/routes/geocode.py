from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict

from app.services.geocode import forward_geocode
from app.services.reverse_geocode import reverse_geocode

router = APIRouter(prefix="/geocode", tags=["Geocode"])

class ForwardRequest(BaseModel):
    address: str

class ReverseResponse(BaseModel):
    display_name: str
    address: Dict = None

class AutocompleteResponse(BaseModel):
    name: str
    lat: float
    lng: float
    display_name: str

@router.post("/forward", response_model=Dict)
async def geocode_forward(req: ForwardRequest):
    try:
        result = await forward_geocode(req.address)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/reverse", response_model=ReverseResponse)
async def geocode_reverse(lat: float, lng: float):
    try:
        result = await reverse_geocode(lat, lng)
        return ReverseResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/search", response_model=List[AutocompleteResponse])
async def geocode_search(q: str, limit: int = 5):
    import httpx
    params = {"q": q, "format": "json", "limit": limit}
    headers = {"User-Agent": "FEMME-App"}
    async with httpx.AsyncClient() as client:
        resp = await client.get("https://nominatim.openstreetmap.org/search", params=params, headers=headers, timeout=10)
        resp.raise_for_status()
        data = resp.json()
    results = [
        AutocompleteResponse(
            name=item.get("display_name", ""),
            lat=float(item["lat"]),
            lng=float(item["lon"]),
            display_name=item.get("display_name", "")
        )
        for item in data
    ]
    return results
