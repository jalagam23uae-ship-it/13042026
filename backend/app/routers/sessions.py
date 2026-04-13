from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session as DBSession
from typing import List, Optional
from app.database import get_db
from app.models import Session as SessionModel, User
from app.schemas import SessionCreate, SessionOut, SessionUpdate
from app.middleware.auth_middleware import require_admin, get_current_user
from app.routers.notifications import send_notification

router = APIRouter(prefix="/sessions", tags=["Sessions"])


@router.get("/", response_model=List[SessionOut])
def list_sessions(
    db: DBSession = Depends(get_db),
    _: User = Depends(get_current_user),
    status: Optional[str] = Query(None, description="Filter by status"),
    instructor: Optional[str] = Query(None, description="Filter by instructor"),
    course_id: Optional[int] = Query(None, description="Filter by course"),
    search: Optional[str] = Query(None, description="Search in title"),
):
    q = db.query(SessionModel)
    if status:
        q = q.filter(SessionModel.status == status)
    if instructor:
        q = q.filter(SessionModel.instructor.ilike(f"%{instructor}%"))
    if course_id:
        q = q.filter(SessionModel.course_id == course_id)
    if search:
        q = q.filter(SessionModel.title.ilike(f"%{search}%"))
    return q.order_by(SessionModel.start_time.desc()).all()


@router.get("/{session_id}", response_model=SessionOut)
def get_session(session_id: int, db: DBSession = Depends(get_db), _=Depends(get_current_user)):
    s = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Session not found")
    return s


@router.post("/", response_model=SessionOut, status_code=201)
def create_session(payload: SessionCreate, db: DBSession = Depends(get_db),
                   current_user: User = Depends(require_admin)):
    delta = payload.end_time - payload.start_time
    hrs = round(delta.total_seconds() / 3600, 2)
    data = payload.model_dump()
    s = SessionModel(**data, duration_hrs=hrs, created_by=current_user.id)
    db.add(s); db.commit(); db.refresh(s)

    # Notify all students about new session
    students = db.query(User).filter(User.role == "student", User.is_active == True).all()
    for student in students:
        send_notification(
            db, student.id,
            title=f"New Session: {s.title}",
            message=f"Instructor: {s.instructor or 'TBA'} · {s.start_time.strftime('%b %d, %H:%M')}",
            type="info",
            link="/sessions",
        )
    db.commit()

    return s


@router.put("/{session_id}", response_model=SessionOut)
def update_session(session_id: int, payload: SessionUpdate,
                   db: DBSession = Depends(get_db), _=Depends(require_admin)):
    s = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Session not found")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(s, k, v)
    if payload.start_time and payload.end_time:
        s.duration_hrs = round((payload.end_time - payload.start_time).total_seconds() / 3600, 2)
    db.commit(); db.refresh(s)
    return s


@router.delete("/{session_id}", status_code=204)
def delete_session(session_id: int, db: DBSession = Depends(get_db), _=Depends(require_admin)):
    s = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Session not found")
    db.delete(s); db.commit()
