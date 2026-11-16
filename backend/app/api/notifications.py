from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.notification import Notification
from app.models.user import User
from app.schemas.notification import NotificationResponse, NotificationMarkRead
from app.api.deps import get_current_user

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("/my", response_model=List[NotificationResponse])
def get_my_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    notifs = db.query(Notification).filter(
        Notification.user_id == current_user.id
    ).order_by(Notification.sent_at.desc()).limit(50).all()
    return notifs

@router.post("/mark-read")
def mark_notifications_read(
    payload: NotificationMarkRead,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if payload.notification_ids:
        db.query(Notification).filter(
            Notification.id.in_(payload.notification_ids),
            Notification.user_id == current_user.id
        ).update({"is_read": True}, synchronize_session=False)
    else:
        db.query(Notification).filter(
            Notification.user_id == current_user.id
        ).update({"is_read": True}, synchronize_session=False)
    db.commit()
    return {"status": "success"}
