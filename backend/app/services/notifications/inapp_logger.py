import logging
from datetime import datetime
from sqlalchemy.orm import Session
from app.services.notifications.base import BaseNotificationAdapter
from app.models.notification import Notification, NotificationChannel

logger = logging.getLogger("KisanSlot.Notification")
logging.basicConfig(level=logging.INFO)

class InAppAndMockSMSAdapter(BaseNotificationAdapter):
    def send_notification(
        self,
        db: Session,
        user_id: int,
        phone: str,
        event_type: str,
        message: str,
        channel: str = "IN_APP"
    ) -> bool:
        # 1. Always persist an in-app notification in DB
        db_channel = NotificationChannel.SMS if channel == "SMS" else NotificationChannel.IN_APP
        notif = Notification(
            user_id=user_id,
            channel=db_channel,
            event_type=event_type,
            message=message,
            is_read=False,
            sent_at=datetime.utcnow()
        )
        db.add(notif)
        db.commit()

        # 2. Mock SMS logging
        border = "=" * 60
        logger.info(f"\n{border}\n[SMS DISPATCH MOCK]\nTo: {phone} (User #{user_id})\nType: {event_type}\nMessage: {message}\nTimestamp: {datetime.utcnow().isoformat()}\n{border}")
        return True
