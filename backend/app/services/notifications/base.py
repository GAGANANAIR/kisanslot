from abc import ABC, abstractmethod
from typing import Optional
from sqlalchemy.orm import Session

class BaseNotificationAdapter(ABC):
    @abstractmethod
    def send_notification(
        self,
        db: Session,
        user_id: int,
        phone: str,
        event_type: str,
        message: str,
        channel: str = "IN_APP"
    ) -> bool:
        """
        Dispatches notification to user.
        """
        pass
