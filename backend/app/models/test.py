from sqlalchemy import (
    Column, Integer, String, Boolean, Text, DateTime, Numeric,
    SmallInteger, ForeignKey, func,
)
from app.database import Base


class Test(Base):
    __tablename__ = "tests"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=True)
    pass_mark = Column(Integer, server_default="60")
    duration_min = Column(Integer, server_default="30")
    is_active = Column(Boolean, server_default="true")
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    test_id = Column(Integer, ForeignKey("tests.id"), nullable=False)
    body = Column(Text, nullable=False)
    option_a = Column(String(300))
    option_b = Column(String(300))
    option_c = Column(String(300))
    option_d = Column(String(300))
    correct_opt = Column(String(1))
    marks = Column(Integer, server_default="1")


class TestResult(Base):
    __tablename__ = "test_results"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    test_id = Column(Integer, ForeignKey("tests.id"), nullable=False)
    score = Column(Integer, server_default="0")
    total_marks = Column(Integer, server_default="0")
    percentage = Column(Numeric(5, 2), server_default="0")
    passed = Column(Boolean, server_default="false")
    attempt_no = Column(Integer, server_default="1")
    taken_at = Column(DateTime(timezone=True), server_default=func.now())
    answers = Column(Text)


class UserAnswer(Base):
    __tablename__ = "user_answers"

    id = Column(Integer, primary_key=True, index=True)
    result_id = Column(Integer, ForeignKey("test_results.id"), nullable=False)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    chosen_opt = Column(String(1))
    is_correct = Column(Boolean, server_default="false")
