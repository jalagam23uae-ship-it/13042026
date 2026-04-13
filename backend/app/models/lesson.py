from sqlalchemy import (
    Column, Integer, String, Text, Boolean, DateTime, Numeric,
    ForeignKey, UniqueConstraint, func,
)
from app.database import Base


class Section(Base):
    __tablename__ = "sections"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    title = Column(String(300), nullable=False)
    sort_order = Column(Integer, server_default="0")


class Lesson(Base):
    __tablename__ = "lessons"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    section_id = Column(Integer, ForeignKey("sections.id"), nullable=True)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    video_url = Column(String(500))
    content_type = Column(String(30), server_default="video")  # video, article, quiz
    duration_min = Column(Integer, server_default="0")
    sort_order = Column(Integer, server_default="0")
    is_free = Column(Boolean, server_default="false")
    attachment_url = Column(String(500))
    attachment_name = Column(String(200))
    unlock_after_lesson_id = Column(Integer, ForeignKey("lessons.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class LessonProgress(Base):
    __tablename__ = "lesson_progress"
    __table_args__ = (UniqueConstraint("user_id", "lesson_id"),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    lesson_id = Column(Integer, ForeignKey("lessons.id"), nullable=False)
    completed = Column(Boolean, server_default="false")
    progress_pct = Column(Integer, server_default="0")
    last_position = Column(Integer, server_default="0")  # video position in seconds
    completed_at = Column(DateTime(timezone=True))
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
