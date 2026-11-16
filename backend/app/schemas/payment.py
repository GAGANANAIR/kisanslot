from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from app.models.payment import PaymentStatus

class PaymentUpdate(BaseModel):
    status: PaymentStatus
    reference_number: Optional[str] = None
    payment_mode: Optional[str] = "Direct Benefit Transfer (DBT)"

class PaymentResponse(BaseModel):
    id: int
    procurement_id: int
    farmer_id: int
    amount: float
    status: PaymentStatus
    reference_number: Optional[str] = None
    payment_mode: str
    paid_at: Optional[datetime] = None
    created_at: datetime
    
    farmer_name: Optional[str] = None
    crop_name: Optional[str] = None
    booking_code: Optional[str] = None

    class Config:
        from_attributes = True
