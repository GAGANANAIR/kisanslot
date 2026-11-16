from datetime import date, datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.slot import Slot
from app.models.centre import Centre
from app.models.crop import Crop
from app.models.booking import Booking, BookingStatus

class SlotAllocationService:
    @staticmethod
    def calculate_service_duration(crop: Crop, quantity_quintals: float) -> int:
        """
        Calculates expected handling/inspection duration in minutes.
        Base weighment + sampling = 5 mins.
        Handling rate = (quantity / 10) * unit_handling_time_min.
        """
        base_time = 5
        handling_time = int((quantity_quintals / 10.0) * crop.unit_handling_time_min)
        # Cap between 10 mins and 60 mins per lot
        return max(10, min(60, base_time + handling_time))

    @staticmethod
    def recommend_slots(
        db: Session,
        centre_id: int,
        crop_id: int,
        quantity_quintals: float,
        preferred_date: Optional[date] = None
    ) -> List[Dict[str, Any]]:
        """
        Recommends least-loaded available slots for a given centre, crop, and lot size.
        Guarantees that a slot is never overbooked.
        """
        centre = db.query(Centre).filter(Centre.id == centre_id, Centre.is_active == True).first()
        crop = db.query(Crop).filter(Crop.id == crop_id).first()
        if not centre or not crop:
            return []

        # Default to today if no date provided
        target_date = preferred_date or date.today()

        # Query all active slots for target date
        slots = db.query(Slot).filter(
            Slot.centre_id == centre_id,
            Slot.slot_date == target_date,
            Slot.is_active == True
        ).all()

        service_time = SlotAllocationService.calculate_service_duration(crop, quantity_quintals)
        recommendations = []

        for slot in slots:
            remaining = slot.max_capacity_quintals - slot.booked_capacity_quintals
            # Strict rule: NEVER OVERBOOK
            if remaining < quantity_quintals:
                continue

            load_pct = (slot.booked_capacity_quintals / slot.max_capacity_quintals) * 100.0

            # Count pending / active bookings already in this slot
            existing_bookings_count = db.query(Booking).filter(
                Booking.slot_id == slot.id,
                Booking.status.notin_([BookingStatus.CANCELLED, BookingStatus.NO_SHOW])
            ).count()

            # Wait estimator: average duration divided by active counters
            counters = max(1, centre.counters_count)
            estimated_wait = int((existing_bookings_count * service_time) / counters)

            # Recommend tag
            if load_pct < 30:
                tag = "Least Crowded (Fastest Intake)"
            elif load_pct < 60:
                tag = "Moderate Traffic"
            else:
                tag = "Peak Window"

            recommendations.append({
                "id": slot.id,
                "centre_id": slot.centre_id,
                "slot_date": slot.slot_date,
                "start_time": slot.start_time,
                "end_time": slot.end_time,
                "max_capacity_quintals": slot.max_capacity_quintals,
                "booked_capacity_quintals": slot.booked_capacity_quintals,
                "remaining_capacity": round(remaining, 2),
                "load_percentage": round(load_pct, 1),
                "is_active": slot.is_active,
                "recommended_reason": tag,
                "estimated_service_minutes": service_time,
                "expected_wait_minutes": estimated_wait
            })

        # Sort recommendations: lowest load percentage first (smart load balancing)
        recommendations.sort(key=lambda s: (s["load_percentage"], s["expected_wait_minutes"]))
        return recommendations

    @staticmethod
    def estimate_live_queue_wait(db: Session, booking: Booking) -> Dict[str, Any]:
        """
        Estimates real-time wait time for a checked-in farmer based on tokens ahead.
        """
        if booking.status not in (BookingStatus.CHECKED_IN, BookingStatus.IN_PROGRESS):
            return {
                "current_position": 0,
                "people_ahead": 0,
                "estimated_wait_minutes": 0,
                "active_counters": booking.centre.counters_count if booking.centre else 1
            }

        if booking.status == BookingStatus.IN_PROGRESS:
            return {
                "current_position": 1,
                "people_ahead": 0,
                "estimated_wait_minutes": 0,
                "active_counters": booking.centre.counters_count if booking.centre else 1
            }

        # Count checked-in bookings with smaller token numbers at this centre today
        people_ahead = db.query(Booking).filter(
            Booking.centre_id == booking.centre_id,
            Booking.status == BookingStatus.CHECKED_IN,
            Booking.token_number < booking.token_number
        ).count()

        active_counters = max(1, booking.centre.counters_count if booking.centre else 1)
        # Average lot processing time estimate = 15 mins
        estimated_wait = int(round((people_ahead * 15.0) / active_counters))

        return {
            "current_position": people_ahead + 1,
            "people_ahead": people_ahead,
            "estimated_wait_minutes": max(2, estimated_wait),
            "active_counters": active_counters
        }
