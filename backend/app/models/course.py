from sqlalchemy import Column, Integer, String, Boolean, Text, DateTime, ForeignKey, Numeric, func
from app.database import Base


class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    total_sessions = Column(Integer, server_default="0")
    category = Column(String(50))
    thumbnail_url = Column(String(500))
    is_active = Column(Boolean, server_default="true")
    prerequisite_id = Column(Integer, ForeignKey("courses.id"), nullable=True)
    learning_outcomes = Column(Text)       # JSON array
    requirements = Column(Text)            # JSON array
    tags = Column(String(500))             # Comma-separated
    total_hours = Column(Numeric(5, 1), server_default="0")
    total_articles = Column(Integer, server_default="0")
    total_exercises = Column(Integer, server_default="0")
    total_resources = Column(Integer, server_default="0")
    has_certificate = Column(Boolean, server_default="true")
    start_date = Column(DateTime(timezone=True))
    end_date = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
