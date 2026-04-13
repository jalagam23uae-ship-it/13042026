from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class EnrollmentCreate(BaseModel):
    course_id: int


class EnrollmentOut(BaseModel):
    id: int
    user_id: int
    course_id: int
    enrolled_at: Optional[datetime] = None
    completed: bool = False
    course_title: Optional[str] = None

    model_config = {"from_attributes": True}
