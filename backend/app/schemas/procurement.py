from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

class ProcurementCreate(BaseModel):
    booking_id: int
    final_quantity_quintals: float = Field(..., gt=0)
    moisture_percentage: float = Field(default=12.0, ge=0, le=40)
    quality_grade: str = Field(default="Grade A")
    rate_applied: Optional[float] = None # If None, defaults to crop MSP rate
    remarks: Optional[str] = None

class ProcurementResponse(BaseModel):
    id: int
    booking_id: int
    centre_id: int
    crop_id: int
    operator_id: int
    final_quantity_quintals: float
    moisture_percentage: float
    quality_grade: str
    rate_applied: float
    total_amount: float
    remarks: Optional[str] = None
    procured_at: datetime
    
    crop_name: Optional[str] = None
    farmer_name: Optional[str] = None
    booking_code: Optional[str] = None

    class Config:
        from_attributes = True
