from typing import List, Optional
from pydantic import BaseModel
from app.schemas.crop import CropResponse

class CentreBase(BaseModel):
    name: str
    district: str
    state: str
    address: Optional[str] = None
    counters_count: int = 3
    daily_capacity_quintals: float = 1000.0
    operating_hours_start: str = "08:00"
    operating_hours_end: str = "17:00"
    is_active: bool = True

class CentreCreate(CentreBase):
    crop_ids: List[int] = []

class CentreResponse(CentreBase):
    id: int
    accepted_crops: List[CropResponse] = []

    class Config:
        from_attributes = True
