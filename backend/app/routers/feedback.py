from fastapi import APIRouter, Depends, HTTPException  # noqa: F401
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from app.database import get_db
from app.models.feedback import Feedback
from app.schemas.feedback import FeedbackCreate, FeedbackOut
from app.routers.deps import get_current_user, require_admin, require_admin_or_instructor
from app.models.user import User

router = APIRouter(prefix="/feedback", tags=["Feedback"])

@router.post("/", response_model=FeedbackOut)
def submit_feedback(body: FeedbackCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    fb = Feedback(user_id=user.id, **body.model_dump())
    db.add(fb); db.commit(); db.refresh(fb)
    return fb

@router.get("/my", response_model=List[FeedbackOut])
def my_feedback(db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    return db.query(Feedback).filter(Feedback.user_id == current.id).order_by(Feedback.submitted_at.desc()).all()

@router.get("/session/{session_id}", response_model=List[FeedbackOut])
def get_session_feedback(session_id: int, db: Session = Depends(get_db), _=Depends(require_admin_or_instructor)):
    return db.query(Feedback).filter(Feedback.session_id == session_id).all()

@router.get("/summary/{session_id}")
def feedback_summary(session_id: int, db: Session = Depends(get_db), _=Depends(require_admin_or_instructor)):
    q = db.query(
        func.avg(Feedback.overall_rating).label("avg_overall"),
        func.avg(Feedback.instructor_rating).label("avg_instructor"),
        func.avg(Feedback.content_rating).label("avg_content"),
        func.avg(Feedback.pace_rating).label("avg_pace"),
        func.count(Feedback.id).label("count")
    ).filter(Feedback.session_id == session_id).first()
    return {
        "avg_overall": round(float(q.avg_overall or 0), 1),
        "avg_instructor": round(float(q.avg_instructor or 0), 1),
        "avg_content": round(float(q.avg_content or 0), 1),
        "avg_pace": round(float(q.avg_pace or 0), 1),
        "total_feedback": q.count
    }

@router.get("/all")
def get_all_feedback(db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    """Admin / Instructor: see all feedback with student names and session titles."""
    if current.role not in ("admin", "instructor"):
        raise HTTPException(status_code=403, detail="Not allowed")
    from app.models.session import Session as SessionModel
    rows = db.query(Feedback).order_by(Feedback.submitted_at.desc()).all()
    user_ids = {r.user_id for r in rows}
    users = {u.id: u for u in db.query(User).filter(User.id.in_(user_ids)).all()} if user_ids else {}
    session_ids = {r.session_id for r in rows if r.session_id}
    sessions = {s.id: s for s in db.query(SessionModel).filter(SessionModel.id.in_(session_ids)).all()} if session_ids else {}
    result = []
    for fb in rows:
        u = users.get(fb.user_id)
        s = sessions.get(fb.session_id) if fb.session_id else None
        result.append({
            "id": fb.id,
            "session_id": fb.session_id,
            "session_title": s.title if s else f"Session #{fb.session_id}",
            "user_id": fb.user_id,
            "student_name": u.name if u else f"User #{fb.user_id}",
            "overall_rating": fb.overall_rating,
            "instructor_rating": fb.instructor_rating,
            "content_rating": fb.content_rating,
            "pace_rating": fb.pace_rating,
            "comments": fb.comments,
            "submitted_at": fb.submitted_at.isoformat() if fb.submitted_at else None,
        })
    return result
