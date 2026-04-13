from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.session import Session as SessionModel
from app.models.attendance import Attendance
from app.models.course import Course

def get_user_progress(db: Session, user_id: int):
    courses = db.query(Course).all()
    result = []
    for course in courses:
        total = db.query(func.count(SessionModel.id)).filter(
            SessionModel.course_id == course.id,
            SessionModel.status == "completed"
        ).scalar() or 0
        attended = db.query(func.count(Attendance.id)).join(
            SessionModel, Attendance.session_id == SessionModel.id
        ).filter(
            SessionModel.course_id == course.id,
            Attendance.user_id == user_id,
            Attendance.status.in_(["present", "partial"])
        ).scalar() or 0
        pct = round((attended / total * 100) if total > 0 else 0, 1)
        total_hours = db.query(func.sum(Attendance.hours_spent)).join(
            SessionModel, Attendance.session_id == SessionModel.id
        ).filter(
            SessionModel.course_id == course.id,
            Attendance.user_id == user_id
        ).scalar() or 0
        result.append({
            "course_id": course.id,
            "course_title": course.title,
            "total_sessions": total,
            "attended_sessions": attended,
            "completion_pct": pct,
            "total_hours": float(total_hours)
        })
    return result
