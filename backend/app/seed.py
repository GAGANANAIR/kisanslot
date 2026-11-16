import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from datetime import date, datetime, time, timedelta
from app.database import SessionLocal, Base, engine
from app.models import (
    User, UserRole, LanguagePreference,
    Crop, Centre, Slot, Booking, BookingStatus,
    Procurement, Payment, PaymentStatus, Notification, NotificationChannel
)
from app.api.deps import get_password_hash

def seed_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Clear existing data for a clean seed
    db.query(Notification).delete()
    db.query(Payment).delete()
    db.query(Procurement).delete()
    db.query(Booking).delete()
    db.query(Slot).delete()
    db.execute(Centre.__table__.delete())
    db.execute(Crop.__table__.delete())
    db.query(User).delete()
    db.commit()

    print("Seeding Crops (MSP & Handling profiles)...")
    crops_data = [
        {"name": "Wheat (गेहूं / ಗೋಧಿ)", "local_name": "Wheat / Gehun / Godhi", "category": "Cereal", "msp_rate": 2275.0, "unit_handling_time_min": 4},
        {"name": "Paddy Common (धान / ಭತ್ತ)", "local_name": "Paddy / Dhan / Bhatta", "category": "Cereal", "msp_rate": 2183.0, "unit_handling_time_min": 5},
        {"name": "Ragi (रागी / ರಾಗಿ)", "local_name": "Finger Millet / Ragi", "category": "Millets", "msp_rate": 3846.0, "unit_handling_time_min": 4},
        {"name": "Maize (मक्का / ಮೆಕ್ಕೆಜೋಳ)", "local_name": "Maize / Makka / Mekkejola", "category": "Cereal", "msp_rate": 2090.0, "unit_handling_time_min": 5},
        {"name": "Soybean (सोयाबीन / ಸೋಯಾಬೀನ್)", "local_name": "Soybean", "category": "Oilseeds", "msp_rate": 4600.0, "unit_handling_time_min": 6},
        {"name": "Cotton (कपास / ಹತ್ತಿ)", "local_name": "Cotton / Kapas / Hatti", "category": "Fiber", "msp_rate": 6620.0, "unit_handling_time_min": 8},
    ]
    crops = []
    for c in crops_data:
        crop_obj = Crop(**c)
        db.add(crop_obj)
        crops.append(crop_obj)
    db.commit()

    print("Seeding Procurement Centres...")
    centres_data = [
        {
            "name": "Dharwad APMC Procurement Hub",
            "district": "Dharwad",
            "state": "Karnataka",
            "address": "APMC Yard, Rayapur Road, Dharwad",
            "counters_count": 3,
            "daily_capacity_quintals": 1200.0,
            "operating_hours_start": "08:00",
            "operating_hours_end": "17:00",
            "is_active": True,
            "crops": [crops[0], crops[1], crops[2], crops[4]]
        },
        {
            "name": "Mandya Regional Grain Mandi",
            "district": "Mandya",
            "state": "Karnataka",
            "address": "Sugar Town Bypass, Mandya",
            "counters_count": 2,
            "daily_capacity_quintals": 800.0,
            "operating_hours_start": "08:00",
            "operating_hours_end": "16:00",
            "is_active": True,
            "crops": [crops[1], crops[2], crops[3]]
        },
        {
            "name": "Bhopal Central Krishi Mandi",
            "district": "Bhopal",
            "state": "Madhya Pradesh",
            "address": "Karond Mandi Complex, Bhopal",
            "counters_count": 4,
            "daily_capacity_quintals": 1600.0,
            "operating_hours_start": "08:00",
            "operating_hours_end": "17:00",
            "is_active": True,
            "crops": [crops[0], crops[3], crops[4], crops[5]]
        }
    ]
    centres = []
    for cd in centres_data:
        accepted = cd.pop("crops")
        centre_obj = Centre(**cd)
        centre_obj.accepted_crops = accepted
        db.add(centre_obj)
        centres.append(centre_obj)
    db.commit()

    print("Generating Slots for Centres...")
    today = date.today()
    all_slots = []
    for target_day in [today, today + timedelta(days=1), today + timedelta(days=2)]:
        for c in centres:
            start_h = int(c.operating_hours_start.split(":")[0])
            end_h = int(c.operating_hours_end.split(":")[0])
            hours = end_h - start_h
            cap_per_slot = round(c.daily_capacity_quintals / max(1, hours), 1)

            for h in range(start_h, end_h):
                s = Slot(
                    centre_id=c.id,
                    slot_date=target_day,
                    start_time=time(h, 0),
                    end_time=time(h + 1, 0),
                    max_capacity_quintals=cap_per_slot,
                    booked_capacity_quintals=0.0
                )
                db.add(s)
                all_slots.append(s)
    db.commit()

    print("Seeding Users (Admin, Operators, Farmers)...")
    hashed_pwd = get_password_hash("Farmer@123")
    hashed_op_pwd = get_password_hash("Operator@123")
    hashed_admin_pwd = get_password_hash("Admin@123")

    admin = User(
        phone="9999999999",
        name="State Procurement Director",
        hashed_password=hashed_admin_pwd,
        role=UserRole.ADMIN,
        language_pref=LanguagePreference.EN
    )
    op1 = User(
        phone="8888888888",
        name="Sanjay Kulkarni (Dharwad Operator)",
        hashed_password=hashed_op_pwd,
        role=UserRole.OPERATOR,
        language_pref=LanguagePreference.KN
    )
    op2 = User(
        phone="8888888889",
        name="Manjunath Gowda (Mandya Operator)",
        hashed_password=hashed_op_pwd,
        role=UserRole.OPERATOR,
        language_pref=LanguagePreference.KN
    )
    farmer1 = User(
        phone="9876543210",
        name="Ramesh Patil",
        hashed_password=hashed_pwd,
        role=UserRole.FARMER,
        language_pref=LanguagePreference.KN
    )
    farmer2 = User(
        phone="9876543211",
        name="Suresh Kumar",
        hashed_password=hashed_pwd,
        role=UserRole.FARMER,
        language_pref=LanguagePreference.HI
    )
    farmer3 = User(
        phone="9876543212",
        name="Anil Gowda",
        hashed_password=hashed_pwd,
        role=UserRole.FARMER,
        language_pref=LanguagePreference.EN
    )
    db.add_all([admin, op1, op2, farmer1, farmer2, farmer3])
    db.commit()

    print("Seeding Demo Bookings, Live Queue, and Procurements...")
    # Dharwad centre slots for today
    dharwad_slots = [s for s in all_slots if s.centre_id == centres[0].id and s.slot_date == today]
    
    # Booking 1: Checked in and waiting
    b1 = Booking(
        booking_code="KS-DEMO-001",
        farmer_id=farmer1.id,
        centre_id=centres[0].id,
        slot_id=dharwad_slots[0].id,
        crop_id=crops[0].id, # Wheat
        estimated_quantity_quintals=45.0,
        status=BookingStatus.CHECKED_IN,
        token_number=101,
        check_in_time=datetime.utcnow() - timedelta(minutes=25),
        estimated_wait_minutes=15
    )
    dharwad_slots[0].booked_capacity_quintals += 45.0

    # Booking 2: Called to Counter 1 (In Progress)
    b2 = Booking(
        booking_code="KS-DEMO-002",
        farmer_id=farmer2.id,
        centre_id=centres[0].id,
        slot_id=dharwad_slots[0].id,
        crop_id=crops[4].id, # Soybean
        estimated_quantity_quintals=30.0,
        status=BookingStatus.IN_PROGRESS,
        token_number=100,
        assigned_counter=1,
        check_in_time=datetime.utcnow() - timedelta(minutes=45),
        called_time=datetime.utcnow() - timedelta(minutes=10),
        estimated_wait_minutes=0
    )
    dharwad_slots[0].booked_capacity_quintals += 30.0

    # Booking 3: Booked for next hour slot
    b3 = Booking(
        booking_code="KS-DEMO-003",
        farmer_id=farmer3.id,
        centre_id=centres[0].id,
        slot_id=dharwad_slots[1].id,
        crop_id=crops[2].id, # Ragi
        estimated_quantity_quintals=50.0,
        status=BookingStatus.BOOKED,
        estimated_wait_minutes=0
    )
    dharwad_slots[1].booked_capacity_quintals += 50.0

    db.add_all([b1, b2, b3])
    db.commit()

    # Create a historical completed procurement & payment
    b_hist = Booking(
        booking_code="KS-HIST-099",
        farmer_id=farmer1.id,
        centre_id=centres[0].id,
        slot_id=dharwad_slots[0].id,
        crop_id=crops[0].id,
        estimated_quantity_quintals=60.0,
        status=BookingStatus.PAID,
        token_number=99,
        assigned_counter=2,
        check_in_time=datetime.utcnow() - timedelta(hours=2),
        called_time=datetime.utcnow() - timedelta(hours=1, minutes=45),
        completed_time=datetime.utcnow() - timedelta(hours=1, minutes=15)
    )
    db.add(b_hist)
    db.commit()

    proc = Procurement(
        booking_id=b_hist.id,
        centre_id=centres[0].id,
        crop_id=crops[0].id,
        operator_id=op1.id,
        final_quantity_quintals=60.0,
        moisture_percentage=11.5,
        quality_grade="Grade A",
        rate_applied=2275.0,
        total_amount=136500.0,
        remarks="Excellent quality grain. Minimal chaff.",
        procured_at=datetime.utcnow() - timedelta(hours=1, minutes=15)
    )
    db.add(proc)
    db.commit()

    pay = Payment(
        procurement_id=proc.id,
        farmer_id=farmer1.id,
        amount=136500.0,
        status=PaymentStatus.PAID,
        reference_number="DBT-PFMS-84920491",
        payment_mode="Direct Benefit Transfer (DBT)",
        paid_at=datetime.utcnow() - timedelta(hours=1)
    )
    db.add(pay)

    # In-app notifications
    n1 = Notification(
        user_id=farmer1.id,
        channel=NotificationChannel.IN_APP,
        event_type="PAYMENT_RELEASED",
        message="Payment of ₹1,36,500.00 released to your account via DBT. Ref: DBT-PFMS-84920491.",
        is_read=False,
        sent_at=datetime.utcnow() - timedelta(hours=1)
    )
    n2 = Notification(
        user_id=farmer1.id,
        channel=NotificationChannel.IN_APP,
        event_type="CHECKED_IN",
        message="Checked in for booking KS-DEMO-001. Token #101. Est. wait time: 15 mins.",
        is_read=False,
        sent_at=datetime.utcnow() - timedelta(minutes=25)
    )
    db.add_all([n1, n2])
    db.commit()

    print("\nDatabase successfully initialized and seeded with demo accounts!")
    print("------------------------------------------------------------------")
    print("DEMO CREDENTIALS:")
    print("Admin:       Phone: 9999999999 | Password: Admin@123")
    print("Operator:    Phone: 8888888888 | Password: Operator@123 (Dharwad)")
    print("Farmer 1:    Phone: 9876543210 | Password: Farmer@123 (Ramesh Patil - Kannada)")
    print("Farmer 2:    Phone: 9876543211 | Password: Farmer@123 (Suresh Kumar - Hindi)")
    print("Farmer 3:    Phone: 9876543212 | Password: Farmer@123 (Anil Gowda - English)")
    print("------------------------------------------------------------------")
    db.close()

if __name__ == "__main__":
    seed_database()
