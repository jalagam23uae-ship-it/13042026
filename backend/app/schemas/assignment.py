from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class AssignmentCreate(BaseModel):
    course_id: int
    title: str
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    max_score: int = 100
    file_url: Optional[str] = None
    file_name: Optional[str] = None

class AssignmentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    max_score: Optional[int] = None
    is_active: Optional[bool] = None
    file_url: Optional[str] = None
    file_name: Optional[str] = None

class AssignmentOut(BaseModel):
    id: int
    course_id: int
    title: str
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    max_score: int = 100
    is_active: bool = True
    file_url: Optional[str] = None
    file_name: Optional[str] = None
    created_at: Optional[datetime] = None
    model_config = {"from_attributes": True}

class SubmissionCreate(BaseModel):
    assignment_id: int
    file_url: Optional[str] = None
    comments: Optional[str] = None

class GradeSubmission(BaseModel):
    score: int
    feedback: Optional[str] = None

class SubmissionOut(BaseModel):
    id: int
    assignment_id: int
    user_id: int
    file_url: Optional[str] = None
    comments: Optional[str] = None
    score: Optional[int] = None
    graded: bool = False
    feedback: Optional[str] = None
    submitted_at: Optional[datetime] = None
    graded_at: Optional[datetime] = None
    student_name: Optional[str] = None
    model_config = {"from_attributes": True}
