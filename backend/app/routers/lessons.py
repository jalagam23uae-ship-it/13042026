from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from datetime import datetime, timezone
from app.database import get_db
from app.models.lesson import Lesson, LessonProgress, Section
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.user import User
from app.schemas.lesson import (
    LessonOut, LessonCreate, LessonUpdate,
    LessonProgressOut, ProgressUpdate,
)
from app.routers.deps import get_current_user, require_admin, require_admin_or_instructor

router = APIRouter(prefix="/lessons", tags=["Lessons"])


@router.get("/course/{course_id}")
def get_course_lessons(course_id: int, db: Session = Depends(get_db),
                       current: User = Depends(get_current_user)):
    """Get all lessons for a course with user's progress."""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # Block student access if course has ended (admin/instructor can still access)
    if current.role == "student":
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)
        if course.end_date and course.end_date < now:
            raise HTTPException(status_code=403, detail=f"This course ended on {course.end_date.strftime('%B %d, %Y')} and is no longer accessible")
        if course.start_date and course.start_date > now:
            raise HTTPException(status_code=403, detail=f"This course starts on {course.start_date.strftime('%B %d, %Y')}")

    lessons = db.query(Lesson).filter(
        Lesson.course_id == course_id
    ).order_by(Lesson.sort_order, Lesson.id).all()

    # Get user's progress for these lessons
    progress_map = {}
    if lessons:
        lesson_ids = [l.id for l in lessons]
        progress = db.query(LessonProgress).filter(
            LessonProgress.user_id == current.id,
            LessonProgress.lesson_id.in_(lesson_ids),
        ).all()
        progress_map = {p.lesson_id: p for p in progress}

    total = len(lessons)
    completed = sum(1 for l in lessons if progress_map.get(l.id) and progress_map[l.id].completed)

    result = []
    for l in lessons:
        p = progress_map.get(l.id)
        result.append({
            "id": l.id,
            "course_id": l.course_id,
            "section_id": l.section_id,
            "title": l.title,
            "description": l.description,
            "video_url": l.video_url,
            "content_type": l.content_type,
            "duration_min": l.duration_min,
            "sort_order": l.sort_order,
            "is_free": l.is_free,
            "attachment_url": l.attachment_url,
            "attachment_name": l.attachment_name,
            "completed": p.completed if p else False,
            "progress_pct": p.progress_pct if p else 0,
            "last_position": p.last_position if p else 0,
        })

    # Get sections
    sections = db.query(Section).filter(
        Section.course_id == course_id
    ).order_by(Section.sort_order, Section.id).all()
    sections_list = [{"id": s.id, "title": s.title, "sort_order": s.sort_order} for s in sections]

    return {
        "course": {
            "id": course.id,
            "title": course.title,
            "description": course.description,
        },
        "total_lessons": total,
        "completed_lessons": completed,
        "completion_pct": round(completed / total * 100) if total > 0 else 0,
        "sections": sections_list,
        "lessons": result,
    }


@router.post("/progress")
def update_progress(body: ProgressUpdate, db: Session = Depends(get_db),
                    current: User = Depends(get_current_user)):
    """Update lesson progress (video position, completion)."""
    lesson = db.query(Lesson).filter(Lesson.id == body.lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    progress = db.query(LessonProgress).filter(
        LessonProgress.user_id == current.id,
        LessonProgress.lesson_id == body.lesson_id,
    ).first()

    if not progress:
        progress = LessonProgress(
            user_id=current.id,
            lesson_id=body.lesson_id,
        )
        db.add(progress)

    progress.progress_pct = body.progress_pct
    progress.last_position = body.last_position
    if body.completed and not progress.completed:
        progress.completed = True
        progress.completed_at = datetime.now(timezone.utc)
        progress.progress_pct = 100

    db.commit(); db.refresh(progress)

    # Auto-complete enrollment if all lessons done
    lesson = db.query(Lesson).filter(Lesson.id == body.lesson_id).first()
    if lesson and body.completed:
        _check_course_completion(db, current.id, lesson.course_id)

    return LessonProgressOut.model_validate(progress)


@router.post("/complete/{lesson_id}")
def mark_complete(lesson_id: int, db: Session = Depends(get_db),
                  current: User = Depends(get_current_user)):
    """Mark a lesson as completed."""
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    progress = db.query(LessonProgress).filter(
        LessonProgress.user_id == current.id,
        LessonProgress.lesson_id == lesson_id,
    ).first()

    if not progress:
        progress = LessonProgress(
            user_id=current.id,
            lesson_id=lesson_id,
        )
        db.add(progress)

    progress.completed = True
    progress.progress_pct = 100
    progress.completed_at = datetime.now(timezone.utc)
    db.commit(); db.refresh(progress)

    # Auto-complete enrollment if all lessons are done
    _check_course_completion(db, current.id, lesson.course_id)

    return {"message": "Lesson marked as complete"}


def _check_course_completion(db: Session, user_id: int, course_id: int):
    """If all lessons in a course are completed, auto-mark enrollment as completed."""
    total = db.query(func.count(Lesson.id)).filter(Lesson.course_id == course_id).scalar() or 0
    if total == 0:
        return
    completed = db.query(func.count(LessonProgress.id)).join(
        Lesson, Lesson.id == LessonProgress.lesson_id
    ).filter(
        Lesson.course_id == course_id,
        LessonProgress.user_id == user_id,
        LessonProgress.completed == True,
    ).scalar() or 0

    if completed >= total:
        enrollment = db.query(Enrollment).filter(
            Enrollment.user_id == user_id,
            Enrollment.course_id == course_id,
        ).first()
        if enrollment and not enrollment.completed:
            enrollment.completed = True
            enrollment.completed_at = datetime.now(timezone.utc)
            db.commit()
            # Send notification
            from app.routers.notifications import send_notification
            from app.models.course import Course
            course = db.query(Course).filter(Course.id == course_id).first()
            send_notification(
                db, user_id,
                title="Course Completed!",
                message=f"Congratulations! You've completed all lessons in '{course.title if course else 'the course'}'.",
                type="success",
                link="/certificates",
            )


# ── Admin endpoints ────────────────────────────────────────────────

@router.post("/", response_model=LessonOut, status_code=201)
def create_lesson(body: LessonCreate, db: Session = Depends(get_db),
                  _=Depends(require_admin_or_instructor)):
    course = db.query(Course).filter(Course.id == body.course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    lesson = Lesson(**body.model_dump())
    db.add(lesson); db.commit(); db.refresh(lesson)
    return lesson


@router.put("/{lesson_id}", response_model=LessonOut)
def update_lesson(lesson_id: int, body: LessonUpdate, db: Session = Depends(get_db),
                  _=Depends(require_admin_or_instructor)):
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(lesson, k, v)
    db.commit(); db.refresh(lesson)
    return lesson


@router.delete("/{lesson_id}", status_code=204)
def delete_lesson(lesson_id: int, db: Session = Depends(get_db),
                  _=Depends(require_admin_or_instructor)):
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    db.delete(lesson); db.commit()


# ── Section CRUD ──────────────────────────────────────────────────

@router.post("/sections", status_code=201)
def create_section(body: dict, db: Session = Depends(get_db),
                   _=Depends(require_admin_or_instructor)):
    course = db.query(Course).filter(Course.id == body.get("course_id")).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    section = Section(
        course_id=body["course_id"],
        title=body.get("title", "Untitled Section"),
        sort_order=body.get("sort_order", 0),
    )
    db.add(section); db.commit(); db.refresh(section)
    return {"id": section.id, "title": section.title, "sort_order": section.sort_order, "course_id": section.course_id}


@router.put("/sections/{section_id}")
def update_section(section_id: int, body: dict, db: Session = Depends(get_db),
                   _=Depends(require_admin_or_instructor)):
    section = db.query(Section).filter(Section.id == section_id).first()
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")
    if "title" in body:
        section.title = body["title"]
    if "sort_order" in body:
        section.sort_order = body["sort_order"]
    db.commit(); db.refresh(section)
    return {"id": section.id, "title": section.title, "sort_order": section.sort_order}


@router.delete("/sections/{section_id}", status_code=204)
def delete_section(section_id: int, db: Session = Depends(get_db),
                   _=Depends(require_admin_or_instructor)):
    section = db.query(Section).filter(Section.id == section_id).first()
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")
    # Unlink lessons (set section_id to null, don't delete them)
    db.query(Lesson).filter(Lesson.section_id == section_id).update(
        {Lesson.section_id: None}, synchronize_session=False)
    db.delete(section); db.commit()
