from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime


class FeedbackCreate(BaseModel):
    session_id: int
    overall_rating: int
    instructor_rating: int
    content_rating: int
    pace_rating: int
    comments: Optional[str] = None

    @field_validator("overall_rating", "instructor_rating", "content_rating", "pace_rating")
    @classmethod
    def rating_range(cls, v):
        if v < 1 or v > 5:
            raise ValueError("Rating must be between 1 and 5")
        return v


class FeedbackOut(BaseModel):
    id: int
    user_id: int
    session_id: int
    overall_rating: Optional[int] = None
    instructor_rating: Optional[int] = None
    content_rating: Optional[int] = None
    pace_rating: Optional[int] = None
    comments: Optional[str] = None
    submitted_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
