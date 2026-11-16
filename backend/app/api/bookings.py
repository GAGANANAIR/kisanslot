import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.booking import Booking, BookingStatus
from app.models.slot import Slot
from app.models.crop import Crop
from app.models.centre import Centre
from app.models.user import User, UserRole
from app.schemas.booking import BookingCreate, BookingResponse, BookingReschedule
from app.api.deps import get_current_user
from app.services.notifications import notification_service
from app.services.websocket_hub import ws_hub

router = APIRouter(prefix="/bookings", tags=["Bookings"])

def _format_booking_response(b: Booking) -> dict:
    time_str = f"{b.slot.start_time.strftime('%H:%M')} - {b.slot.end_time.strftime('%H:%M')}" if b.slot else ""
    return {
        "id": b.id,
        "booking_code": b.booking_code,
        "farmer_id": b.farmer_id,
        "centre_id": b.centre_id,
        "slot_id": b.slot_id,
        "crop_id": b.crop_id,
        "estimated_quantity_quintals": b.estimated_quantity_quintals,
        "status": b.status,
        "token_number": b.token_number,
        "assigned_counter": b.assigned_counter,
        "check_in_time": b.check_in_time,
        "called_time": b.called_time,
        "completed_time": b.completed_time,
        "estimated_wait_minutes": b.estimated_wait_minutes,
        "created_at": b.created_at,
        "farmer_name": b.farmer.name if b.farmer else "",
        "farmer_phone": b.farmer.phone if b.farmer else "",
        "centre_name": b.centre.name if b.centre else "",
        "crop_name": b.crop.name if b.crop else "",
        "slot_date": b.slot.slot_date if b.slot else None,
        "slot_time_window": time_str
    }

@router.post("", response_model=BookingResponse)
async def create_booking(
    booking_in: BookingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    slot = db.query(Slot).filter(Slot.id == booking_in.slot_id, Slot.is_active == True).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Selected slot not found or inactive")

    # Overbooking protection
    remaining = slot.max_capacity_quintals - slot.booked_capacity_quintals
    if remaining < booking_in.estimated_quantity_quintals:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Slot capacity exceeded. Available: {remaining:.1f} Q, Requested: {booking_in.estimated_quantity_quintals} Q"
        )

    # Generate unique booking code
    code = f"KS-{datetime.utcnow().strftime('%y%m%d')}-{uuid.uuid4().hex[:5].upper()}"

    booking = Booking(
        booking_code=code,
        farmer_id=current_user.id,
        centre_id=booking_in.centre_id,
        slot_id=booking_in.slot_id,
        crop_id=booking_in.crop_id,
        estimated_quantity_quintals=booking_in.estimated_quantity_quintals,
        status=BookingStatus.BOOKED
    )
    # Deduct capacity
    slot.booked_capacity_quintals += booking_in.estimated_quantity_quintals

    db.add(booking)
    db.commit()
    db.refresh(booking)

    # Trigger Notification
    msg = (
        f"KisanSlot Confirmed! Code: {booking.booking_code}. Centre: {booking.centre.name}. "
        f"Date: {slot.slot_date}. Window: {slot.start_time.strftime('%H:%M')}-{slot.end_time.strftime('%H:%M')}. "
        f"Crop: {booking.crop.name} ({booking.estimated_quantity_quintals}Q)."
    )
    notification_service.send_notification(
        db=db,
        user_id=current_user.id,
        phone=current_user.phone,
        event_type="BOOKING_CONFIRMED",
        message=msg,
        channel="SMS"
    )

    # Real-time update to centre operator dashboard
    await ws_hub.broadcast_centre_event(booking.centre_id, "NEW_BOOKING", {
        "booking_code": booking.booking_code,
        "farmer_name": current_user.name,
        "crop_name": booking.crop.name,
        "quantity": booking.estimated_quantity_quintals
    })

    return _format_booking_response(booking)

@router.get("/my-bookings", response_model=List[BookingResponse])
def get_my_bookings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    bookings = db.query(Booking).filter(
        Booking.farmer_id == current_user.id
    ).order_by(Booking.created_at.desc()).all()
    return [_format_booking_response(b) for b in bookings]

@router.post("/{id}/cancel", response_model=BookingResponse)
async def cancel_booking(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    booking = db.query(Booking).filter(Booking.id == id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if booking.farmer_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized to cancel this booking")

    if booking.status not in (BookingStatus.BOOKED,):
        raise HTTPException(status_code=400, detail=f"Cannot cancel booking with status {booking.status.value}")

    # Restore slot capacity
    booking.slot.booked_capacity_quintals = max(0.0, booking.slot.booked_capacity_quintals - booking.estimated_quantity_quintals)
    booking.status = BookingStatus.CANCELLED
    db.commit()
    db.refresh(booking)

    notification_service.send_notification(
        db=db,
        user_id=booking.farmer_id,
        phone=booking.farmer.phone,
        event_type="BOOKING_CANCELLED",
        message=f"Your booking {booking.booking_code} has been cancelled successfully.",
        channel="SMS"
    )

    await ws_hub.broadcast_centre_event(booking.centre_id, "BOOKING_CANCELLED", {
        "booking_id": booking.id,
        "booking_code": booking.booking_code
    })

    return _format_booking_response(booking)

@router.post("/{id}/reschedule", response_model=BookingResponse)
async def reschedule_booking(
    id: int,
    reschedule_in: BookingReschedule,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    booking = db.query(Booking).filter(Booking.id == id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if booking.farmer_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")

    if booking.status != BookingStatus.BOOKED:
        raise HTTPException(status_code=400, detail="Only scheduled bookings can be rescheduled")

    new_slot = db.query(Slot).filter(Slot.id == reschedule_in.new_slot_id, Slot.is_active == True).first()
    if not new_slot:
        raise HTTPException(status_code=404, detail="New slot not found")

    remaining = new_slot.max_capacity_quintals - new_slot.booked_capacity_quintals
    if remaining < booking.estimated_quantity_quintals:
        raise HTTPException(status_code=400, detail="New slot has insufficient capacity")

    # Free old slot, occupy new slot
    booking.slot.booked_capacity_quintals = max(0.0, booking.slot.booked_capacity_quintals - booking.estimated_quantity_quintals)
    new_slot.booked_capacity_quintals += booking.estimated_quantity_quintals
    booking.slot_id = new_slot.id
    booking.centre_id = new_slot.centre_id
    db.commit()
    db.refresh(booking)

    msg = f"Booking {booking.booking_code} rescheduled to {new_slot.slot_date} ({new_slot.start_time.strftime('%H:%M')}-{new_slot.end_time.strftime('%H:%M')})."
    notification_service.send_notification(
        db=db,
        user_id=booking.farmer_id,
        phone=booking.farmer.phone,
        event_type="BOOKING_RESCHEDULED",
        message=msg,
        channel="SMS"
    )

    return _format_booking_response(booking)
