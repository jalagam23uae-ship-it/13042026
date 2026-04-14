from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel


class TestOut(BaseModel):
    id: int
    title: str
    course_id: Optional[int] = None
    pass_mark: Optional[int] = None
    duration_min: Optional[int] = None
    is_active: Optional[bool] = None
    created_at: Optional[datetime] = None
    question_count: Optional[int] = None

    model_config = {"from_attributes": True}


class QuestionOut(BaseModel):
    id: int
    test_id: int
    body: str
    option_a: Optional[str] = None
    option_b: Optional[str] = None
    option_c: Optional[str] = None
    option_d: Optional[str] = None
    marks: Optional[int] = None

    model_config = {"from_attributes": True}


class AnswerSubmit(BaseModel):
    question_id: int
    chosen_opt: str


class TestSubmit(BaseModel):
    test_id: int
    answers: List[AnswerSubmit]


class TestResultOut(BaseModel):
    id: int
    user_id: int
    test_id: int
    score: int
    total_marks: int
    percentage: Optional[Decimal] = None
    passed: bool
    attempt_no: int
    taken_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class QuestionCreate(BaseModel):
    body: str
    option_a: Optional[str] = None
    option_b: Optional[str] = None
    option_c: Optional[str] = None
    option_d: Optional[str] = None
    correct_opt: str = "A"
    marks: int = 1


class TestCreate(BaseModel):
    title: str = "Untitled Test"
    course_id: Optional[int] = None
    pass_mark: int = 60
    duration_min: int = 30
    questions: List[QuestionCreate] = []
