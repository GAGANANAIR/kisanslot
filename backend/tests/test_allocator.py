import pytest
from datetime import date, time
from app.database import SessionLocal, Base, engine
from app.models import Centre, Crop, Slot, Booking, BookingStatus, User, UserRole, LanguagePreference
from app.services.allocator import SlotAllocationService

@pytest.fixture(scope="module")
def db_session():
    Base.metadata.create_all(bind=engine)
    session = SessionLocal()
    yield session
    session.close()

def test_service_duration_calculation(db_session):
    crop = Crop(name="Test Wheat", msp_rate=2275.0, unit_handling_time_min=4)
    duration_small = SlotAllocationService.calculate_service_duration(crop, 10.0) # 10 Q
    duration_large = SlotAllocationService.calculate_service_duration(crop, 80.0) # 80 Q
    
    assert duration_small >= 10
    assert duration_large > duration_small
    assert duration_large <= 60

def test_no_overbooking_guarantee(db_session):
    today = date.today()
    centre = db_session.query(Centre).first()
    crop = db_session.query(Crop).first()
    
    # Requesting quantity larger than slot max capacity
    huge_quantity = 5000.0
    recommendations = SlotAllocationService.recommend_slots(
        db=db_session,
        centre_id=centre.id,
        crop_id=crop.id,
        quantity_quintals=huge_quantity,
        preferred_date=today
    )
    # Should recommend ZERO slots because none have 5000 Q capacity
    assert len(recommendations) == 0

def test_smart_load_balancing_ranking(db_session):
    today = date.today()
    centre = db_session.query(Centre).first()
    crop = db_session.query(Crop).first()

    recommendations = SlotAllocationService.recommend_slots(
        db=db_session,
        centre_id=centre.id,
        crop_id=crop.id,
        quantity_quintals=20.0,
        preferred_date=today
    )
    assert len(recommendations) > 0
    # The first recommended slot must have the lowest or equal load percentage compared to subsequent
    for i in range(len(recommendations) - 1):
        assert recommendations[i]["load_percentage"] <= recommendations[i+1]["load_percentage"]
