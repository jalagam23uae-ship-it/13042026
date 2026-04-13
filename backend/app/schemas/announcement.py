from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class AnnouncementCreate(BaseModel):
    title: str
    content: str
    course_id: Optional[int] = None
    is_pinned: bool = False

class AnnouncementOut(BaseModel):
    id: int
    title: str
    content: str
    author_id: int
    course_id: Optional[int] = None
    is_pinned: bool = False
    created_at: Optional[datetime] = None
    author_name: Optional[str] = None
    course_title: Optional[str] = None
    model_config = {"from_attributes": True}
