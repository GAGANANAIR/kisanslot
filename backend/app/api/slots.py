from datetime import date, datetime, time, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.slot import Slot
from app.models.centre import Centre
from app.models.user import User, UserRole
from app.schemas.slot import SlotResponse, SlotRecommendation, SlotCreate
from app.services.allocator import SlotAllocationService
from app.api.deps import require_role

router = APIRouter(prefix="/slots", tags=["Slots & Allocation"])

@router.get("/available", response_model=List[SlotResponse])
def get_available_slots(
    centre_id: int,
    slot_date: Optional[date] = None,
    db: Session = Depends(get_db)
):
    target_date = slot_date or date.today()
    slots = db.query(Slot).filter(
        Slot.centre_id == centre_id,
        Slot.slot_date == target_date,
        Slot.is_active == True
    ).order_by(Slot.start_time).all()
    return slots

@router.get("/recommend", response_model=List[SlotRecommendation])
def recommend_smart_slots(
    centre_id: int = Query(..., description="Target procurement centre ID"),
    crop_id: int = Query(..., description="Crop ID to sell"),
    quantity_quintals: float = Query(..., gt=0, description="Estimated quantity in quintals"),
    slot_date: Optional[date] = Query(None, description="Preferred date (YYYY-MM-DD)"),
    db: Session = Depends(get_db)
):
    recommendations = SlotAllocationService.recommend_slots(
        db=db,
        centre_id=centre_id,
        crop_id=crop_id,
        quantity_quintals=quantity_quintals,
        preferred_date=slot_date
    )
    return recommendations

@router.post("/generate-daily")
def generate_daily_slots(
    centre_id: int,
    slot_date: date,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.OPERATOR))
):
    centre = db.query(Centre).filter(Centre.id == centre_id).first()
    if not centre:
        raise HTTPException(status_code=404, detail="Centre not found")

    # Generate 1-hour slots from start to end (e.g. 08:00 to 17:00)
    start_dt = datetime.strptime(centre.operating_hours_start, "%H:%M")
    end_dt = datetime.strptime(centre.operating_hours_end, "%H:%M")

    # Total hours
    hours = int((end_dt - start_dt).total_seconds() // 3600)
    if hours <= 0:
        hours = 8
    capacity_per_slot = round(centre.daily_capacity_quintals / hours, 1)

    created_count = 0
    curr = start_dt
    while curr < end_dt:
        slot_end = curr + timedelta(hours=1)
        if slot_end > end_dt:
            slot_end = end_dt
            
        # Check if already exists
        exists = db.query(Slot).filter(
            Slot.centre_id == centre_id,
            Slot.slot_date == slot_date,
            Slot.start_time == curr.time()
        ).first()

        if not exists:
            new_slot = Slot(
                centre_id=centre_id,
                slot_date=slot_date,
                start_time=curr.time(),
                end_time=slot_end.time(),
                max_capacity_quintals=capacity_per_slot,
                booked_capacity_quintals=0.0
            )
            db.add(new_slot)
            created_count += 1

        curr = slot_end

    db.commit()
    return {"message": f"Generated {created_count} slots for {centre.name} on {slot_date}"}
