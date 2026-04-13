from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
from app.database import get_db
from app.models.approval import ApprovalRequest
from app.models.user import User
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.routers.deps import get_current_user, require_admin

router = APIRouter(prefix="/approvals", tags=["Approvals"])


class ApprovalRequestCreate(BaseModel):
    type: str
    target_id: int
    comments: Optional[str] = None


class RejectBody(BaseModel):
    comments: str


@router.post("/request", status_code=201)
def create_approval_request(body: ApprovalRequestCreate, db: Session = Depends(get_db),
                            current: User = Depends(get_current_user)):
    if body.type not in ("course_publish", "enrollment", "certificate"):
        raise HTTPException(status_code=400, detail="Invalid approval type")
    req = ApprovalRequest(
        type=body.type,
        requester_id=current.id,
        target_id=body.target_id,
        comments=body.comments,
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    return req


@router.get("/pending")
def get_pending(db: Session = Depends(get_db), _=Depends(require_admin)):
    rows = (
        db.query(ApprovalRequest, User.name.label("requester_name"), Course.title.label("course_title"))
        .join(User, User.id == ApprovalRequest.requester_id)
        .outerjoin(Course, Course.id == ApprovalRequest.target_id)
        .filter(ApprovalRequest.status == "pending")
        .order_by(ApprovalRequest.created_at.desc())
        .all()
    )
    result = []
    for ar, requester_name, course_title in rows:
        result.append({
            "id": ar.id,
            "type": ar.type,
            "requester_id": ar.requester_id,
            "requester_name": requester_name,
            "target_id": ar.target_id,
            "course_title": course_title or f"ID #{ar.target_id}",
            "status": ar.status,
            "comments": ar.comments,
            "created_at": ar.created_at.isoformat() if ar.created_at else None,
        })
    return result


@router.get("/history")
def get_history(db: Session = Depends(get_db), _=Depends(require_admin)):
    rows = (
        db.query(ApprovalRequest, User.name.label("requester_name"), Course.title.label("course_title"))
        .join(User, User.id == ApprovalRequest.requester_id)
        .outerjoin(Course, Course.id == ApprovalRequest.target_id)
        .filter(ApprovalRequest.status.in_(["approved", "rejected"]))
        .order_by(ApprovalRequest.reviewed_at.desc())
        .all()
    )
    result = []
    for ar, requester_name, course_title in rows:
        reviewer = None
        if ar.reviewer_id:
            rev = db.query(User.name).filter(User.id == ar.reviewer_id).scalar()
            reviewer = rev
        result.append({
            "id": ar.id,
            "type": ar.type,
            "requester_id": ar.requester_id,
            "requester_name": requester_name,
            "target_id": ar.target_id,
            "course_title": course_title or f"ID #{ar.target_id}",
            "status": ar.status,
            "comments": ar.comments,
            "reviewer_name": reviewer,
            "created_at": ar.created_at.isoformat() if ar.created_at else None,
            "reviewed_at": ar.reviewed_at.isoformat() if ar.reviewed_at else None,
        })
    return result


@router.get("/my")
def get_my_requests(db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    rows = (
        db.query(ApprovalRequest, Course.title.label("course_title"))
        .outerjoin(Course, Course.id == ApprovalRequest.target_id)
        .filter(ApprovalRequest.requester_id == current.id)
        .order_by(ApprovalRequest.created_at.desc())
        .all()
    )
    result = []
    for ar, course_title in rows:
        result.append({
            "id": ar.id,
            "type": ar.type,
            "target_id": ar.target_id,
            "course_title": course_title or f"ID #{ar.target_id}",
            "status": ar.status,
            "comments": ar.comments,
            "created_at": ar.created_at.isoformat() if ar.created_at else None,
            "reviewed_at": ar.reviewed_at.isoformat() if ar.reviewed_at else None,
        })
    return result


@router.put("/{request_id}/approve")
def approve_request(request_id: int, db: Session = Depends(get_db),
                    admin: User = Depends(require_admin)):
    ar = db.query(ApprovalRequest).filter(ApprovalRequest.id == request_id).first()
    if not ar:
        raise HTTPException(status_code=404, detail="Approval request not found")
    if ar.status != "pending":
        raise HTTPException(status_code=400, detail="Request is not pending")

    ar.status = "approved"
    ar.reviewer_id = admin.id
    ar.reviewed_at = datetime.now(timezone.utc)

    # Side effects based on type
    if ar.type == "course_publish":
        course = db.query(Course).filter(Course.id == ar.target_id).first()
        if course:
            course.is_active = True

    elif ar.type == "enrollment":
        # Create enrollment for the requester in the target course
        existing = db.query(Enrollment).filter(
            Enrollment.user_id == ar.requester_id,
            Enrollment.course_id == ar.target_id,
        ).first()
        if not existing:
            enrollment = Enrollment(user_id=ar.requester_id, course_id=ar.target_id)
            db.add(enrollment)

    db.commit()
    db.refresh(ar)
    return {"detail": "Request approved", "id": ar.id, "status": ar.status}


@router.put("/{request_id}/reject")
def reject_request(request_id: int, body: RejectBody, db: Session = Depends(get_db),
                   admin: User = Depends(require_admin)):
    ar = db.query(ApprovalRequest).filter(ApprovalRequest.id == request_id).first()
    if not ar:
        raise HTTPException(status_code=404, detail="Approval request not found")
    if ar.status != "pending":
        raise HTTPException(status_code=400, detail="Request is not pending")

    ar.status = "rejected"
    ar.reviewer_id = admin.id
    ar.comments = body.comments
    ar.reviewed_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(ar)
    return {"detail": "Request rejected", "id": ar.id, "status": ar.status}
