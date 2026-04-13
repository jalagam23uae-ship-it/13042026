from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from app.database import get_db
from app.models.test import TestResult, Test
from app.schemas.test import TestResultOut
from app.routers.deps import get_current_user, require_admin
from app.models.user import User

router = APIRouter(prefix="/results", tags=["Results"])


def _enrich_with_title(db: Session, rows):
    test_ids = {r.test_id for r in rows}
    titles = {t.id: t.title for t in db.query(Test).filter(Test.id.in_(test_ids)).all()} if test_ids else {}
    out = []
    for r in rows:
        d = TestResultOut.model_validate(r).model_dump()
        d["test_title"] = titles.get(r.test_id, f"Test #{r.test_id}")
        out.append(d)
    return out


@router.get("/me")
def my_results(db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    rows = db.query(TestResult).filter(TestResult.user_id == current.id).order_by(TestResult.taken_at.desc()).all()
    return _enrich_with_title(db, rows)


@router.get("/all")
def all_results(db: Session = Depends(get_db), _=Depends(require_admin)):
    rows = db.query(TestResult).order_by(TestResult.taken_at.desc()).all()
    return _enrich_with_title(db, rows)


@router.get("/user/{user_id}", response_model=List[TestResultOut])
def get_user_results(user_id: int, db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    if current.role != "admin" and current.id != user_id:
        raise HTTPException(status_code=403, detail="Not allowed")
    return db.query(TestResult).filter(TestResult.user_id == user_id).order_by(TestResult.taken_at.desc()).all()


@router.get("/stats/{user_id}")
def get_result_stats(user_id: int, db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    if current.role != "admin" and current.id != user_id:
        raise HTTPException(status_code=403, detail="Not allowed")
    total = db.query(func.count(TestResult.id)).filter(TestResult.user_id == user_id).scalar()
    passed = db.query(func.count(TestResult.id)).filter(TestResult.user_id == user_id, TestResult.passed == True).scalar()
    avg = db.query(func.avg(TestResult.percentage)).filter(TestResult.user_id == user_id).scalar()
    return {"tests_taken": total, "tests_passed": passed, "avg_score": round(float(avg or 0), 1)}
