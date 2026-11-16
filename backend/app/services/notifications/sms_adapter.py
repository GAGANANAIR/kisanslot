import logging
import requests
from sqlalchemy.orm import Session
from app.config import settings
from app.services.notifications.base import BaseNotificationAdapter
from app.services.notifications.inapp_logger import InAppAndMockSMSAdapter

logger = logging.getLogger("KisanSlot.SMSAdapter")

class PluggableSMSAdapter(BaseNotificationAdapter):
    """
    Pluggable SMS Adapter supporting Twilio, Fast2SMS, or falling back
    to InAppAndMockSMSAdapter when credentials are not configured.
    """
    def __init__(self):
        self.mock_adapter = InAppAndMockSMSAdapter()

    def send_notification(
        self,
        db: Session,
        user_id: int,
        phone: str,
        event_type: str,
        message: str,
        channel: str = "SMS"
    ) -> bool:
        # First ensure in-app notification is recorded
        self.mock_adapter.send_notification(
            db=db,
            user_id=user_id,
            phone=phone,
            event_type=event_type,
            message=message,
            channel="IN_APP"
        )

        # Then attempt external SMS dispatch if provider is set
        provider = settings.NOTIFICATION_PROVIDER.lower()
        if provider == "twilio" and settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN:
            return self._send_twilio(phone, message)
        elif provider == "fast2sms" and settings.FAST2SMS_API_KEY:
            return self._send_fast2sms(phone, message)
        else:
            # Standard simulated SMS log
            logger.info(f"[SMS SIMULATED] Provider '{provider}' not configured with live API keys. Message logged to DB and console.")
            return True

    def _send_twilio(self, phone: str, message: str) -> bool:
        try:
            url = f"https://api.twilio.com/2010-04-01/Accounts/{settings.TWILIO_ACCOUNT_SID}/Messages.json"
            data = {
                "From": settings.TWILIO_FROM_NUMBER,
                "To": phone if phone.startswith("+") else f"+91{phone}",
                "Body": message
            }
            res = requests.post(
                url,
                data=data,
                auth=(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN),
                timeout=5
            )
            logger.info(f"Twilio SMS sent to {phone}: status {res.status_code}")
            return res.status_code in (200, 201)
        except Exception as e:
            logger.error(f"Twilio SMS dispatch failed: {e}")
            return False

    def _send_fast2sms(self, phone: str, message: str) -> bool:
        try:
            url = "https://www.fast2sms.com/dev/bulkV2"
            headers = {"authorization": settings.FAST2SMS_API_KEY}
            payload = {
                "route": "q",
                "message": message,
                "language": "english",
                "numbers": phone.replace("+91", "")
            }
            res = requests.post(url, data=payload, headers=headers, timeout=5)
            logger.info(f"Fast2SMS dispatched to {phone}: status {res.status_code}")
            return res.status_code == 200
        except Exception as e:
            logger.error(f"Fast2SMS dispatch failed: {e}")
            return False
