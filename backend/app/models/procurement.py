from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class Procurement(Base):
    __tablename__ = "procurements"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id", ondelete="CASCADE"), unique=True, nullable=False)
    centre_id = Column(Integer, ForeignKey("centres.id"), nullable=False)
    crop_id = Column(Integer, ForeignKey("crops.id"), nullable=False)
    operator_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    final_quantity_quintals = Column(Float, nullable=False)
    moisture_percentage = Column(Float, default=12.0)
    quality_grade = Column(String(50), default="Grade A") # Grade A, Grade B, Standard
    rate_applied = Column(Float, nullable=False)           # Rate per quintal applied
    total_amount = Column(Float, nullable=False)           # final_quantity * rate_applied
    remarks = Column(String(255), nullable=True)
    procured_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    booking = relationship("Booking", back_populates="procurement")
    centre = relationship("Centre", back_populates="procurements")
    crop = relationship("Crop", back_populates="procurements")
    operator = relationship("User")
    payment = relationship("Payment", back_populates="procurement", uselist=False, cascade="all, delete-orphan")
