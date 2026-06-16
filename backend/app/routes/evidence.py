import os
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from typing import List, Dict
from app.auth import get_current_user
from app.database import DBService
from app.utils.pdf_generator import generate_fir_pdf

router = APIRouter(prefix="/evidence", tags=["Evidence"])

@router.get("/capsules/{journey_id}", response_model=List[Dict])
async def get_journey_capsules(journey_id: str, current_user: Dict = Depends(get_current_user)):
    journey = DBService.get_journey(journey_id)
    if not journey:
        raise HTTPException(status_code=404, detail="Journey not found")
    
    # Check ownership
    if journey["user_phone"] != current_user["phone"]:
        raise HTTPException(status_code=403, detail="Not authorized to access this evidence")

    return DBService.get_capsules(journey_id)

@router.get("/fir/{journey_id}")
async def download_fir_report(journey_id: str, current_user: Dict = Depends(get_current_user)):
    journey = DBService.get_journey(journey_id)
    if not journey:
        raise HTTPException(status_code=404, detail="Journey not found")
        
    # Check ownership
    if journey["user_phone"] != current_user["phone"]:
        raise HTTPException(status_code=403, detail="Not authorized to generate report for this journey")

    # Get evidence capsules
    capsules = DBService.get_capsules(journey_id)
    contacts = DBService.get_contacts(journey["user_phone"])
    
    # Generate temporary PDF filename
    pdf_filename = f"FIR_Report_{journey_id}.pdf"
    
    # Ensure temporary output directory exists
    pdf_dir = "./temp_reports"
    os.makedirs(pdf_dir, exist_ok=True)
    pdf_path = os.path.join(pdf_dir, pdf_filename)
    
    # Generate the PDF
    try:
        generate_fir_pdf(journey, capsules, contacts, pdf_path)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate FIR Assist PDF report: {e}"
        )

    # Return File Response
    return FileResponse(
        path=pdf_path,
        media_type="application/pdf",
        filename=pdf_filename
    )

@router.post("/cleanup")
async def trigger_evidence_cleanup(current_user: Dict = Depends(get_current_user)):
    # Run auto-delete logic for safe journeys older than 24 hours
    DBService.delete_unsafe_capsules_older_than_24h()
    return {"status": "success", "message": "Cleanup of older, non-emergency capsules completed."}
