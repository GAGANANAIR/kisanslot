from app.config import settings
from app.services.notifications.base import BaseNotificationAdapter
from app.services.notifications.inapp_logger import InAppAndMockSMSAdapter
from app.services.notifications.sms_adapter import PluggableSMSAdapter

def get_notification_service() -> BaseNotificationAdapter:
    if settings.NOTIFICATION_PROVIDER.lower() in ("twilio", "fast2sms"):
        return PluggableSMSAdapter()
    return InAppAndMockSMSAdapter()

notification_service = get_notification_service()
