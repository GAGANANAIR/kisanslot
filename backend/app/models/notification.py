import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base

class NotificationChannel(str, enum.Enum):
    IN_APP = "IN_APP"
    SMS = "SMS"

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    channel = Column(Enum(NotificationChannel), default=NotificationChannel.IN_APP, nullable=False)
    event_type = Column(String(50), nullable=False) # BOOKING_CONFIRMED, REMINDER, QUEUE_POSITION, COUNTER_CALLED, PROCURED, PAYMENT_RELEASED
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    sent_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="notifications")
