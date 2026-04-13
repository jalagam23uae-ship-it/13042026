from sqlalchemy import Column, Integer, SmallInteger, Text, DateTime, ForeignKey, func
from app.database import Base


class Feedback(Base):
    __tablename__ = "feedback"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=False)
    overall_rating = Column(SmallInteger)
    instructor_rating = Column(SmallInteger)
    content_rating = Column(SmallInteger)
    pace_rating = Column(SmallInteger)
    comments = Column(Text)
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())
