from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from app.database import get_db
from app.models.user import User
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.lesson import Lesson, LessonProgress
from app.models.test import Test, TestResult, Question
from app.models.attendance import Attendance
from app.models.session import Session as SessionModel
from app.models.assignment import Assignment, Submission
from app.routers.deps import require_admin, get_current_user

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/overview")
def overview(db: Session = Depends(get_db), _=Depends(require_admin)):
    total_students = db.query(func.count(User.id)).filter(User.role == "student", User.is_active == True).scalar()
    total_courses = db.query(func.count(Course.id)).filter(Course.is_active == True).scalar()
    total_enrollments = db.query(func.count(Enrollment.id)).scalar()
    total_lessons = db.query(func.count(Lesson.id)).scalar()
    completed_lessons = db.query(func.count(LessonProgress.id)).filter(LessonProgress.completed == True).scalar()
    total_tests_taken = db.query(func.count(TestResult.id)).scalar()
    avg_score = db.query(func.avg(TestResult.percentage)).scalar()
    pass_rate = 0
    if total_tests_taken:
        passed = db.query(func.count(TestResult.id)).filter(TestResult.passed == True).scalar()
        pass_rate = round(passed / total_tests_taken * 100, 1)

    return {
        "total_students": total_students,
        "total_courses": total_courses,
        "total_enrollments": total_enrollments,
        "total_lessons": total_lessons,
        "completed_lessons": completed_lessons,
        "lesson_completion_rate": round(completed_lessons / total_lessons * 100, 1) if total_lessons else 0,
        "total_tests_taken": total_tests_taken,
        "avg_test_score": round(float(avg_score or 0), 1),
        "pass_rate": pass_rate,
    }


@router.get("/course-completion")
def course_completion(db: Session = Depends(get_db), _=Depends(require_admin)):
    courses = db.query(Course).filter(Course.is_active == True).all()
    result = []
    for c in courses:
        total_lessons = db.query(func.count(Lesson.id)).filter(Lesson.course_id == c.id).scalar() or 0
        enrollments = db.query(func.count(Enrollment.id)).filter(Enrollment.course_id == c.id).scalar() or 0
        if total_lessons == 0 or enrollments == 0:
            result.append({"course": c.title, "enrolled": enrollments, "completion_rate": 0, "total_lessons": total_lessons})
            continue
        # Students who completed all lessons
        lesson_ids = [l.id for l in db.query(Lesson.id).filter(Lesson.course_id == c.id).all()]
        completed_students = 0
        enrolled_users = db.query(Enrollment.user_id).filter(Enrollment.course_id == c.id).all()
        for (uid,) in enrolled_users:
            done = db.query(func.count(LessonProgress.id)).filter(
                LessonProgress.user_id == uid,
                LessonProgress.lesson_id.in_(lesson_ids),
                LessonProgress.completed == True,
            ).scalar() or 0
            if done >= total_lessons:
                completed_students += 1
        rate = round(completed_students / enrollments * 100, 1) if enrollments else 0
        result.append({"course": c.title, "enrolled": enrollments, "completed": completed_students,
                       "completion_rate": rate, "total_lessons": total_lessons})
    return result


@router.get("/lesson-dropoff")
def lesson_dropoff(db: Session = Depends(get_db), _=Depends(require_admin)):
    """Where do students stop in each course?"""
    courses = db.query(Course).filter(Course.is_active == True).all()
    result = []
    for c in courses:
        lessons = db.query(Lesson).filter(Lesson.course_id == c.id).order_by(Lesson.sort_order).all()
        if not lessons:
            continue
        course_data = {"course": c.title, "lessons": []}
        for l in lessons:
            completed = db.query(func.count(LessonProgress.id)).filter(
                LessonProgress.lesson_id == l.id, LessonProgress.completed == True
            ).scalar() or 0
            started = db.query(func.count(LessonProgress.id)).filter(
                LessonProgress.lesson_id == l.id
            ).scalar() or 0
            course_data["lessons"].append({
                "title": l.title, "sort_order": l.sort_order,
                "started": started, "completed": completed,
            })
        result.append(course_data)
    return result


@router.get("/quiz-analysis")
def quiz_analysis(db: Session = Depends(get_db), _=Depends(require_admin)):
    tests = db.query(Test).filter(Test.is_active == True).all()
    result = []
    for t in tests:
        attempts = db.query(func.count(TestResult.id)).filter(TestResult.test_id == t.id).scalar() or 0
        avg = db.query(func.avg(TestResult.percentage)).filter(TestResult.test_id == t.id).scalar()
        passed = db.query(func.count(TestResult.id)).filter(TestResult.test_id == t.id, TestResult.passed == True).scalar() or 0
        result.append({
            "test": t.title,
            "attempts": attempts,
            "avg_score": round(float(avg or 0), 1),
            "pass_rate": round(passed / attempts * 100, 1) if attempts else 0,
        })
    return result


@router.get("/instructor/{user_id}")
def instructor_analytics(user_id: int, db: Session = Depends(get_db),
                         current: User = Depends(get_current_user)):
    if current.role not in ("admin", "instructor") or (current.role == "instructor" and current.id != user_id):
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Not allowed")

    # Sessions by this instructor
    sessions = db.query(SessionModel).filter(SessionModel.instructor != None).all()
    my_sessions = [s for s in sessions if s.created_by == user_id]

    total_attendance = 0
    for s in my_sessions:
        total_attendance += db.query(func.count(Attendance.id)).filter(
            Attendance.session_id == s.id,
            Attendance.status.in_(["present", "partial"]),
        ).scalar() or 0

    pending_subs = db.query(func.count(Submission.id)).filter(Submission.graded == False).scalar() or 0

    return {
        "total_sessions": len(my_sessions),
        "completed_sessions": len([s for s in my_sessions if s.status == "completed"]),
        "total_attendance": total_attendance,
        "pending_submissions": pending_subs,
    }
