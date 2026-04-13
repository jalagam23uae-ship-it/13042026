from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.user import User
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.test import TestResult, Test
from app.models.attendance import Attendance
from app.models.session import Session as SessionModel
from app.models.lesson import Lesson, LessonProgress
from app.routers.deps import get_current_user
from datetime import datetime, timezone
import hashlib

router = APIRouter(prefix="/certificates", tags=["Certificates"])


@router.get("/eligible")
def get_eligible_certificates(db: Session = Depends(get_db),
                               current: User = Depends(get_current_user)):
    """List courses where the user has completed requirements for a certificate."""
    enrollments = db.query(Enrollment).filter(Enrollment.user_id == current.id).all()
    eligible = []

    for enr in enrollments:
        course = db.query(Course).filter(Course.id == enr.course_id).first()
        if not course:
            continue

        # Count total completed sessions for this course
        total_sessions = db.query(func.count(SessionModel.id)).filter(
            SessionModel.course_id == course.id, SessionModel.status == "completed"
        ).scalar() or 0

        # Count sessions attended by user
        attended = db.query(func.count(Attendance.id)).join(
            SessionModel, Attendance.session_id == SessionModel.id
        ).filter(
            SessionModel.course_id == course.id,
            Attendance.user_id == current.id,
            Attendance.status.in_(["present", "partial"])
        ).scalar() or 0

        attendance_pct = (attended / total_sessions * 100) if total_sessions > 0 else 0

        # Check if user passed a test for this course
        course_tests = db.query(Test).filter(Test.course_id == course.id).all()
        passed_test = False
        best_score = 0
        for t in course_tests:
            result = db.query(TestResult).filter(
                TestResult.user_id == current.id,
                TestResult.test_id == t.id,
                TestResult.passed == True
            ).first()
            if result:
                passed_test = True
                best_score = max(best_score, float(result.percentage))

        # Lesson completion check
        total_lessons = db.query(func.count(Lesson.id)).filter(
            Lesson.course_id == course.id
        ).scalar() or 0
        completed_lessons = db.query(func.count(LessonProgress.id)).join(
            Lesson, Lesson.id == LessonProgress.lesson_id
        ).filter(
            Lesson.course_id == course.id,
            LessonProgress.user_id == current.id,
            LessonProgress.completed == True
        ).scalar() or 0
        lesson_pct = (completed_lessons / total_lessons * 100) if total_lessons > 0 else 0

        is_eligible = attendance_pct >= 70 and (passed_test or len(course_tests) == 0) and lesson_pct >= 80

        eligible.append({
            "course_id": course.id,
            "course_title": course.title,
            "attendance_pct": round(attendance_pct, 1),
            "sessions_attended": attended,
            "total_sessions": total_sessions,
            "passed_test": passed_test,
            "best_score": best_score,
            "lesson_completion_pct": round(lesson_pct, 1),
            "is_eligible": is_eligible,
            "enrolled_at": enr.enrolled_at.isoformat() if enr.enrolled_at else None,
        })

    return eligible


@router.get("/generate/{course_id}")
def generate_certificate(course_id: int, db: Session = Depends(get_db),
                          current: User = Depends(get_current_user)):
    """Generate a certificate for a completed course."""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    enrollment = db.query(Enrollment).filter(
        Enrollment.user_id == current.id, Enrollment.course_id == course_id
    ).first()
    if not enrollment:
        raise HTTPException(status_code=400, detail="Not enrolled in this course")

    # Verify eligibility
    total_sessions = db.query(func.count(SessionModel.id)).filter(
        SessionModel.course_id == course.id, SessionModel.status == "completed"
    ).scalar() or 0

    attended = db.query(func.count(Attendance.id)).join(
        SessionModel, Attendance.session_id == SessionModel.id
    ).filter(
        SessionModel.course_id == course.id,
        Attendance.user_id == current.id,
        Attendance.status.in_(["present", "partial"])
    ).scalar() or 0

    attendance_pct = (attended / total_sessions * 100) if total_sessions > 0 else 0
    if attendance_pct < 70:
        raise HTTPException(status_code=400, detail="Attendance below 70% requirement")

    # Lesson completion check
    total_lessons = db.query(func.count(Lesson.id)).filter(
        Lesson.course_id == course.id
    ).scalar() or 0
    completed_lessons = db.query(func.count(LessonProgress.id)).join(
        Lesson, Lesson.id == LessonProgress.lesson_id
    ).filter(
        Lesson.course_id == course.id,
        LessonProgress.user_id == current.id,
        LessonProgress.completed == True
    ).scalar() or 0
    lesson_pct = (completed_lessons / total_lessons * 100) if total_lessons > 0 else 0
    if lesson_pct < 80:
        raise HTTPException(status_code=400, detail="Lesson completion below 80% requirement")

    # Test pass check — must pass at least one test if course has tests
    course_tests = db.query(Test).filter(Test.course_id == course.id).all()
    if course_tests:
        passed_test = False
        for t in course_tests:
            result = db.query(TestResult).filter(
                TestResult.user_id == current.id,
                TestResult.test_id == t.id,
                TestResult.passed == True
            ).first()
            if result:
                passed_test = True
                break
        if not passed_test:
            raise HTTPException(status_code=400, detail="You must pass at least one course test")

    # Generate certificate data
    cert_id = hashlib.sha256(
        f"{current.id}-{course_id}-{current.name}".encode()
    ).hexdigest()[:12].upper()

    now = datetime.now(timezone.utc)

    # Mark enrollment as completed
    enrollment.completed = True
    db.commit()

    return {
        "certificate_id": f"CERT-{cert_id}",
        "student_name": current.name,
        "course_title": course.title,
        "completion_date": now.strftime("%B %d, %Y"),
        "attendance_rate": f"{round(attendance_pct)}%",
        "sessions_completed": f"{attended}/{total_sessions}",
        "issued_by": "ATP",
    }
