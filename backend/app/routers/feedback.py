from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from app.database import get_db
from app.models.feedback import Feedback
from app.schemas.feedback import FeedbackCreate, FeedbackOut
from app.routers.deps import get_current_user, require_admin
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
def get_session_feedback(session_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    return db.query(Feedback).filter(Feedback.session_id == session_id).all()

@router.get("/summary/{session_id}")
def feedback_summary(session_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
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

@router.get("/all", response_model=List[FeedbackOut])
def get_all_feedback(db: Session = Depends(get_db), _=Depends(require_admin)):
    return db.query(Feedback).order_by(Feedback.submitted_at.desc()).all()
