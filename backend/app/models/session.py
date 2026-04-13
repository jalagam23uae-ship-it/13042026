from sqlalchemy import Column, Integer, String, Text, DateTime, Numeric, ForeignKey, func
from app.database import Base


class Session(Base):
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    instructor = Column(String(100))
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=True)
    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True), nullable=False)
    duration_hrs = Column(Numeric(4, 2))
    status = Column(String(20), server_default="upcoming")
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
