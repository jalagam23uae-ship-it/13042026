from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.learning_path import LearningPath, LearningPathCourse, LearningPathEnrollment
from app.models.course import Course
from app.models.user import User
from app.schemas.learning_path import LearningPathCreate, LearningPathOut
from app.routers.deps import get_current_user, require_admin

router = APIRouter(prefix="/learning-paths", tags=["Learning Paths"])


def _enrich(db: Session, paths, user_id=None):
    result = []
    for p in paths:
        pcs = db.query(LearningPathCourse).filter(
            LearningPathCourse.path_id == p.id
        ).order_by(LearningPathCourse.sort_order).all()
        course_ids = [pc.course_id for pc in pcs]
        courses = db.query(Course).filter(Course.id.in_(course_ids)).all() if course_ids else []
        course_map = {c.id: c for c in courses}

        enrolled = False
        if user_id:
            enrolled = db.query(LearningPathEnrollment).filter(
                LearningPathEnrollment.path_id == p.id,
                LearningPathEnrollment.user_id == user_id,
            ).first() is not None

        result.append({
            "id": p.id,
            "title": p.title,
            "description": p.description,
            "thumbnail_url": p.thumbnail_url,
            "is_active": p.is_active,
            "created_at": p.created_at,
            "enrolled": enrolled,
            "course_count": len(pcs),
            "courses": [
                {"id": cid, "title": course_map[cid].title if cid in course_map else f"Course #{cid}",
                 "sort_order": pc.sort_order}
                for pc, cid in zip(pcs, course_ids) if cid in course_map
            ],
        })
    return result


@router.get("/")
def list_paths(db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    paths = db.query(LearningPath).filter(LearningPath.is_active == True).order_by(LearningPath.title).all()
    return _enrich(db, paths, current.id)


@router.get("/{path_id}")
def get_path(path_id: int, db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    p = db.query(LearningPath).filter(LearningPath.id == path_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Path not found")
    return _enrich(db, [p], current.id)[0]


@router.post("/enroll/{path_id}")
def enroll_in_path(path_id: int, db: Session = Depends(get_db),
                   current: User = Depends(get_current_user)):
    path = db.query(LearningPath).filter(LearningPath.id == path_id).first()
    if not path:
        raise HTTPException(status_code=404, detail="Path not found")
    existing = db.query(LearningPathEnrollment).filter(
        LearningPathEnrollment.path_id == path_id,
        LearningPathEnrollment.user_id == current.id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already enrolled")
    e = LearningPathEnrollment(user_id=current.id, path_id=path_id)
    db.add(e); db.commit()

    # Auto-enroll in all courses in the path
    from app.models.enrollment import Enrollment
    pcs = db.query(LearningPathCourse).filter(LearningPathCourse.path_id == path_id).all()
    for pc in pcs:
        exists = db.query(Enrollment).filter(
            Enrollment.user_id == current.id, Enrollment.course_id == pc.course_id
        ).first()
        if not exists:
            db.add(Enrollment(user_id=current.id, course_id=pc.course_id))
    db.commit()
    return {"message": "Enrolled in learning path"}


@router.post("/", status_code=201)
def create_path(body: LearningPathCreate, db: Session = Depends(get_db),
                _=Depends(require_admin)):
    p = LearningPath(title=body.title, description=body.description, thumbnail_url=body.thumbnail_url)
    db.add(p); db.flush()
    for i, cid in enumerate(body.course_ids):
        db.add(LearningPathCourse(path_id=p.id, course_id=cid, sort_order=i))
    db.commit(); db.refresh(p)
    return _enrich(db, [p])[0]


@router.delete("/{path_id}", status_code=204)
def delete_path(path_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    p = db.query(LearningPath).filter(LearningPath.id == path_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Path not found")
    db.query(LearningPathCourse).filter(LearningPathCourse.path_id == path_id).delete()
    db.query(LearningPathEnrollment).filter(LearningPathEnrollment.path_id == path_id).delete()
    db.delete(p); db.commit()
