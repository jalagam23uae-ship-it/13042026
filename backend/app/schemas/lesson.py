from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class LessonOut(BaseModel):
    id: int
    course_id: int
    title: str
    description: Optional[str] = None
    video_url: Optional[str] = None
    content_type: str = "video"
    duration_min: int = 0
    sort_order: int = 0
    is_free: bool = False
    attachment_url: Optional[str] = None
    attachment_name: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class LessonCreate(BaseModel):
    course_id: int
    title: str
    description: Optional[str] = None
    video_url: Optional[str] = None
    content_type: str = "video"
    duration_min: int = 0
    sort_order: int = 0
    is_free: bool = False
    attachment_url: Optional[str] = None
    attachment_name: Optional[str] = None
    section_id: Optional[int] = None


class LessonUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    video_url: Optional[str] = None
    content_type: Optional[str] = None
    duration_min: Optional[int] = None
    sort_order: Optional[int] = None
    is_free: Optional[bool] = None
    attachment_url: Optional[str] = None
    attachment_name: Optional[str] = None
    section_id: Optional[int] = None


class LessonProgressOut(BaseModel):
    id: int
    user_id: int
    lesson_id: int
    completed: bool = False
    progress_pct: int = 0
    last_position: int = 0
    completed_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ProgressUpdate(BaseModel):
    lesson_id: int
    progress_pct: int = 0
    last_position: int = 0
    completed: bool = False
