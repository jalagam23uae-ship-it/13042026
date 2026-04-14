from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class EnrollmentCreate(BaseModel):
    course_id: int


class EnrollmentOut(BaseModel):
    id: int
    user_id: int
    course_id: int
    enrolled_at: Optional[datetime] = None
    completed: bool = False
    course_title: Optional[str] = None
    is_active: bool = True

    model_config = {"from_attributes": True}


class BulkEnrollRequest(BaseModel):
    course_id: int
    user_ids: List[int]
