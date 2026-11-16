import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class BookingStatus(str, enum.Enum):
    BOOKED = "BOOKED"
    CHECKED_IN = "CHECKED_IN"
    IN_PROGRESS = "IN_PROGRESS"
    PROCURED = "PROCURED"
    PAYMENT_PENDING = "PAYMENT_PENDING"
    PAID = "PAID"
    CANCELLED = "CANCELLED"
    NO_SHOW = "NO_SHOW"

class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    booking_code = Column(String(20), unique=True, index=True, nullable=False)
    farmer_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    centre_id = Column(Integer, ForeignKey("centres.id", ondelete="CASCADE"), nullable=False)
    slot_id = Column(Integer, ForeignKey("slots.id", ondelete="CASCADE"), nullable=False)
    crop_id = Column(Integer, ForeignKey("crops.id"), nullable=False)
    
    estimated_quantity_quintals = Column(Float, nullable=False)
    status = Column(Enum(BookingStatus), default=BookingStatus.BOOKED, nullable=False, index=True)
    
    # Live Queue fields
    token_number = Column(Integer, nullable=True) # Daily serial sequence assigned at check-in (e.g. 101, 102)
    assigned_counter = Column(Integer, nullable=True) # Counter number when called
    check_in_time = Column(DateTime, nullable=True)
    called_time = Column(DateTime, nullable=True)
    completed_time = Column(DateTime, nullable=True)
    estimated_wait_minutes = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    farmer = relationship("User", back_populates="bookings")
    centre = relationship("Centre", back_populates="bookings")
    slot = relationship("Slot", back_populates="bookings")
    crop = relationship("Crop", back_populates="bookings")
    procurement = relationship("Procurement", back_populates="booking", uselist=False, cascade="all, delete-orphan")
