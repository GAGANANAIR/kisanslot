from typing import Optional
from pydantic import BaseModel

class CropBase(BaseModel):
    name: str
    local_name: Optional[str] = None
    category: Optional[str] = "Cereal"
    msp_rate: float
    unit_handling_time_min: int = 5
    moisture_standard_pct: float = 12.0

class CropCreate(CropBase):
    pass

class CropResponse(CropBase):
    id: int

    class Config:
        from_attributes = True
