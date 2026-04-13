from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session as DBSession
from sqlalchemy import func
from typing import List
from datetime import datetime, timezone
from app.database import get_db
from app.models import Attendance, Session as SessionModel, User
from app.schemas import AttendanceOut, CheckInRequest, CheckOutRequest, AttendanceSummary
from app.middleware.auth_middleware import get_current_user, require_admin

router = APIRouter(prefix="/attendance", tags=["Attendance"])

@router.post("/checkin", response_model=AttendanceOut)
def check_in(payload: CheckInRequest, db: DBSession = Depends(get_db),
             current_user: User = Depends(get_current_user)):
    session = db.query(SessionModel).filter(SessionModel.id == payload.session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Block check-in on cancelled sessions
    if session.status == "cancelled":
        raise HTTPException(status_code=400, detail="This session has been cancelled")

    # Require enrollment in the session's course (if session has a course)
    if session.course_id:
        from app.models.enrollment import Enrollment
        enrollment = db.query(Enrollment).filter(
            Enrollment.user_id == current_user.id,
            Enrollment.course_id == session.course_id
        ).first()
        if not enrollment:
            raise HTTPException(status_code=403, detail="You must be enrolled in this course to check in")

    existing = db.query(Attendance).filter(
        Attendance.user_id == current_user.id,
        Attendance.session_id == payload.session_id
    ).first()
    if existing and existing.check_in:
        raise HTTPException(status_code=400, detail="Already checked in")
    if not existing:
        existing = Attendance(user_id=current_user.id, session_id=payload.session_id)
        db.add(existing)
    existing.check_in = datetime.now(timezone.utc)
    existing.status = "present"
    db.commit(); db.refresh(existing)
    return existing

@router.post("/checkout", response_model=AttendanceOut)
def check_out(payload: CheckOutRequest, db: DBSession = Depends(get_db),
              current_user: User = Depends(get_current_user)):
    att = db.query(Attendance).filter(
        Attendance.user_id == current_user.id,
        Attendance.session_id == payload.session_id
    ).first()
    if not att or not att.check_in:
        raise HTTPException(status_code=400, detail="Not checked in yet")
    if att.check_out:
        raise HTTPException(status_code=400, detail="Already checked out")
    att.check_out = datetime.now(timezone.utc)
    delta = att.check_out - att.check_in
    hrs = round(delta.total_seconds() / 3600, 2)
    att.hours_spent = hrs
    session = db.query(SessionModel).filter(SessionModel.id == payload.session_id).first()
    if session and session.duration_hrs:
        att.status = "present" if hrs >= float(session.duration_hrs) * 0.75 else "partial"
    db.commit(); db.refresh(att)
    return att

@router.get("/my", response_model=List[AttendanceOut])
def my_attendance(db: DBSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Attendance).filter(Attendance.user_id == current_user.id).all()

@router.get("/summary/me", response_model=AttendanceSummary)
def my_summary(db: DBSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    total = db.query(SessionModel).count()
    attended = db.query(Attendance).filter(
        Attendance.user_id == current_user.id,
        Attendance.status.in_(["present", "partial"])
    ).count()
    hours = db.query(func.sum(Attendance.hours_spent)).filter(
        Attendance.user_id == current_user.id
    ).scalar() or 0
    return AttendanceSummary(
        total_sessions=total,
        attended=attended,
        total_hours=float(hours),
        attendance_rate=round(attended / total * 100, 1) if total else 0
    )

@router.get("/user/{user_id}", response_model=List[AttendanceOut])
def user_attendance(user_id: int, db: DBSession = Depends(get_db), _=Depends(require_admin)):
    return db.query(Attendance).filter(Attendance.user_id == user_id).all()
