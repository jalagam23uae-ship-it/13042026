from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
from app.database import get_db
from app.models.session import Session as SessionModel
from app.models.assignment import Assignment
from app.models.enrollment import Enrollment
from app.models.course import Course
from app.models.user import User
from app.routers.deps import get_current_user

router = APIRouter(prefix="/calendar", tags=["Calendar"])


@router.get("/events")
def get_events(db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    events = []

    # Sessions
    sessions = db.query(SessionModel).order_by(SessionModel.start_time).all()
    for s in sessions:
        events.append({
            "id": f"session-{s.id}",
            "title": s.title,
            "start": s.start_time.isoformat() if s.start_time else None,
            "end": s.end_time.isoformat() if s.end_time else None,
            "type": "session",
            "status": s.status,
            "instructor": s.instructor,
            "color": "#1a56db" if s.status == "upcoming" else "#0e7c40" if s.status == "completed" else "#9ca3af",
        })

    # Assignments (for enrolled courses)
    if current.role == "admin":
        assignments = db.query(Assignment).filter(Assignment.is_active == True).all()
    else:
        enrolled_cids = [e.course_id for e in db.query(Enrollment).filter(Enrollment.user_id == current.id).all()]
        assignments = db.query(Assignment).filter(
            Assignment.course_id.in_(enrolled_cids), Assignment.is_active == True
        ).all() if enrolled_cids else []

    course_ids = {a.course_id for a in assignments}
    titles = {c.id: c.title for c in db.query(Course).filter(Course.id.in_(course_ids)).all()} if course_ids else {}

    for a in assignments:
        if a.due_date:
            events.append({
                "id": f"assignment-{a.id}",
                "title": f"Due: {a.title}",
                "start": a.due_date.isoformat(),
                "end": a.due_date.isoformat(),
                "type": "assignment",
                "course": titles.get(a.course_id, ""),
                "color": "#c81e1e",
            })

    return events
