from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.discussion import Discussion
from app.models.user import User
from app.schemas.discussion import DiscussionCreate, DiscussionOut
from app.routers.deps import get_current_user, require_admin

router = APIRouter(prefix="/discussions", tags=["Discussions"])


def _build_thread(db: Session, posts: list):
    user_ids = {p.user_id for p in posts}
    names = {u.id: u.name for u in db.query(User).filter(User.id.in_(user_ids)).all()} if user_ids else {}
    by_parent = {}
    for p in posts:
        by_parent.setdefault(p.parent_id, []).append(p)

    def to_dict(p):
        return {
            "id": p.id, "lesson_id": p.lesson_id, "user_id": p.user_id,
            "parent_id": p.parent_id, "content": p.content,
            "is_answer": p.is_answer, "created_at": p.created_at,
            "author_name": names.get(p.user_id, "Unknown"),
            "replies": [to_dict(r) for r in by_parent.get(p.id, [])],
        }

    return [to_dict(p) for p in by_parent.get(None, [])]


@router.get("/lesson/{lesson_id}")
def get_lesson_discussions(lesson_id: int, db: Session = Depends(get_db),
                           _=Depends(get_current_user)):
    posts = db.query(Discussion).filter(
        Discussion.lesson_id == lesson_id
    ).order_by(Discussion.created_at).all()
    return _build_thread(db, posts)


@router.post("/")
def create_discussion(body: DiscussionCreate, db: Session = Depends(get_db),
                      current: User = Depends(get_current_user)):
    if body.parent_id:
        parent = db.query(Discussion).filter(Discussion.id == body.parent_id).first()
        if not parent:
            raise HTTPException(status_code=404, detail="Parent post not found")
    d = Discussion(
        lesson_id=body.lesson_id,
        user_id=current.id,
        parent_id=body.parent_id,
        content=body.content,
    )
    db.add(d); db.commit(); db.refresh(d)
    return {
        "id": d.id, "lesson_id": d.lesson_id, "user_id": d.user_id,
        "parent_id": d.parent_id, "content": d.content,
        "is_answer": d.is_answer, "created_at": d.created_at,
        "author_name": current.name, "replies": [],
    }


@router.put("/{post_id}/mark-answer")
def mark_as_answer(post_id: int, db: Session = Depends(get_db),
                   current: User = Depends(get_current_user)):
    if current.role not in ("admin", "instructor"):
        raise HTTPException(status_code=403, detail="Only admins/instructors can mark answers")
    post = db.query(Discussion).filter(Discussion.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    post.is_answer = not post.is_answer
    db.commit()
    return {"id": post.id, "is_answer": post.is_answer}


@router.delete("/{post_id}", status_code=204)
def delete_discussion(post_id: int, db: Session = Depends(get_db),
                      current: User = Depends(get_current_user)):
    post = db.query(Discussion).filter(Discussion.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post.user_id != current.id and current.role != "admin":
        raise HTTPException(status_code=403, detail="Not allowed")
    # Delete replies too
    db.query(Discussion).filter(Discussion.parent_id == post_id).delete()
    db.delete(post); db.commit()
