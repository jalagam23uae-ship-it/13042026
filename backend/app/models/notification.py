from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, func
from app.database import Base


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(200), nullable=False)
    message = Column(Text)
    type = Column(String(30), server_default="info")  # info, success, warning, reminder
    is_read = Column(Boolean, server_default="false")
    link = Column(String(200))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
