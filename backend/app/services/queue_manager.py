from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.booking import Booking, BookingStatus
from app.models.centre import Centre
from app.models.procurement import Procurement
from app.models.payment import Payment, PaymentStatus
from app.services.allocator import SlotAllocationService
from app.services.websocket_hub import ws_hub
from app.services.notifications import notification_service

class QueueManager:
    @staticmethod
    async def check_in_farmer(db: Session, booking_id: int) -> Booking:
        booking = db.query(Booking).filter(Booking.id == booking_id).first()
        if not booking:
            raise ValueError("Booking not found")
        if booking.status != BookingStatus.BOOKED:
            raise ValueError(f"Cannot check in booking with status {booking.status.value}")

        # Compute next daily token number for this centre
        max_token = db.query(func.max(Booking.token_number)).filter(
            Booking.centre_id == booking.centre_id,
            func.date(Booking.check_in_time) == datetime.utcnow().date()
        ).scalar() or 100

        booking.token_number = max_token + 1
        booking.check_in_time = datetime.utcnow()
        booking.status = BookingStatus.CHECKED_IN
        db.commit()
        db.refresh(booking)

        # Calculate estimated wait
        queue_info = SlotAllocationService.estimate_live_queue_wait(db, booking)
        booking.estimated_wait_minutes = queue_info["estimated_wait_minutes"]
        db.commit()

        # Notification & WebSocket Broadcast
        msg = f"Check-in successful! Your Token is #{booking.token_number}. Position in queue: {queue_info['current_position']}. Est. wait: {queue_info['estimated_wait_minutes']} mins."
        notification_service.send_notification(
            db=db,
            user_id=booking.farmer_id,
            phone=booking.farmer.phone,
            event_type="CHECKED_IN",
            message=msg,
            channel="SMS"
        )

        # Notify Farmer on private channel
        await ws_hub.notify_farmer(booking.farmer_id, "TOKEN_ASSIGNED", {
            "booking_id": booking.id,
            "token_number": booking.token_number,
            "current_position": queue_info["current_position"],
            "estimated_wait_minutes": queue_info["estimated_wait_minutes"]
        })

        # Broadcast to Centre Queue Board
        await ws_hub.broadcast_centre_event(booking.centre_id, "QUEUE_UPDATED", {
            "action": "CHECK_IN",
            "booking_id": booking.id,
            "token_number": booking.token_number,
            "farmer_name": booking.farmer.name,
            "crop_name": booking.crop.name,
            "quantity": booking.estimated_quantity_quintals
        })

        return booking

    @staticmethod
    async def call_farmer_to_counter(db: Session, booking_id: int, counter_number: int) -> Booking:
        booking = db.query(Booking).filter(Booking.id == booking_id).first()
        if not booking:
            raise ValueError("Booking not found")

        booking.status = BookingStatus.IN_PROGRESS
        booking.assigned_counter = counter_number
        booking.called_time = datetime.utcnow()
        db.commit()
        db.refresh(booking)

        # Alert the called farmer
        msg = f"ALERT: Token #{booking.token_number} ({booking.farmer.name}), please proceed immediately to Procurement Counter #{counter_number}!"
        notification_service.send_notification(
            db=db,
            user_id=booking.farmer_id,
            phone=booking.farmer.phone,
            event_type="CALLED_TO_COUNTER",
            message=msg,
            channel="SMS"
        )

        await ws_hub.notify_farmer(booking.farmer_id, "CALLED_TO_COUNTER", {
            "booking_id": booking.id,
            "token_number": booking.token_number,
            "counter_number": counter_number,
            "message": msg
        })

        # Broadcast announcement to Centre Board (triggers sound & highlight)
        await ws_hub.broadcast_centre_event(booking.centre_id, "FARMER_CALLED", {
            "booking_id": booking.id,
            "token_number": booking.token_number,
            "counter_number": counter_number,
            "farmer_name": booking.farmer.name,
            "crop_name": booking.crop.name
        })

        # Also recalculate wait time for remaining checked-in farmers and notify them
        remaining_farmers = db.query(Booking).filter(
            Booking.centre_id == booking.centre_id,
            Booking.status == BookingStatus.CHECKED_IN
        ).all()

        for b in remaining_farmers:
            q_info = SlotAllocationService.estimate_live_queue_wait(db, b)
            b.estimated_wait_minutes = q_info["estimated_wait_minutes"]
            await ws_hub.notify_farmer(b.farmer_id, "QUEUE_ADVANCED", q_info)
        db.commit()

        return booking

    @staticmethod
    async def complete_procurement(
        db: Session,
        booking_id: int,
        operator_id: int,
        final_quantity: float,
        moisture_pct: float,
        quality_grade: str,
        rate_applied: Optional[float] = None,
        remarks: Optional[str] = None
    ) -> Procurement:
        booking = db.query(Booking).filter(Booking.id == booking_id).first()
        if not booking:
            raise ValueError("Booking not found")

        effective_rate = rate_applied if rate_applied is not None else booking.crop.msp_rate
        total_amount = round(final_quantity * effective_rate, 2)

        # 1. Create Procurement Record
        procurement = Procurement(
            booking_id=booking.id,
            centre_id=booking.centre_id,
            crop_id=booking.crop_id,
            operator_id=operator_id,
            final_quantity_quintals=final_quantity,
            moisture_percentage=moisture_pct,
            quality_grade=quality_grade,
            rate_applied=effective_rate,
            total_amount=total_amount,
            remarks=remarks,
            procured_at=datetime.utcnow()
        )
        db.add(procurement)

        # 2. Transition booking status
        booking.status = BookingStatus.PROCURED
        booking.completed_time = datetime.utcnow()
        db.commit()
        db.refresh(procurement)

        # 3. Create initial Payment Record (PENDING)
        payment = Payment(
            procurement_id=procurement.id,
            farmer_id=booking.farmer_id,
            amount=total_amount,
            status=PaymentStatus.PENDING,
            created_at=datetime.utcnow()
        )
        db.add(payment)
        booking.status = BookingStatus.PAYMENT_PENDING
        db.commit()

        # 4. Notify Farmer
        receipt_msg = (
            f"Procurement Complete! Crop: {booking.crop.name}, Final Weight: {final_quantity} Quintals @ "
            f"₹{effective_rate}/Q. Total Amount: ₹{total_amount:,.2f}. Payment initiated via DBT."
        )
        notification_service.send_notification(
            db=db,
            user_id=booking.farmer_id,
            phone=booking.farmer.phone,
            event_type="PROCURED",
            message=receipt_msg,
            channel="SMS"
        )

        await ws_hub.notify_farmer(booking.farmer_id, "PROCUREMENT_RECORDED", {
            "booking_id": booking.id,
            "final_quantity": final_quantity,
            "total_amount": total_amount,
            "rate": effective_rate
        })

        await ws_hub.broadcast_centre_event(booking.centre_id, "QUEUE_UPDATED", {
            "action": "PROCUREMENT_COMPLETED",
            "booking_id": booking.id,
            "token_number": booking.token_number
        })

        return procurement

    @staticmethod
    async def disburse_payment(
        db: Session,
        payment_id: int,
        reference_no: str,
        payment_mode: str = "Direct Benefit Transfer (DBT)"
    ) -> Payment:
        payment = db.query(Payment).filter(Payment.id == payment_id).first()
        if not payment:
            raise ValueError("Payment record not found")

        payment.status = PaymentStatus.PAID
        payment.reference_number = reference_no
        payment.payment_mode = payment_mode
        payment.paid_at = datetime.utcnow()

        # Update Booking Status to PAID
        if payment.procurement and payment.procurement.booking:
            payment.procurement.booking.status = BookingStatus.PAID

        db.commit()
        db.refresh(payment)

        farmer = payment.farmer
        msg = f"Payment Successful! ₹{payment.amount:,.2f} disbursed to account via {payment_mode}. UTR Ref: {reference_no}."
        notification_service.send_notification(
            db=db,
            user_id=farmer.id,
            phone=farmer.phone,
            event_type="PAYMENT_RELEASED",
            message=msg,
            channel="SMS"
        )

        await ws_hub.notify_farmer(farmer.id, "PAYMENT_COMPLETED", {
            "payment_id": payment.id,
            "amount": payment.amount,
            "reference_number": reference_no
        })

        return payment
