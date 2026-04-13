from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class DiscussionCreate(BaseModel):
    lesson_id: int
    content: str
    parent_id: Optional[int] = None

class DiscussionOut(BaseModel):
    id: int
    lesson_id: int
    user_id: int
    parent_id: Optional[int] = None
    content: str
    is_answer: bool = False
    created_at: Optional[datetime] = None
    author_name: Optional[str] = None
    replies: Optional[List["DiscussionOut"]] = []
    model_config = {"from_attributes": True}
