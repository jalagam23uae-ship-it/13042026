from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.wishlist import Wishlist
from app.models.course import Course
from app.models.user import User
from app.routers.deps import get_current_user

router = APIRouter(prefix="/wishlist", tags=["Wishlist"])


@router.get("/")
def my_wishlist(db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    items = db.query(Wishlist).filter(Wishlist.user_id == current.id).order_by(Wishlist.created_at.desc()).all()
    course_ids = [w.course_id for w in items]
    courses = {c.id: c for c in db.query(Course).filter(Course.id.in_(course_ids)).all()} if course_ids else {}
    return [{
        "id": w.id,
        "course_id": w.course_id,
        "course_title": courses[w.course_id].title if w.course_id in courses else "",
        "course_description": courses[w.course_id].description if w.course_id in courses else "",
        "thumbnail_url": courses[w.course_id].thumbnail_url if w.course_id in courses else None,
        "category": courses[w.course_id].category if w.course_id in courses else None,
        "created_at": w.created_at,
    } for w in items]


@router.post("/{course_id}", status_code=201)
def add_to_wishlist(course_id: int, db: Session = Depends(get_db),
                    current: User = Depends(get_current_user)):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    existing = db.query(Wishlist).filter(
        Wishlist.user_id == current.id, Wishlist.course_id == course_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already in wishlist")
    w = Wishlist(user_id=current.id, course_id=course_id)
    db.add(w); db.commit()
    return {"message": "Added to wishlist"}


@router.delete("/{course_id}", status_code=204)
def remove_from_wishlist(course_id: int, db: Session = Depends(get_db),
                         current: User = Depends(get_current_user)):
    w = db.query(Wishlist).filter(
        Wishlist.user_id == current.id, Wishlist.course_id == course_id
    ).first()
    if not w:
        raise HTTPException(status_code=404, detail="Not in wishlist")
    db.delete(w); db.commit()
