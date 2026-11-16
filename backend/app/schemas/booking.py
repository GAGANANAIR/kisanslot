from datetime import datetime, date, time
from typing import Optional
from pydantic import BaseModel, Field
from app.models.booking import BookingStatus
from app.schemas.crop import CropResponse

class BookingCreate(BaseModel):
    centre_id: int
    slot_id: int
    crop_id: int
    estimated_quantity_quintals: float = Field(..., gt=0, le=1000)

class BookingReschedule(BaseModel):
    new_slot_id: int

class BookingResponse(BaseModel):
    id: int
    booking_code: str
    farmer_id: int
    centre_id: int
    slot_id: int
    crop_id: int
    estimated_quantity_quintals: float
    status: BookingStatus
    token_number: Optional[int] = None
    assigned_counter: Optional[int] = None
    check_in_time: Optional[datetime] = None
    called_time: Optional[datetime] = None
    completed_time: Optional[datetime] = None
    estimated_wait_minutes: int = 0
    created_at: datetime
    
    # Nested fields for UI convenience
    farmer_name: Optional[str] = None
    farmer_phone: Optional[str] = None
    centre_name: Optional[str] = None
    crop_name: Optional[str] = None
    slot_date: Optional[date] = None
    slot_time_window: Optional[str] = None

    class Config:
        from_attributes = True

class QueueStatusResponse(BaseModel):
    booking_id: int
    booking_code: str
    token_number: Optional[int]
    status: BookingStatus
    current_position: int  # 0 if called or finished, otherwise 1-based rank among waiting
    people_ahead: int
    assigned_counter: Optional[int]
    estimated_wait_minutes: int
    centre_name: str
    centre_id: int
    active_counters: int
