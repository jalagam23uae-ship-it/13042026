from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, func
from app.database import Base


class LearningPath(Base):
    __tablename__ = "learning_paths"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    thumbnail_url = Column(String(500))
    is_active = Column(Boolean, server_default="true")
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class LearningPathCourse(Base):
    __tablename__ = "learning_path_courses"

    id = Column(Integer, primary_key=True, index=True)
    path_id = Column(Integer, ForeignKey("learning_paths.id"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    sort_order = Column(Integer, server_default="0")


class LearningPathEnrollment(Base):
    __tablename__ = "learning_path_enrollments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    path_id = Column(Integer, ForeignKey("learning_paths.id"), nullable=False)
    enrolled_at = Column(DateTime(timezone=True), server_default=func.now())
