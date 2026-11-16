from sqlalchemy import Column, Integer, String, Float
from sqlalchemy.orm import relationship
from app.database import Base

class Crop(Base):
    __tablename__ = "crops"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    local_name = Column(String(100), nullable=True)  # Hindi/Kannada common name (e.g., "गेहूं / ಗೋಧಿ")
    category = Column(String(50), default="Cereal") # Cereal, Pulses, Oilseeds
    msp_rate = Column(Float, nullable=False)        # Minimum Support Price per quintal (₹)
    unit_handling_time_min = Column(Integer, default=5) # Minutes handling time per 10 quintals
    moisture_standard_pct = Column(Float, default=12.0) # Standard moisture limit %

    # Relationships
    bookings = relationship("Booking", back_populates="crop")
    procurements = relationship("Procurement", back_populates="crop")
