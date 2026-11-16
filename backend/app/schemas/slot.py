from datetime import date, time
from typing import Optional
from pydantic import BaseModel

class SlotBase(BaseModel):
    centre_id: int
    slot_date: date
    start_time: time
    end_time: time
    max_capacity_quintals: float = 120.0
    booked_capacity_quintals: float = 0.0
    is_active: bool = True

class SlotCreate(BaseModel):
    centre_id: int
    slot_date: date
    start_time: str # "09:00"
    end_time: str   # "10:00"
    max_capacity_quintals: float = 120.0

class SlotResponse(SlotBase):
    id: int
    remaining_capacity: float
    load_percentage: float

    class Config:
        from_attributes = True

class SlotRecommendation(SlotResponse):
    recommended_reason: str
    estimated_service_minutes: int
    expected_wait_minutes: int
