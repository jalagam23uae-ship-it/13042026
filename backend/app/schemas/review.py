from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime

class ReviewCreate(BaseModel):
    course_id: int
    rating: int
    comment: Optional[str] = None

    @field_validator("rating")
    @classmethod
    def rating_range(cls, v):
        if v < 1 or v > 5:
            raise ValueError("Rating must be 1-5")
        return v

class ReviewOut(BaseModel):
    id: int
    user_id: int
    course_id: int
    rating: int
    comment: Optional[str] = None
    created_at: Optional[datetime] = None
    author_name: Optional[str] = None
    model_config = {"from_attributes": True}
