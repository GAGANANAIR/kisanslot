from datetime import datetime
from pydantic import BaseModel
from app.models.notification import NotificationChannel

class NotificationResponse(BaseModel):
    id: int
    user_id: int
    channel: NotificationChannel
    event_type: str
    message: str
    is_read: bool
    sent_at: datetime

    class Config:
        from_attributes = True

class NotificationMarkRead(BaseModel):
    notification_ids: list[int] = []
