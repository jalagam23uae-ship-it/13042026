from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.announcement import Announcement
from app.models.user import User
from app.models.course import Course
from app.schemas.announcement import AnnouncementCreate, AnnouncementOut
from app.routers.deps import get_current_user, require_admin

router = APIRouter(prefix="/announcements", tags=["Announcements"])


def _enrich(db: Session, rows):
    user_ids = {a.author_id for a in rows}
    course_ids = {a.course_id for a in rows if a.course_id}
    names = {u.id: u.name for u in db.query(User).filter(User.id.in_(user_ids)).all()} if user_ids else {}
    titles = {c.id: c.title for c in db.query(Course).filter(Course.id.in_(course_ids)).all()} if course_ids else {}
    result = []
    for a in rows:
        d = AnnouncementOut.model_validate(a).model_dump()
        d["author_name"] = names.get(a.author_id, "Unknown")
        d["course_title"] = titles.get(a.course_id) if a.course_id else "Global"
        result.append(d)
    return result


@router.get("/")
def list_announcements(db: Session = Depends(get_db), _=Depends(get_current_user)):
    rows = db.query(Announcement).order_by(
        Announcement.is_pinned.desc(), Announcement.created_at.desc()
    ).limit(50).all()
    return _enrich(db, rows)


@router.get("/course/{course_id}")
def course_announcements(course_id: int, db: Session = Depends(get_db),
                         _=Depends(get_current_user)):
    rows = db.query(Announcement).filter(
        (Announcement.course_id == course_id) | (Announcement.course_id == None)
    ).order_by(Announcement.is_pinned.desc(), Announcement.created_at.desc()).all()
    return _enrich(db, rows)


@router.post("/", status_code=201)
def create_announcement(body: AnnouncementCreate, db: Session = Depends(get_db),
                        current: User = Depends(get_current_user)):
    if current.role not in ("admin", "instructor"):
        raise HTTPException(status_code=403, detail="Only admins/instructors can post announcements")
    a = Announcement(author_id=current.id, **body.model_dump())
    db.add(a); db.commit(); db.refresh(a)
    result = AnnouncementOut.model_validate(a).model_dump()
    result["author_name"] = current.name
    result["course_title"] = None
    if a.course_id:
        c = db.query(Course).filter(Course.id == a.course_id).first()
        result["course_title"] = c.title if c else None
    return result


@router.delete("/{announcement_id}", status_code=204)
def delete_announcement(announcement_id: int, db: Session = Depends(get_db),
                        current: User = Depends(get_current_user)):
    a = db.query(Announcement).filter(Announcement.id == announcement_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Announcement not found")
    if a.author_id != current.id and current.role != "admin":
        raise HTTPException(status_code=403, detail="Not allowed")
    db.delete(a); db.commit()
