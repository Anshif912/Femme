from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Dict
from app.auth import get_current_user
from app.database import DBService

router = APIRouter(prefix="/contacts", tags=["Contacts"])

class ContactCreate(BaseModel):
    name: str
    phone: str
    priority: int = 1

@router.get("", response_model=List[Dict])
async def get_contacts(current_user: Dict = Depends(get_current_user)):
    return DBService.get_contacts(current_user["phone"])

@router.post("", response_model=Dict)
async def add_contact(contact_in: ContactCreate, current_user: Dict = Depends(get_current_user)):
    return DBService.add_contact(current_user["phone"], contact_in.dict())

@router.delete("/{contact_id}")
async def delete_contact(contact_id: str, current_user: Dict = Depends(get_current_user)):
    DBService.delete_contact(current_user["phone"], contact_id)
    return {"status": "success", "message": "Contact removed successfully"}

@router.put("/{contact_id}", response_model=Dict)
async def update_contact(contact_id: str, contact_in: ContactCreate, current_user: Dict = Depends(get_current_user)):
    return DBService.update_contact(current_user["phone"], contact_id, contact_in.dict())
