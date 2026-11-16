from sqlalchemy import Column, Integer, String, Float, Boolean, Table, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

# Association table for Centre <-> Crop
centre_crops = Table(
    "centre_crops",
    Base.metadata,
    Column("centre_id", Integer, ForeignKey("centres.id", ondelete="CASCADE"), primary_key=True),
    Column("crop_id", Integer, ForeignKey("crops.id", ondelete="CASCADE"), primary_key=True),
)

class Centre(Base):
    __tablename__ = "centres"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    district = Column(String(100), nullable=False)
    state = Column(String(100), nullable=False)
    address = Column(String(255), nullable=True)
    counters_count = Column(Integer, default=3, nullable=False)
    daily_capacity_quintals = Column(Float, default=1000.0, nullable=False)
    operating_hours_start = Column(String(5), default="08:00") # "HH:MM"
    operating_hours_end = Column(String(5), default="17:00")   # "HH:MM"
    is_active = Column(Boolean, default=True)

    # Relationships
    accepted_crops = relationship("Crop", secondary=centre_crops, backref="centres")
    slots = relationship("Slot", back_populates="centre", cascade="all, delete-orphan")
    bookings = relationship("Booking", back_populates="centre")
    procurements = relationship("Procurement", back_populates="centre")
