from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from decimal import Decimal


class SessionCreate(BaseModel):
    title: str
    description: Optional[str] = None
    instructor: Optional[str] = None
    course_id: Optional[int] = None
    start_time: datetime
    end_time: datetime
    status: str = "upcoming"


class SessionUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    instructor: Optional[str] = None
    course_id: Optional[int] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    status: Optional[str] = None


class SessionOut(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    instructor: Optional[str] = None
    course_id: Optional[int] = None
    start_time: datetime
    end_time: datetime
    duration_hrs: Optional[Decimal] = None
    status: Optional[str] = None
    created_by: Optional[int] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
