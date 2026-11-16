from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.procurement import Procurement
from app.models.booking import Booking
from app.models.user import User, UserRole
from app.schemas.procurement import ProcurementCreate, ProcurementResponse
from app.api.deps import require_role, get_current_user
from app.services.queue_manager import QueueManager

router = APIRouter(prefix="/procurement", tags=["Procurement"])

def _format_procurement_response(p: Procurement) -> dict:
    return {
        "id": p.id,
        "booking_id": p.booking_id,
        "centre_id": p.centre_id,
        "crop_id": p.crop_id,
        "operator_id": p.operator_id,
        "final_quantity_quintals": p.final_quantity_quintals,
        "moisture_percentage": p.moisture_percentage,
        "quality_grade": p.quality_grade,
        "rate_applied": p.rate_applied,
        "total_amount": p.total_amount,
        "remarks": p.remarks,
        "procured_at": p.procured_at,
        "crop_name": p.crop.name if p.crop else "",
        "farmer_name": p.booking.farmer.name if p.booking and p.booking.farmer else "",
        "booking_code": p.booking.booking_code if p.booking else ""
    }

@router.post("/record", response_model=ProcurementResponse)
async def record_procurement(
    proc_in: ProcurementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.OPERATOR, UserRole.ADMIN))
):
    try:
        procurement = await QueueManager.complete_procurement(
            db=db,
            booking_id=proc_in.booking_id,
            operator_id=current_user.id,
            final_quantity=proc_in.final_quantity_quintals,
            moisture_pct=proc_in.moisture_percentage,
            quality_grade=proc_in.quality_grade,
            rate_applied=proc_in.rate_applied,
            remarks=proc_in.remarks
        )
        return _format_procurement_response(procurement)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{booking_id}", response_model=ProcurementResponse)
def get_procurement_by_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    proc = db.query(Procurement).filter(Procurement.booking_id == booking_id).first()
    if not proc:
        raise HTTPException(status_code=404, detail="Procurement record not found")
    return _format_procurement_response(proc)
