from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class NotificationOut(BaseModel):
    id: int
    user_id: int
    title: str
    message: Optional[str] = None
    type: str = "info"
    is_read: bool = False
    link: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class NotificationCreate(BaseModel):
    user_id: int
    title: str
    message: Optional[str] = None
    type: str = "info"
    link: Optional[str] = None
