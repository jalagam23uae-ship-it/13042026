"""Time tracking: login sessions, course view time."""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone

from app.database import get_db
from app.models.time_tracking import UserLoginSession, CourseViewTime
from app.models.user import User
from app.models.course import Course
from app.routers.deps import get_current_user, require_admin

router = APIRouter(prefix="/time-tracking", tags=["Time Tracking"])


# ── Login session tracking ────────────────────────────────────────

@router.post("/login")
def record_login(request: Request, db: Session = Depends(get_db),
                 current: User = Depends(get_current_user)):
    """Record login timestamp. Called after successful auth."""
    session = UserLoginSession(
        user_id=current.id,
        login_at=datetime.now(timezone.utc),
        ip_address=request.client.host if request.client else None,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return {"session_id": session.id, "login_at": session.login_at.isoformat()}


@router.post("/logout")
def record_logout(db: Session = Depends(get_db),
                  current: User = Depends(get_current_user)):
    """Record logout, calculate session duration."""
    session = db.query(UserLoginSession).filter(
        UserLoginSession.user_id == current.id,
        UserLoginSession.logout_at == None,
    ).order_by(UserLoginSession.login_at.desc()).first()

    if not session:
        return {"message": "No active session found"}

    now = datetime.now(timezone.utc)
    session.logout_at = now
    delta = now - session.login_at
    session.duration_minutes = round(delta.total_seconds() / 60, 2)
    db.commit()
    return {"duration_minutes": float(session.duration_minutes)}


# ── Course view time tracking ─────────────────────────────────────

class ViewStart(BaseModel):
    course_id: int
    lesson_id: Optional[int] = None

class ViewEnd(BaseModel):
    view_id: int


@router.post("/course-view/start")
def start_course_view(body: ViewStart, db: Session = Depends(get_db),
                      current: User = Depends(get_current_user)):
    """Record when student starts viewing a course/lesson."""
    view = CourseViewTime(
        user_id=current.id,
        course_id=body.course_id,
        lesson_id=body.lesson_id,
        started_at=datetime.now(timezone.utc),
    )
    db.add(view)
    db.commit()
    db.refresh(view)
    return {"view_id": view.id}


@router.post("/course-view/end")
def end_course_view(body: ViewEnd, db: Session = Depends(get_db),
                    current: User = Depends(get_current_user)):
    """Record when student leaves a course/lesson, calculate duration."""
    view = db.query(CourseViewTime).filter(
        CourseViewTime.id == body.view_id,
        CourseViewTime.user_id == current.id,
    ).first()
    if not view:
        return {"message": "View not found"}

    now = datetime.now(timezone.utc)
    view.ended_at = now
    delta = now - view.started_at
    view.duration_minutes = round(delta.total_seconds() / 60, 2)
    db.commit()
    return {"duration_minutes": float(view.duration_minutes)}


@router.post("/heartbeat")
def heartbeat(body: ViewEnd, db: Session = Depends(get_db),
              current: User = Depends(get_current_user)):
    """Periodic heartbeat to update view duration (every 60s from frontend)."""
    view = db.query(CourseViewTime).filter(
        CourseViewTime.id == body.view_id,
        CourseViewTime.user_id == current.id,
    ).first()
    if not view:
        return {"ok": False}
    now = datetime.now(timezone.utc)
    view.duration_minutes = round((now - view.started_at).total_seconds() / 60, 2)
    db.commit()
    return {"ok": True, "duration_minutes": float(view.duration_minutes)}


# ── My stats (student view) ──────────────────────────────────────

@router.get("/my-stats")
def my_stats(db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    """Student: get own time stats."""
    # Login sessions
    total_login_mins = db.query(func.sum(UserLoginSession.duration_minutes)).filter(
        UserLoginSession.user_id == current.id
    ).scalar() or 0

    session_count = db.query(func.count(UserLoginSession.id)).filter(
        UserLoginSession.user_id == current.id
    ).scalar() or 0

    last_login = db.query(UserLoginSession.login_at).filter(
        UserLoginSession.user_id == current.id
    ).order_by(UserLoginSession.login_at.desc()).first()

    # Course view times
    course_times = db.query(
        Course.id, Course.title,
        func.sum(CourseViewTime.duration_minutes).label("total_min"),
        func.count(CourseViewTime.id).label("view_count"),
    ).join(Course, CourseViewTime.course_id == Course.id).filter(
        CourseViewTime.user_id == current.id,
    ).group_by(Course.id, Course.title).all()

    total_course_mins = sum(float(ct.total_min or 0) for ct in course_times)

    return {
        "total_login_minutes": round(float(total_login_mins), 1),
        "total_login_hours": round(float(total_login_mins) / 60, 1),
        "session_count": session_count,
        "last_login": last_login[0].isoformat() if last_login else None,
        "total_course_minutes": round(total_course_mins, 1),
        "total_course_hours": round(total_course_mins / 60, 1),
        "courses": [
            {"course_id": ct.id, "course_title": ct.title,
             "total_minutes": round(float(ct.total_min or 0), 1),
             "total_hours": round(float(ct.total_min or 0) / 60, 1),
             "view_count": ct.view_count}
            for ct in course_times
        ],
    }


# ── Admin: all students stats ────────────────────────────────────

@router.get("/admin/all")
def admin_all_stats(db: Session = Depends(get_db), _=Depends(require_admin)):
    """Admin: get time stats for all students."""
    students = db.query(User).filter(User.role == "student").all()
    result = []

    for s in students:
        login_mins = db.query(func.sum(UserLoginSession.duration_minutes)).filter(
            UserLoginSession.user_id == s.id
        ).scalar() or 0

        session_count = db.query(func.count(UserLoginSession.id)).filter(
            UserLoginSession.user_id == s.id
        ).scalar() or 0

        course_mins = db.query(func.sum(CourseViewTime.duration_minutes)).filter(
            CourseViewTime.user_id == s.id
        ).scalar() or 0

        last_login = db.query(UserLoginSession.login_at).filter(
            UserLoginSession.user_id == s.id
        ).order_by(UserLoginSession.login_at.desc()).first()

        last_logout = db.query(UserLoginSession.logout_at).filter(
            UserLoginSession.user_id == s.id,
            UserLoginSession.logout_at != None,
        ).order_by(UserLoginSession.logout_at.desc()).first()

        result.append({
            "user_id": s.id, "name": s.name, "email": s.email,
            "total_login_minutes": round(float(login_mins), 1),
            "total_login_hours": round(float(login_mins) / 60, 1),
            "session_count": session_count,
            "total_course_minutes": round(float(course_mins), 1),
            "total_course_hours": round(float(course_mins) / 60, 1),
            "last_login": last_login[0].isoformat() if last_login else None,
            "last_logout": last_logout[0].isoformat() if last_logout else None,
        })

    return result


@router.get("/admin/user/{user_id}")
def admin_user_detail(user_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    """Admin: detailed time stats for a specific student."""
    # Login sessions
    sessions = db.query(UserLoginSession).filter(
        UserLoginSession.user_id == user_id
    ).order_by(UserLoginSession.login_at.desc()).limit(50).all()

    # Course view times
    course_views = db.query(
        Course.title,
        func.sum(CourseViewTime.duration_minutes).label("total_min"),
        func.count(CourseViewTime.id).label("view_count"),
    ).join(Course, CourseViewTime.course_id == Course.id).filter(
        CourseViewTime.user_id == user_id,
    ).group_by(Course.title).all()

    return {
        "login_sessions": [
            {"id": s.id, "login_at": s.login_at.isoformat() if s.login_at else None,
             "logout_at": s.logout_at.isoformat() if s.logout_at else None,
             "duration_minutes": round(float(s.duration_minutes or 0), 1),
             "ip_address": s.ip_address}
            for s in sessions
        ],
        "course_times": [
            {"course_title": cv.title,
             "total_minutes": round(float(cv.total_min or 0), 1),
             "total_hours": round(float(cv.total_min or 0) / 60, 1),
             "view_count": cv.view_count}
            for cv in course_views
        ],
    }


# ── Daily/Weekly attendance ───────────────────────────────────────

@router.get("/daily-attendance/me")
def my_daily_attendance(days: int = 30, db: Session = Depends(get_db),
                        current: User = Depends(get_current_user)):
    """Student: get own daily attendance (which days they logged in) for last N days."""
    from sqlalchemy import cast, Date
    rows = db.query(
        cast(UserLoginSession.login_at, Date).label("day"),
        func.count(UserLoginSession.id).label("sessions"),
        func.sum(UserLoginSession.duration_minutes).label("total_min"),
    ).filter(
        UserLoginSession.user_id == current.id,
        UserLoginSession.login_at >= datetime.now(timezone.utc) - __import__('datetime').timedelta(days=days),
    ).group_by(cast(UserLoginSession.login_at, Date)).order_by(cast(UserLoginSession.login_at, Date).desc()).all()

    # Course view days
    cv_rows = db.query(
        cast(CourseViewTime.started_at, Date).label("day"),
        func.sum(CourseViewTime.duration_minutes).label("course_min"),
    ).filter(
        CourseViewTime.user_id == current.id,
        CourseViewTime.started_at >= datetime.now(timezone.utc) - __import__('datetime').timedelta(days=days),
    ).group_by(cast(CourseViewTime.started_at, Date)).all()
    cv_map = {str(r.day): round(float(r.course_min or 0), 1) for r in cv_rows}

    return [
        {"date": str(r.day), "sessions": r.sessions,
         "login_minutes": round(float(r.total_min or 0), 1),
         "course_minutes": cv_map.get(str(r.day), 0),
         "present": True}
        for r in rows
    ]


@router.get("/admin/daily-attendance")
def admin_daily_attendance(days: int = 7, db: Session = Depends(get_db),
                           _=Depends(require_admin)):
    """Admin: get daily attendance for all students for last N days."""
    from sqlalchemy import cast, Date
    from datetime import timedelta
    students = db.query(User).filter(User.role == "student", User.is_active == True).all()
    since = datetime.now(timezone.utc) - timedelta(days=days)

    # Get all login dates per user
    login_data = db.query(
        UserLoginSession.user_id,
        cast(UserLoginSession.login_at, Date).label("day"),
        func.count(UserLoginSession.id).label("sessions"),
        func.sum(UserLoginSession.duration_minutes).label("total_min"),
    ).filter(
        UserLoginSession.login_at >= since,
    ).group_by(UserLoginSession.user_id, cast(UserLoginSession.login_at, Date)).all()

    # Get course view data per user per day
    cv_data = db.query(
        CourseViewTime.user_id,
        cast(CourseViewTime.started_at, Date).label("day"),
        func.sum(CourseViewTime.duration_minutes).label("course_min"),
    ).filter(
        CourseViewTime.started_at >= since,
    ).group_by(CourseViewTime.user_id, cast(CourseViewTime.started_at, Date)).all()

    # Build lookup: user_id -> { date_str -> { sessions, login_min, course_min } }
    user_days = {}
    for row in login_data:
        uid = row.user_id
        day = str(row.day)
        if uid not in user_days:
            user_days[uid] = {}
        user_days[uid][day] = {
            "sessions": row.sessions,
            "login_minutes": round(float(row.total_min or 0), 1),
            "course_minutes": 0,
        }
    for row in cv_data:
        uid = row.user_id
        day = str(row.day)
        if uid not in user_days:
            user_days[uid] = {}
        if day not in user_days[uid]:
            user_days[uid][day] = {"sessions": 0, "login_minutes": 0, "course_minutes": 0}
        user_days[uid][day]["course_minutes"] = round(float(row.course_min or 0), 1)

    # Generate date range
    dates = []
    for i in range(days):
        d = datetime.now(timezone.utc) - timedelta(days=days - 1 - i)
        dates.append(d.strftime("%Y-%m-%d"))

    result = []
    for s in students:
        days_data = user_days.get(s.id, {})
        attendance = []
        present_count = 0
        for d in dates:
            if d in days_data:
                present_count += 1
                attendance.append({"date": d, "present": True, **days_data[d]})
            else:
                attendance.append({"date": d, "present": False, "sessions": 0, "login_minutes": 0, "course_minutes": 0})
        result.append({
            "user_id": s.id, "name": s.name, "email": s.email,
            "present_days": present_count, "total_days": len(dates),
            "attendance_rate": round(present_count / len(dates) * 100, 1) if dates else 0,
            "days": attendance,
        })
    return {"dates": dates, "students": result}
