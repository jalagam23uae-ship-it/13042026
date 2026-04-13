from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.note import Note
from app.models.user import User
from app.schemas.note import NoteCreate, NoteUpdate, NoteOut
from app.routers.deps import get_current_user

router = APIRouter(prefix="/notes", tags=["Notes"])


@router.get("/lesson/{lesson_id}", response_model=List[NoteOut])
def get_lesson_notes(lesson_id: int, db: Session = Depends(get_db),
                     current: User = Depends(get_current_user)):
    return db.query(Note).filter(
        Note.user_id == current.id, Note.lesson_id == lesson_id
    ).order_by(Note.video_timestamp, Note.created_at).all()


@router.get("/my", response_model=List[NoteOut])
def my_notes(db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    return db.query(Note).filter(
        Note.user_id == current.id
    ).order_by(Note.created_at.desc()).limit(100).all()


@router.get("/bookmarks", response_model=List[NoteOut])
def my_bookmarks(db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    return db.query(Note).filter(
        Note.user_id == current.id, Note.is_bookmark == True
    ).order_by(Note.created_at.desc()).all()


@router.post("/", response_model=NoteOut, status_code=201)
def create_note(body: NoteCreate, db: Session = Depends(get_db),
                current: User = Depends(get_current_user)):
    note = Note(user_id=current.id, **body.model_dump())
    db.add(note); db.commit(); db.refresh(note)
    return note


@router.put("/{note_id}", response_model=NoteOut)
def update_note(note_id: int, body: NoteUpdate, db: Session = Depends(get_db),
                current: User = Depends(get_current_user)):
    note = db.query(Note).filter(Note.id == note_id, Note.user_id == current.id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(note, k, v)
    db.commit(); db.refresh(note)
    return note


@router.delete("/{note_id}", status_code=204)
def delete_note(note_id: int, db: Session = Depends(get_db),
                current: User = Depends(get_current_user)):
    note = db.query(Note).filter(Note.id == note_id, Note.user_id == current.id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    db.delete(note); db.commit()
