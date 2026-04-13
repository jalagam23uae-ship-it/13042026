from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class LearningPathCreate(BaseModel):
    title: str
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    course_ids: List[int] = []

class LearningPathOut(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    is_active: bool = True
    created_at: Optional[datetime] = None
    courses: list = []
    model_config = {"from_attributes": True}
