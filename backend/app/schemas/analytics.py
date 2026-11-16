from typing import List, Dict, Any
from pydantic import BaseModel

class SummaryStats(BaseModel):
    total_farmers: int
    total_bookings: int
    completed_procurements: int
    total_quintals_procured: float
    total_payout_inr: float
    average_wait_time_minutes: float
    no_show_rate_pct: float
    active_centres_count: int

class CentreUtilization(BaseModel):
    centre_id: int
    centre_name: str
    district: str
    total_capacity_quintals: float
    booked_capacity_quintals: float
    procured_capacity_quintals: float
    utilization_pct: float

class HourlyCongestion(BaseModel):
    hour: str # e.g. "08:00", "09:00"
    waiting_count: int
    processed_count: int
    avg_wait_minutes: float

class AnalyticsDashboardResponse(BaseModel):
    summary: SummaryStats
    centre_utilization: List[CentreUtilization]
    hourly_congestion: List[HourlyCongestion]
