from sqlalchemy import Column, Integer, String, DateTime, Numeric, ForeignKey, func
from app.database import Base


class UserLoginSession(Base):
    __tablename__ = "user_login_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    login_at = Column(DateTime(timezone=True), server_default=func.now())
    logout_at = Column(DateTime(timezone=True))
    duration_minutes = Column(Numeric(8, 2), server_default="0")
    ip_address = Column(String(50))


class CourseViewTime(Base):
    __tablename__ = "course_view_times"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    lesson_id = Column(Integer, ForeignKey("lessons.id"), nullable=True)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    ended_at = Column(DateTime(timezone=True))
    duration_minutes = Column(Numeric(8, 2), server_default="0")
