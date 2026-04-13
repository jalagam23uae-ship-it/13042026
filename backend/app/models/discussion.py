from sqlalchemy import Column, Integer, Text, DateTime, ForeignKey, Boolean, func
from app.database import Base

class Discussion(Base):
    __tablename__ = "discussions"
    id = Column(Integer, primary_key=True, index=True)
    lesson_id = Column(Integer, ForeignKey("lessons.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    parent_id = Column(Integer, ForeignKey("discussions.id"), nullable=True)  # for replies
    content = Column(Text, nullable=False)
    is_answer = Column(Boolean, server_default="false")  # marked as answer by instructor/admin
    created_at = Column(DateTime(timezone=True), server_default=func.now())
