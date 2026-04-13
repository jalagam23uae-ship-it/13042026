from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from app.database import get_db
from app.models.enrollment import Enrollment
from app.models.course import Course
from app.models.user import User
from app.schemas.enrollment import EnrollmentCreate, EnrollmentOut
from app.routers.deps import get_current_user, require_admin, require_admin_or_instructor

router = APIRouter(prefix="/enrollments", tags=["Enrollments"])


def _enrich(db: Session, rows):
    from app.models.lesson import Lesson, LessonProgress

    cids = {e.course_id for e in rows}
    titles = {c.id: c.title for c in db.query(Course).filter(Course.id.in_(cids)).all()} if cids else {}
    out = []
    for e in rows:
        d = EnrollmentOut.model_validate(e).model_dump()
        d["course_title"] = titles.get(e.course_id, f"Course #{e.course_id}")

        # Calculate completion percentage
        total_lessons = db.query(func.count(Lesson.id)).filter(Lesson.course_id == e.course_id).scalar() or 0
        completed_lessons = (
            db.query(func.count(LessonProgress.id))
            .join(Lesson, Lesson.id == LessonProgress.lesson_id)
            .filter(Lesson.course_id == e.course_id,
                    LessonProgress.user_id == e.user_id,
                    LessonProgress.completed == True)
            .scalar() or 0
        )
        d["completion_pct"] = round((completed_lessons / total_lessons) * 100) if total_lessons > 0 else 0

        out.append(d)
    return out


@router.post("/", status_code=201)
def enroll(body: EnrollmentCreate, db: Session = Depends(get_db),
           current: User = Depends(get_current_user)):
    course = db.query(Course).filter(Course.id == body.course_id, Course.is_active == True).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found or inactive")

    # Check course date validity
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    if course.end_date and course.end_date < now:
        raise HTTPException(status_code=400, detail="This course has ended and is no longer accepting enrollments")
    if course.start_date and course.start_date > now:
        raise HTTPException(status_code=400, detail=f"This course starts on {course.start_date.strftime('%B %d, %Y')}")

    # Check prerequisite completion
    if course.prerequisite_id:
        prereq_course = db.query(Course).filter(Course.id == course.prerequisite_id).first()
        prereq_enrollment = db.query(Enrollment).filter(
            Enrollment.user_id == current.id,
            Enrollment.course_id == course.prerequisite_id,
            Enrollment.completed == True
        ).first()
        if not prereq_enrollment:
            prereq_title = prereq_course.title if prereq_course else f"Course #{course.prerequisite_id}"
            raise HTTPException(
                status_code=400,
                detail=f"You must complete '{prereq_title}' before enrolling in this course"
            )

    existing = db.query(Enrollment).filter(
        Enrollment.user_id == current.id, Enrollment.course_id == body.course_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already enrolled in this course")
    e = Enrollment(user_id=current.id, course_id=body.course_id)
    db.add(e); db.commit(); db.refresh(e)
    return _enrich(db, [e])[0]


@router.get("/my")
def my_enrollments(db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    rows = db.query(Enrollment).filter(Enrollment.user_id == current.id).order_by(Enrollment.enrolled_at.desc()).all()
    return _enrich(db, rows)


@router.get("/courses")
def available_courses(db: Session = Depends(get_db), _=Depends(get_current_user),
                      category: str = None, search: str = None):
    from app.models.lesson import Lesson
    from sqlalchemy import func
    q = db.query(Course).filter(Course.is_active == True)
    if category:
        q = q.filter(Course.category == category)
    if search:
        q = q.filter(Course.title.ilike(f"%{search}%"))
    courses = q.order_by(Course.title).all()
    result = []
    for c in courses:
        lesson_count = db.query(func.count(Lesson.id)).filter(Lesson.course_id == c.id).scalar() or 0
        total_duration = db.query(func.sum(Lesson.duration_min)).filter(Lesson.course_id == c.id).scalar() or 0
        result.append({
            "id": c.id, "title": c.title, "description": c.description,
            "category": c.category, "thumbnail_url": c.thumbnail_url,
            "lesson_count": lesson_count, "total_duration_min": total_duration,
        })
    return result


@router.get("/categories")
def get_categories(db: Session = Depends(get_db), _=Depends(get_current_user)):
    rows = db.query(Course.category).filter(Course.category != None).distinct().all()
    return [r[0] for r in rows if r[0]]


@router.delete("/{enrollment_id}", status_code=204)
def unenroll(enrollment_id: int, db: Session = Depends(get_db),
             current: User = Depends(get_current_user)):
    from app.models.lesson import Lesson, LessonProgress
    from app.models.note import Note

    e = db.query(Enrollment).filter(Enrollment.id == enrollment_id, Enrollment.user_id == current.id).first()
    if not e:
        raise HTTPException(status_code=404, detail="Enrollment not found")

    # Clean up lesson progress and notes for this user + course
    lesson_ids = [l.id for l in db.query(Lesson).filter(Lesson.course_id == e.course_id).all()]
    if lesson_ids:
        db.query(LessonProgress).filter(
            LessonProgress.user_id == current.id,
            LessonProgress.lesson_id.in_(lesson_ids)
        ).delete(synchronize_session=False)
        db.query(Note).filter(
            Note.user_id == current.id,
            Note.lesson_id.in_(lesson_ids)
        ).delete(synchronize_session=False)

    db.delete(e); db.commit()


@router.get("/all")
def all_enrollments(db: Session = Depends(get_db), _=Depends(require_admin)):
    rows = db.query(Enrollment).order_by(Enrollment.enrolled_at.desc()).all()
    return _enrich(db, rows)


@router.post("/admin/courses")
def create_course(body: dict, db: Session = Depends(get_db), _=Depends(require_admin_or_instructor)):
    """Admin: create a new course."""
    title = body.get("title", "").strip()
    if not title:
        raise HTTPException(status_code=400, detail="Course title is required")
    import json
    from datetime import datetime
    def parse_date(d):
        if not d: return None
        try: return datetime.fromisoformat(d.replace('Z', '+00:00'))
        except Exception: return None

    course = Course(
        title=title,
        description=body.get("description", ""),
        is_active=body.get("is_active", True),
        category=body.get("category", ""),
        learning_outcomes=json.dumps(body.get("learning_outcomes", [])) if body.get("learning_outcomes") else None,
        requirements=json.dumps(body.get("requirements", [])) if body.get("requirements") else None,
        tags=body.get("tags", ""),
        total_hours=body.get("total_hours", 0),
        total_articles=body.get("total_articles", 0),
        total_exercises=body.get("total_exercises", 0),
        total_resources=body.get("total_resources", 0),
        has_certificate=body.get("has_certificate", True),
        start_date=parse_date(body.get("start_date")),
        end_date=parse_date(body.get("end_date")),
    )
    db.add(course); db.commit(); db.refresh(course)
    return {"id": course.id, "title": course.title, "description": course.description, "is_active": course.is_active}


@router.put("/admin/courses/{course_id}")
def update_course(course_id: int, body: dict, db: Session = Depends(get_db), _=Depends(require_admin_or_instructor)):
    """Admin: update a course."""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    import json
    for field in ["title", "description", "is_active", "category", "tags",
                   "total_hours", "total_articles", "total_exercises", "total_resources", "has_certificate"]:
        if field in body:
            setattr(course, field, body[field])
    if "learning_outcomes" in body:
        course.learning_outcomes = json.dumps(body["learning_outcomes"]) if body["learning_outcomes"] else None
    if "requirements" in body:
        course.requirements = json.dumps(body["requirements"]) if body["requirements"] else None
    from datetime import datetime
    def parse_date(d):
        if not d: return None
        try: return datetime.fromisoformat(d.replace('Z', '+00:00'))
        except Exception: return None
    if "start_date" in body:
        course.start_date = parse_date(body["start_date"])
    if "end_date" in body:
        course.end_date = parse_date(body["end_date"])
    db.commit(); db.refresh(course)
    return {"id": course.id, "title": course.title, "description": course.description, "is_active": course.is_active}


@router.delete("/admin/courses/{course_id}", status_code=204)
def delete_course(course_id: int, db: Session = Depends(get_db), _=Depends(require_admin_or_instructor)):
    """Admin: delete a course (and its lessons)."""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    from app.models.lesson import Lesson, LessonProgress
    # Delete lesson progress and lessons first
    lesson_ids = [l.id for l in db.query(Lesson).filter(Lesson.course_id == course_id).all()]
    if lesson_ids:
        db.query(LessonProgress).filter(LessonProgress.lesson_id.in_(lesson_ids)).delete(synchronize_session=False)
        db.query(Lesson).filter(Lesson.course_id == course_id).delete(synchronize_session=False)
    db.query(Enrollment).filter(Enrollment.course_id == course_id).delete(synchronize_session=False)
    db.delete(course); db.commit()


@router.get("/admin/courses")
def admin_courses(db: Session = Depends(get_db), _=Depends(require_admin_or_instructor)):
    """Get all courses with lesson counts and enrollment counts for admin."""
    from app.models.lesson import Lesson
    from sqlalchemy import func

    courses = db.query(Course).order_by(Course.id).all()
    result = []
    for c in courses:
        lesson_count = db.query(func.count(Lesson.id)).filter(Lesson.course_id == c.id).scalar() or 0
        enrollment_count = db.query(func.count(Enrollment.id)).filter(Enrollment.course_id == c.id).scalar() or 0
        total_duration = db.query(func.sum(Lesson.duration_min)).filter(Lesson.course_id == c.id).scalar() or 0
        result.append({
            "id": c.id,
            "title": c.title,
            "description": c.description,
            "is_active": c.is_active,
            "lesson_count": lesson_count,
            "enrollment_count": enrollment_count,
            "total_duration_min": total_duration,
        })
    return result


@router.get("/courses/{course_id}/detail")
def course_detail(course_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    """Public course detail with sections, lessons, and metadata."""
    import json as _json
    from app.models.lesson import Lesson, Section

    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    sections = db.query(Section).filter(Section.course_id == course_id).order_by(Section.sort_order).all()
    lessons = db.query(Lesson).filter(Lesson.course_id == course_id).order_by(Lesson.sort_order).all()

    enrollment_count = db.query(func.count(Enrollment.id)).filter(Enrollment.course_id == course_id).scalar() or 0
    total_duration = sum(l.duration_min or 0 for l in lessons)

    section_data = []
    for s in sections:
        s_lessons = [l for l in lessons if l.section_id == s.id]
        section_data.append({
            "id": s.id, "title": s.title, "sort_order": s.sort_order,
            "lecture_count": len(s_lessons),
            "duration_min": sum(l.duration_min or 0 for l in s_lessons),
            "lessons": [{"id": l.id, "title": l.title, "content_type": l.content_type,
                         "duration_min": l.duration_min, "is_free": l.is_free, "video_url": l.video_url}
                        for l in s_lessons],
        })

    ungrouped = [l for l in lessons if not l.section_id]
    if ungrouped:
        section_data.insert(0, {
            "id": None, "title": "General", "sort_order": -1,
            "lecture_count": len(ungrouped),
            "duration_min": sum(l.duration_min or 0 for l in ungrouped),
            "lessons": [{"id": l.id, "title": l.title, "content_type": l.content_type,
                         "duration_min": l.duration_min, "is_free": l.is_free, "video_url": l.video_url}
                        for l in ungrouped],
        })

    related = []
    if course.category:
        rel = db.query(Course).filter(Course.category == course.category, Course.id != course.id, Course.is_active == True).limit(3).all()
        for r in rel:
            rc = db.query(func.count(Lesson.id)).filter(Lesson.course_id == r.id).scalar() or 0
            related.append({"id": r.id, "title": r.title, "category": r.category, "thumbnail_url": r.thumbnail_url, "lesson_count": rc})

    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    is_expired = bool(course.end_date and course.end_date < now)
    is_not_started = bool(course.start_date and course.start_date > now)

    return {
        "id": course.id, "title": course.title, "description": course.description,
        "category": course.category, "thumbnail_url": course.thumbnail_url,
        "learning_outcomes": _json.loads(course.learning_outcomes) if course.learning_outcomes else [],
        "requirements": _json.loads(course.requirements) if course.requirements else [],
        "tags": [t.strip() for t in (course.tags or "").split(",") if t.strip()],
        "total_hours": float(course.total_hours or 0),
        "total_articles": course.total_articles or 0,
        "total_exercises": course.total_exercises or 0,
        "total_resources": course.total_resources or 0,
        "has_certificate": course.has_certificate if course.has_certificate is not None else True,
        "start_date": course.start_date.isoformat() if course.start_date else None,
        "end_date": course.end_date.isoformat() if course.end_date else None,
        "is_expired": is_expired,
        "is_not_started": is_not_started,
        "enrollment_count": enrollment_count,
        "total_lessons": len(lessons), "total_sections": len(sections),
        "total_duration_min": total_duration,
        "sections": section_data, "related_courses": related,
    }
