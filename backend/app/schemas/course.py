from typing import List, Optional

from pydantic import BaseModel, ConfigDict


class CourseCreate(BaseModel):
    """Body for POST /enrollments/admin/courses.

    Extra fields the frontend may send (e.g. `certificate_enabled`) are ignored
    silently — matches the pre-refactor `body.get(...)` behavior.
    """

    model_config = ConfigDict(extra="ignore")

    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    thumbnail_url: Optional[str] = None
    is_active: Optional[bool] = None
    tags: Optional[List[str]] = None
    learning_outcomes: Optional[List[str]] = None
    requirements: Optional[List[str]] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    has_certificate: bool = True
    total_hours: float = 0
    total_articles: int = 0
    total_exercises: int = 0
    total_resources: int = 0


class CourseUpdate(BaseModel):
    """Body for PUT /enrollments/admin/courses/{course_id}."""

    model_config = ConfigDict(extra="ignore")

    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    thumbnail_url: Optional[str] = None
    is_active: Optional[bool] = None
    tags: Optional[List[str]] = None
    learning_outcomes: Optional[List[str]] = None
    requirements: Optional[List[str]] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    has_certificate: Optional[bool] = None
    total_hours: Optional[float] = None
    total_articles: Optional[int] = None
    total_exercises: Optional[int] = None
    total_resources: Optional[int] = None


class CourseOut(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    is_active: Optional[bool] = None
    approval_submitted: Optional[bool] = None

    model_config = ConfigDict(from_attributes=True)
