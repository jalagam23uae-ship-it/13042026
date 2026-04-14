from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from app.database import get_db
from app.models.review import Review
from app.models.course import Course
from app.models.user import User
from app.schemas.review import ReviewCreate, ReviewOut
from app.routers.deps import get_current_user

router = APIRouter(prefix="/reviews", tags=["Reviews"])


@router.get("/course/{course_id}")
def get_course_reviews(course_id: int, db: Session = Depends(get_db),
                       _=Depends(get_current_user)):
    reviews = db.query(Review).filter(Review.course_id == course_id).order_by(Review.created_at.desc()).all()
    user_ids = {r.user_id for r in reviews}
    names = {u.id: u.name for u in db.query(User).filter(User.id.in_(user_ids)).all()} if user_ids else {}

    avg = db.query(func.avg(Review.rating)).filter(Review.course_id == course_id).scalar()
    count = len(reviews)

    return {
        "avg_rating": round(float(avg or 0), 1),
        "total_reviews": count,
        "reviews": [
            {**ReviewOut.model_validate(r).model_dump(), "author_name": names.get(r.user_id, "Unknown")}
            for r in reviews
        ],
    }


@router.get("/all")
def get_all_reviews(db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    """Admin / Instructor: see all reviews across all courses."""
    if current.role not in ("admin", "instructor"):
        raise HTTPException(status_code=403, detail="Not allowed")
    reviews = db.query(Review).order_by(Review.created_at.desc()).all()
    user_ids = {r.user_id for r in reviews}
    names = {u.id: u.name for u in db.query(User).filter(User.id.in_(user_ids)).all()} if user_ids else {}
    course_ids = {r.course_id for r in reviews}
    titles = {c.id: c.title for c in db.query(Course).filter(Course.id.in_(course_ids)).all()} if course_ids else {}
    return [
        {
            **ReviewOut.model_validate(r).model_dump(),
            "author_name": names.get(r.user_id, "Unknown"),
            "course_title": titles.get(r.course_id, f"Course #{r.course_id}"),
        }
        for r in reviews
    ]


@router.post("/", status_code=201)
def create_review(body: ReviewCreate, db: Session = Depends(get_db),
                  current: User = Depends(get_current_user)):
    existing = db.query(Review).filter(
        Review.user_id == current.id, Review.course_id == body.course_id
    ).first()
    if existing:
        existing.rating = body.rating
        existing.comment = body.comment
        db.commit(); db.refresh(existing)
        return {**ReviewOut.model_validate(existing).model_dump(), "author_name": current.name}

    r = Review(user_id=current.id, **body.model_dump())
    db.add(r); db.commit(); db.refresh(r)
    return {**ReviewOut.model_validate(r).model_dump(), "author_name": current.name}


@router.delete("/{review_id}", status_code=204)
def delete_review(review_id: int, db: Session = Depends(get_db),
                  current: User = Depends(get_current_user)):
    r = db.query(Review).filter(Review.id == review_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Review not found")
    if r.user_id != current.id and current.role != "admin":
        raise HTTPException(status_code=403, detail="Not allowed")
    db.delete(r); db.commit()
