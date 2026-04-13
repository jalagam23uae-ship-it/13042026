from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from app.database import get_db
from app.models.notification import Notification
from app.models.user import User
from app.schemas.notification import NotificationOut, NotificationCreate
from app.routers.deps import get_current_user, require_admin

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("/my", response_model=List[NotificationOut])
def my_notifications(db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    return db.query(Notification).filter(
        Notification.user_id == current.id
    ).order_by(Notification.created_at.desc()).limit(50).all()


@router.get("/unread-count")
def unread_count(db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    count = db.query(func.count(Notification.id)).filter(
        Notification.user_id == current.id, Notification.is_read == False
    ).scalar()
    return {"count": count}


@router.put("/{notification_id}/read")
def mark_read(notification_id: int, db: Session = Depends(get_db),
              current: User = Depends(get_current_user)):
    n = db.query(Notification).filter(
        Notification.id == notification_id, Notification.user_id == current.id
    ).first()
    if not n:
        raise HTTPException(status_code=404, detail="Notification not found")
    n.is_read = True
    db.commit()
    return {"message": "Marked as read"}


@router.put("/read-all")
def mark_all_read(db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    db.query(Notification).filter(
        Notification.user_id == current.id, Notification.is_read == False
    ).update({"is_read": True})
    db.commit()
    return {"message": "All notifications marked as read"}


@router.delete("/{notification_id}", status_code=204)
def delete_notification(notification_id: int, db: Session = Depends(get_db),
                        current: User = Depends(get_current_user)):
    n = db.query(Notification).filter(
        Notification.id == notification_id, Notification.user_id == current.id
    ).first()
    if not n:
        raise HTTPException(status_code=404, detail="Notification not found")
    db.delete(n); db.commit()


@router.post("/", response_model=NotificationOut)
def create_notification(body: NotificationCreate, db: Session = Depends(get_db),
                        _=Depends(require_admin)):
    n = Notification(**body.model_dump())
    db.add(n); db.commit(); db.refresh(n)
    return n


def send_notification(db: Session, user_id: int, title: str, message: str = "",
                      type: str = "info", link: str = None):
    """Helper to create notifications from other routers."""
    n = Notification(user_id=user_id, title=title, message=message, type=type, link=link)
    db.add(n)
    db.commit()
