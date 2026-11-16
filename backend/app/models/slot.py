from sqlalchemy import Column, Integer, Float, Boolean, Date, Time, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class Slot(Base):
    __tablename__ = "slots"

    id = Column(Integer, primary_key=True, index=True)
    centre_id = Column(Integer, ForeignKey("centres.id", ondelete="CASCADE"), nullable=False)
    slot_date = Column(Date, nullable=False, index=True)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    max_capacity_quintals = Column(Float, default=120.0, nullable=False)
    booked_capacity_quintals = Column(Float, default=0.0, nullable=False)
    is_active = Column(Boolean, default=True)

    # Relationships
    centre = relationship("Centre", back_populates="slots")
    bookings = relationship("Booking", back_populates="slot")

    @property
    def remaining_capacity(self) -> float:
        return max(0.0, self.max_capacity_quintals - self.booked_capacity_quintals)

    @property
    def load_percentage(self) -> float:
        if self.max_capacity_quintals <= 0:
            return 100.0
        return min(100.0, (self.booked_capacity_quintals / self.max_capacity_quintals) * 100.0)
