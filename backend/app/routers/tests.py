import random
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.enrollment import Enrollment
from app.models.test import Question, Test, TestResult, UserAnswer
from app.models.user import User
from app.routers.deps import get_current_user, require_admin, require_admin_or_instructor
from app.routers.notifications import send_notification
from app.schemas.test import (
    QuestionOut,
    TestCreate,
    TestOut,
    TestResultOut,
    TestSubmit,
)


def _assert_can_access_test(db: Session, user: User, test: Test) -> None:
    """Admins and instructors always pass; students must be enrolled in the test's course."""
    if user.role in ("admin", "instructor"):
        return
    if test.course_id is None:
        return
    enrolled = (
        db.query(Enrollment)
        .filter(Enrollment.user_id == user.id, Enrollment.course_id == test.course_id)
        .first()
    )
    if not enrolled:
        raise HTTPException(status_code=403, detail="Not enrolled in this course")

router = APIRouter(prefix="/tests", tags=["Tests"])


@router.get("/", response_model=List[TestOut])
def list_tests(db: Session = Depends(get_db), _=Depends(get_current_user)):
    tests = db.query(Test).filter(Test.is_active == True).all()
    out = []
    for t in tests:
        d = TestOut.model_validate(t).model_dump()
        d["question_count"] = db.query(func.count(Question.id)).filter(Question.test_id == t.id).scalar()
        out.append(d)
    return out


@router.get("/{test_id}")
def get_test_with_questions(test_id: int, db: Session = Depends(get_db),
                            user: User = Depends(get_current_user)):
    """Get test details with its questions (options only, no correct answer)."""
    test = db.query(Test).filter(Test.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    _assert_can_access_test(db, user, test)

    questions = db.query(Question).filter(Question.test_id == test_id).all()
    # Shuffle questions for randomization
    shuffled = list(questions)
    random.shuffle(shuffled)

    return {
        "id": test.id,
        "title": test.title,
        "course_id": test.course_id,
        "pass_mark": test.pass_mark,
        "duration_min": test.duration_min,
        "question_count": len(questions),
        "questions": [
            {
                "id": q.id,
                "body": q.body,
                "option_a": q.option_a,
                "option_b": q.option_b,
                "option_c": q.option_c,
                "option_d": q.option_d,
                "marks": q.marks,
            }
            for q in shuffled
        ],
    }


@router.get("/{test_id}/questions", response_model=List[QuestionOut])
def get_questions(test_id: int, db: Session = Depends(get_db),
                  user: User = Depends(get_current_user)):
    test = db.query(Test).filter(Test.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    _assert_can_access_test(db, user, test)
    return db.query(Question).filter(Question.test_id == test_id).all()


@router.post("/submit", response_model=TestResultOut)
def submit_test(body: TestSubmit, db: Session = Depends(get_db),
                user: User = Depends(get_current_user)):
    test = db.query(Test).filter(Test.id == body.test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    _assert_can_access_test(db, user, test)
    questions = db.query(Question).filter(Question.test_id == body.test_id).all()
    q_map = {q.id: q for q in questions}
    score, total = 0, sum(q.marks for q in questions)
    answers_to_insert = []
    for ans in body.answers:
        q = q_map.get(ans.question_id)
        if q:
            correct = q.correct_opt.upper() == ans.chosen_opt.upper()
            if correct:
                score += q.marks
            answers_to_insert.append((ans.question_id, ans.chosen_opt, correct))
    pct = round(score / total * 100, 2) if total else 0
    attempt = db.query(TestResult).filter(
        TestResult.user_id == user.id, TestResult.test_id == body.test_id
    ).count() + 1
    result = TestResult(user_id=user.id, test_id=body.test_id, score=score,
                        total_marks=total, percentage=pct, passed=(pct >= test.pass_mark),
                        attempt_no=attempt)
    db.add(result); db.flush()
    for qid, opt, correct in answers_to_insert:
        db.add(UserAnswer(result_id=result.id, question_id=qid, chosen_opt=opt, is_correct=correct))

    # Send notification
    status_text = "Passed" if pct >= test.pass_mark else "Failed"
    send_notification(
        db, user.id,
        title=f"Test Result: {test.title}",
        message=f"You scored {score}/{total} ({pct}%) - {status_text}",
        type="success" if pct >= test.pass_mark else "warning",
        link="/results",
    )

    db.commit(); db.refresh(result)
    return result


@router.get("/{test_id}/results")
def get_test_results(test_id: int, db: Session = Depends(get_db),
                     current: User = Depends(get_current_user)):
    """Admin/Instructor: all student submissions for a test, with student info."""
    if current.role not in ("admin", "instructor"):
        raise HTTPException(status_code=403, detail="Not allowed")
    test = db.query(Test).filter(Test.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    rows = db.query(TestResult).filter(TestResult.test_id == test_id)\
             .order_by(TestResult.taken_at.desc()).all()
    user_ids = {r.user_id for r in rows}
    users = {u.id: u for u in db.query(User).filter(User.id.in_(user_ids)).all()} if user_ids else {}
    return [
        {
            "id": r.id,
            "user_id": r.user_id,
            "student_name": users[r.user_id].name if r.user_id in users else f"User #{r.user_id}",
            "student_email": users[r.user_id].email if r.user_id in users else "",
            "score": r.score,
            "total_marks": r.total_marks,
            "percentage": r.percentage,
            "passed": r.passed,
            "attempt_no": r.attempt_no,
            "taken_at": r.taken_at.isoformat() if r.taken_at else None,
        }
        for r in rows
    ]


@router.delete("/{test_id}", status_code=204)
def delete_test(test_id: int, db: Session = Depends(get_db),
                _: User = Depends(require_admin_or_instructor)):
    test = db.query(Test).filter(Test.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    db.query(UserAnswer).filter(
        UserAnswer.result_id.in_(
            db.query(TestResult.id).filter(TestResult.test_id == test_id)
        )
    ).delete(synchronize_session=False)
    db.query(TestResult).filter(TestResult.test_id == test_id).delete(synchronize_session=False)
    db.query(Question).filter(Question.test_id == test_id).delete(synchronize_session=False)
    db.delete(test); db.commit()


@router.post("/", status_code=201)
def create_test(body: TestCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    """Admin: create a new test with questions."""
    test = Test(
        title=body.title,
        course_id=body.course_id,
        pass_mark=body.pass_mark,
        duration_min=body.duration_min,
    )
    db.add(test)
    db.flush()

    for q in body.questions:
        db.add(Question(
            test_id=test.id,
            body=q.body,
            option_a=q.option_a,
            option_b=q.option_b,
            option_c=q.option_c,
            option_d=q.option_d,
            correct_opt=q.correct_opt,
            marks=q.marks,
        ))

    db.commit()
    db.refresh(test)
    qcount = db.query(func.count(Question.id)).filter(Question.test_id == test.id).scalar()
    return {"id": test.id, "title": test.title, "question_count": qcount}
