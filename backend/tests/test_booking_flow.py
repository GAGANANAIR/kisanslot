import sys, asyncio
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest
from datetime import date
from sqlalchemy.orm import Session
from app.database import SessionLocal, Base, engine
from app.models import (
    User, UserRole, LanguagePreference, Centre, Crop, Slot,
    Booking, BookingStatus, Procurement, Payment, PaymentStatus
)
from app.api.deps import get_password_hash, verify_password, create_access_token
from app.services.allocator import SlotAllocationService
from app.services.queue_manager import QueueManager

@pytest.fixture
def db():
    session = SessionLocal()
    yield session
    session.close()

def test_complete_farmer_to_procurement_lifecycle(db: Session):
    async def _async_steps():
        # 1. Register a test farmer
        test_phone = "9112233445"
        existing = db.query(User).filter(User.phone == test_phone).first()
        if existing:
            db.delete(existing)
            db.commit()

        farmer = User(
            phone=test_phone,
            name="Lifecycle Test Farmer",
            hashed_password=get_password_hash("Secret@123"),
            role=UserRole.FARMER,
            language_pref=LanguagePreference.KN
        )
        db.add(farmer)
        db.commit()
        db.refresh(farmer)

        assert farmer.id is not None
        assert verify_password("Secret@123", farmer.hashed_password)

        # 2. Token creation
        token = create_access_token({"sub": farmer.phone, "role": farmer.role.value, "id": farmer.id})
        assert token is not None

        # 3. Centre & Crop lookup
        centre = db.query(Centre).filter(Centre.is_active == True).first()
        crop = db.query(Crop).filter(Crop.name.like("%Wheat%")).first()
        assert centre is not None
        assert crop is not None

        # 4. Smart Slot Allocation
        requested_quantity = 35.0 # 35 Quintals
        recs = SlotAllocationService.recommend_slots(
            db=db,
            centre_id=centre.id,
            crop_id=crop.id,
            quantity_quintals=requested_quantity,
            preferred_date=date.today()
        )
        assert len(recs) > 0
        chosen_slot_data = recs[0]
        slot = db.query(Slot).filter(Slot.id == chosen_slot_data["id"]).first()
        initial_booked_cap = slot.booked_capacity_quintals

        # 5. Booking Creation & Capacity Decrement
        booking = Booking(
            booking_code="KS-TEST-LC-01",
            farmer_id=farmer.id,
            centre_id=centre.id,
            slot_id=slot.id,
            crop_id=crop.id,
            estimated_quantity_quintals=requested_quantity,
            status=BookingStatus.BOOKED
        )
        slot.booked_capacity_quintals += requested_quantity
        db.add(booking)
        db.commit()
        db.refresh(booking)

        assert booking.status == BookingStatus.BOOKED
        assert slot.booked_capacity_quintals == initial_booked_cap + requested_quantity

        # 6. Operator Check-In
        checked_in_b = await QueueManager.check_in_farmer(db, booking.id)
        assert checked_in_b.status == BookingStatus.CHECKED_IN
        assert checked_in_b.token_number is not None
        assert checked_in_b.token_number >= 100

        # 7. Operator calls farmer to Counter 2
        called_b = await QueueManager.call_farmer_to_counter(db, booking.id, counter_number=2)
        assert called_b.status == BookingStatus.IN_PROGRESS
        assert called_b.assigned_counter == 2

        # 8. Complete Procurement Recording
        operator = db.query(User).filter(User.role == UserRole.OPERATOR).first()
        final_weight = 34.5
        moisture = 11.2
        procurement = await QueueManager.complete_procurement(
            db=db,
            booking_id=booking.id,
            operator_id=operator.id,
            final_quantity=final_weight,
            moisture_pct=moisture,
            quality_grade="Grade A",
            rate_applied=crop.msp_rate,
            remarks="Test weighment passed"
        )
        assert procurement.id is not None
        assert procurement.total_amount == round(final_weight * crop.msp_rate, 2)
        assert booking.status == BookingStatus.PAYMENT_PENDING

        # 9. Payment Disbursement
        payment = db.query(Payment).filter(Payment.procurement_id == procurement.id).first()
        assert payment is not None
        assert payment.status == PaymentStatus.PENDING

        paid_record = await QueueManager.disburse_payment(
            db=db,
            payment_id=payment.id,
            reference_no="DBT-TEST-UTR-123456"
        )
        assert paid_record.status == PaymentStatus.PAID
        assert paid_record.reference_number == "DBT-TEST-UTR-123456"
        assert booking.status == BookingStatus.PAID

    asyncio.run(_async_steps())

if __name__ == "__main__":
    test_complete_farmer_to_procurement_lifecycle(SessionLocal())
    print("ALL TESTS IN TEST_BOOKING_FLOW EXECUTED SUCCESSFULLY!")

