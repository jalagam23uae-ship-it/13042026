from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.user import User
from app.models.course import Course
from app.models.lesson import Lesson
from app.routers.deps import get_current_user

router = APIRouter(prefix="/search", tags=["Search"])


@router.get("/")
def search(
    q: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    """Global search across courses, lessons, and users (admin only for users)."""
    keyword = f"%{q}%"

    # Search courses by title, description, category, tags
    courses_query = db.query(Course).filter(
        (Course.title.ilike(keyword))
        | (Course.description.ilike(keyword))
        | (Course.category.ilike(keyword))
        | (Course.tags.ilike(keyword))
    ).all()

    course_results = []
    for c in courses_query:
        lesson_count = (
            db.query(func.count(Lesson.id))
            .filter(Lesson.course_id == c.id)
            .scalar()
            or 0
        )
        course_results.append({
            "id": c.id,
            "title": c.title,
            "description": c.description,
            "category": c.category,
            "lesson_count": lesson_count,
        })

    # Search lessons by title, description
    lessons_query = (
        db.query(Lesson, Course.title.label("course_title"))
        .join(Course, Course.id == Lesson.course_id)
        .filter(
            (Lesson.title.ilike(keyword))
            | (Lesson.description.ilike(keyword))
        )
        .all()
    )

    lesson_results = []
    for lesson, course_title in lessons_query:
        lesson_results.append({
            "id": lesson.id,
            "title": lesson.title,
            "description": lesson.description,
            "course_id": lesson.course_id,
            "course_title": course_title,
            "content_type": lesson.content_type,
        })

    # Search users by name, email (admin only)
    user_results = []
    if current.role == "admin":
        users_query = db.query(User).filter(
            (User.name.ilike(keyword))
            | (User.email.ilike(keyword))
        ).all()
        user_results = [
            {"id": u.id, "name": u.name, "email": u.email, "role": u.role}
            for u in users_query
        ]

    return {
        "courses": course_results,
        "lessons": lesson_results,
        "users": user_results,
    }
