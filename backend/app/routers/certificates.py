from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.user import User
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.test import TestResult, Test
from app.routers.deps import get_current_user
from datetime import datetime, timezone
import hashlib

router = APIRouter(prefix="/certificates", tags=["Certificates"])


def _cert_id(user_id: int, course_id: int, name: str) -> str:
    """Deterministic certificate ID — same inputs always give the same ID."""
    raw = f"{user_id}-{course_id}-{name}"
    return "CERT-" + hashlib.sha256(raw.encode()).hexdigest()[:12].upper()


def _check_passed_test(db: Session, user_id: int, course_id: int) -> tuple[bool, float]:
    """Return (has_passed, best_percentage) for all tests attached to the course."""
    course_tests = db.query(Test).filter(Test.course_id == course_id).all()
    if not course_tests:
        # Course has no tests → not eligible (need a test to prove completion)
        return False, 0.0
    best = 0.0
    for t in course_tests:
        result = (
            db.query(TestResult)
            .filter(
                TestResult.user_id == user_id,
                TestResult.test_id == t.id,
                TestResult.passed == True,
            )
            .first()
        )
        if result:
            best = max(best, float(result.percentage or 0))
    return best > 0, best


@router.get("/eligible")
def get_eligible_certificates(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    """
    Return all enrolled courses with certificate eligibility status.

    Eligibility rule: student must have PASSED at least one test for the course.
    A certificate is 'issued' when the enrollment is marked completed.
    """
    enrollments = db.query(Enrollment).filter(Enrollment.user_id == current.id).all()
    result = []

    for enr in enrollments:
        course = db.query(Course).filter(Course.id == enr.course_id).first()
        if not course:
            continue

        passed, best_score = _check_passed_test(db, current.id, course.id)
        issued = bool(enr.completed)
        cert_id = _cert_id(current.id, course.id, current.name) if issued else None

        result.append({
            "course_id": course.id,
            "course_title": course.title,
            "eligible": passed,
            "issued": issued,
            "certificate_id": cert_id,
            "issued_at": enr.enrolled_at.isoformat() if issued and enr.enrolled_at else None,
            "passed_test": passed,
            "best_score": round(best_score, 1),
        })

    # Sort: issued first, then eligible, then others
    result.sort(key=lambda x: (not x["issued"], not x["eligible"], x["course_title"]))
    return result


@router.get("/generate/{course_id}")
def generate_certificate(
    course_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    """
    Generate (issue) a certificate for a course.

    Requirements:
    - Must be enrolled in the course.
    - Must have passed at least one test for the course.
    """
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    enrollment = db.query(Enrollment).filter(
        Enrollment.user_id == current.id,
        Enrollment.course_id == course_id,
    ).first()
    if not enrollment:
        raise HTTPException(status_code=400, detail="You are not enrolled in this course")

    # Must have passed at least one test
    passed, best_score = _check_passed_test(db, current.id, course_id)
    if not passed:
        course_tests = db.query(Test).filter(Test.course_id == course_id).all()
        if not course_tests:
            raise HTTPException(
                status_code=400,
                detail="This course has no tests. A passed test is required to earn a certificate.",
            )
        raise HTTPException(
            status_code=400,
            detail="You must pass at least one test for this course to earn a certificate.",
        )

    # Mark enrollment as completed and issue certificate
    enrollment.completed = True
    db.commit()

    cert_id = _cert_id(current.id, course_id, current.name)
    now = datetime.now(timezone.utc)

    return {
        "certificate_id": cert_id,
        "student_name": current.name,
        "course_title": course.title,
        "completion_date": now.strftime("%B %d, %Y"),
        "best_score": f"{round(best_score)}%",
        "issued_by": "ATP",
    }
