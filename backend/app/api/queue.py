from datetime import date, datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.booking import Booking, BookingStatus
from app.models.slot import Slot
from app.models.user import User, UserRole
from app.schemas.booking import BookingResponse, QueueStatusResponse
from app.api.deps import require_role, get_current_user
from app.services.queue_manager import QueueManager
from app.services.allocator import SlotAllocationService
from app.api.bookings import _format_booking_response

router = APIRouter(prefix="/queue", tags=["Queue & Desk Operations"])

@router.get("/today", response_model=List[BookingResponse])
def get_today_queue(
    centre_id: int,
    status_filter: Optional[str] = Query(None, description="ALL, WAITING, IN_PROGRESS, COMPLETED"),
    db: Session = Depends(get_db)
):
    today = date.today()
    query = db.query(Booking).join(Slot).filter(
        Booking.centre_id == centre_id,
        Slot.slot_date == today
    )

    if status_filter == "WAITING":
        query = query.filter(Booking.status.in_([BookingStatus.BOOKED, BookingStatus.CHECKED_IN]))
    elif status_filter == "IN_PROGRESS":
        query = query.filter(Booking.status == BookingStatus.IN_PROGRESS)
    elif status_filter == "COMPLETED":
        query = query.filter(Booking.status.in_([BookingStatus.PROCURED, BookingStatus.PAYMENT_PENDING, BookingStatus.PAID]))

    bookings = query.order_by(Booking.check_in_time.asc().nullslast(), Booking.created_at.asc()).all()
    return [_format_booking_response(b) for b in bookings]

@router.post("/{id}/check-in", response_model=BookingResponse)
async def check_in_farmer(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.OPERATOR, UserRole.ADMIN))
):
    try:
        booking = await QueueManager.check_in_farmer(db, id)
        return _format_booking_response(booking)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{id}/call", response_model=BookingResponse)
async def call_farmer_to_counter(
    id: int,
    counter_number: int = Query(..., ge=1, le=20),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.OPERATOR, UserRole.ADMIN))
):
    try:
        booking = await QueueManager.call_farmer_to_counter(db, id, counter_number)
        return _format_booking_response(booking)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{id}/no-show", response_model=BookingResponse)
def mark_no_show(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.OPERATOR, UserRole.ADMIN))
):
    booking = db.query(Booking).filter(Booking.id == id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    booking.status = BookingStatus.NO_SHOW
    db.commit()
    db.refresh(booking)
    return _format_booking_response(booking)

@router.get("/status/{booking_id}", response_model=QueueStatusResponse)
def get_live_queue_status(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    q_info = SlotAllocationService.estimate_live_queue_wait(db, booking)
    return {
        "booking_id": booking.id,
        "booking_code": booking.booking_code,
        "token_number": booking.token_number,
        "status": booking.status,
        "current_position": q_info["current_position"],
        "people_ahead": q_info["people_ahead"],
        "assigned_counter": booking.assigned_counter,
        "estimated_wait_minutes": q_info["estimated_wait_minutes"],
        "centre_name": booking.centre.name if booking.centre else "",
        "centre_id": booking.centre_id,
        "active_counters": q_info["active_counters"]
    }
