from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Dict, Optional
from app.auth import get_current_user
from app.database import DBService

router = APIRouter(prefix="/reports", tags=["Reports & Map Zones"])

class SafeZoneCreate(BaseModel):
    name: str
    type: str  # police, hospital, metro, petrol, shop, other
    latitude: float
    longitude: float
    description: str

class UnsafeZoneCreate(BaseModel):
    description: str
    latitude: float
    longitude: float
    radius: float = 200.0
    cab_plate: Optional[str] = ""

class CabReportCreate(BaseModel):
    cab_number: str
    provider: str
    rating: int
    review: str
    tags: List[str]
    latitude: Optional[float] = None
    longitude: Optional[float] = None

@router.get("/safe-zones", response_model=List[Dict])
async def get_safe_zones():
    return DBService.get_safe_zones()

@router.post("/safe-zones", response_model=Dict)
async def add_safe_zone(zone_in: SafeZoneCreate, current_user: Dict = Depends(get_current_user)):
    return DBService.create_safe_zone(current_user["phone"], zone_in.dict())

@router.get("/unsafe-zones", response_model=List[Dict])
async def get_unsafe_zones():
    return DBService.get_unsafe_zones()

@router.post("/unsafe-zones", response_model=Dict)
async def add_unsafe_zone(zone_in: UnsafeZoneCreate, current_user: Dict = Depends(get_current_user)):
    return DBService.create_unsafe_zone(current_user["phone"], zone_in.dict())

@router.get("/cabs", response_model=List[Dict])
async def get_all_cab_reports():
    return DBService.get_all_cab_reports()

@router.get("/cabs/{cab_number}", response_model=List[Dict])
async def get_cab_reports(cab_number: str):
    return DBService.get_cab_reports(cab_number)

@router.post("/cabs", response_model=Dict)
async def create_cab_report(report_in: CabReportCreate, current_user: Dict = Depends(get_current_user)):
    if report_in.rating < 1 or report_in.rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
    return DBService.create_cab_report(current_user["phone"], report_in.dict())
