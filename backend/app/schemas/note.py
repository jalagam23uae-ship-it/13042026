from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class NoteCreate(BaseModel):
    lesson_id: int
    content: str
    video_timestamp: int = 0
    is_bookmark: bool = False

class NoteUpdate(BaseModel):
    content: Optional[str] = None
    video_timestamp: Optional[int] = None
    is_bookmark: Optional[bool] = None

class NoteOut(BaseModel):
    id: int
    user_id: int
    lesson_id: int
    content: str
    video_timestamp: int = 0
    is_bookmark: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    model_config = {"from_attributes": True}
