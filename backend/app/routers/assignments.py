from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timezone
from app.database import get_db
from app.models.assignment import Assignment, Submission
from app.models.user import User
from app.models.course import Course
from app.schemas.assignment import (
    AssignmentCreate, AssignmentUpdate, AssignmentOut,
    SubmissionCreate, GradeSubmission, SubmissionOut,
)
from app.routers.deps import get_current_user, require_admin, require_admin_or_instructor
from app.models.enrollment import Enrollment
from app.routers.notifications import send_notification

router = APIRouter(prefix="/assignments", tags=["Assignments"])


# ── Assignment CRUD (admin) ────────────────────────────────────────

@router.get("/course/{course_id}", response_model=List[AssignmentOut])
def list_assignments(course_id: int, db: Session = Depends(get_db),
                     _=Depends(get_current_user)):
    return db.query(Assignment).filter(
        Assignment.course_id == course_id
    ).order_by(Assignment.created_at.desc()).all()


@router.get("/all")
def all_assignments(db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    q = db.query(Assignment)
    if current.role not in ("admin", "instructor"):
        q = q.filter(Assignment.is_active == True)
    assignments = q.order_by(Assignment.created_at.desc()).all()
    course_ids = {a.course_id for a in assignments}
    titles = {c.id: c.title for c in db.query(Course).filter(Course.id.in_(course_ids)).all()} if course_ids else {}
    result = []
    for a in assignments:
        d = AssignmentOut.model_validate(a).model_dump()
        d["course_title"] = titles.get(a.course_id, "")
        result.append(d)
    return result


@router.post("/", response_model=AssignmentOut, status_code=201)
def create_assignment(body: AssignmentCreate, db: Session = Depends(get_db),
                      _=Depends(require_admin_or_instructor)):
    a = Assignment(**body.model_dump())
    db.add(a); db.commit(); db.refresh(a)
    return a


@router.put("/{assignment_id}", response_model=AssignmentOut)
def update_assignment(assignment_id: int, body: AssignmentUpdate,
                      db: Session = Depends(get_db), _=Depends(require_admin_or_instructor)):
    a = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Assignment not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(a, k, v)
    db.commit(); db.refresh(a)
    return a


@router.delete("/{assignment_id}", status_code=204)
def delete_assignment(assignment_id: int, db: Session = Depends(get_db),
                      _=Depends(require_admin_or_instructor)):
    a = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Assignment not found")
    db.query(Submission).filter(Submission.assignment_id == assignment_id).delete()
    db.delete(a); db.commit()


# ── Submissions (students) ─────────────────────────────────────────

@router.post("/submit")
def submit_assignment(body: SubmissionCreate, db: Session = Depends(get_db),
                      current: User = Depends(get_current_user)):
    assignment = db.query(Assignment).filter(Assignment.id == body.assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    enrollment = db.query(Enrollment).filter(
        Enrollment.user_id == current.id, Enrollment.course_id == assignment.course_id
    ).first()
    if not enrollment:
        raise HTTPException(status_code=403, detail="You must be enrolled in this course to submit")
    if assignment.due_date and datetime.now(timezone.utc) > assignment.due_date:
        raise HTTPException(status_code=400, detail="Submission deadline has passed")
    existing = db.query(Submission).filter(
        Submission.assignment_id == body.assignment_id,
        Submission.user_id == current.id,
    ).first()
    if existing:
        # Update existing submission
        existing.file_url = body.file_url
        existing.comments = body.comments
        existing.submitted_at = datetime.now(timezone.utc)
        existing.graded = False
        existing.score = None
        existing.feedback = None
        db.commit(); db.refresh(existing)
        return SubmissionOut.model_validate(existing)

    sub = Submission(
        assignment_id=body.assignment_id,
        user_id=current.id,
        file_url=body.file_url,
        comments=body.comments,
    )
    db.add(sub); db.commit(); db.refresh(sub)
    return SubmissionOut.model_validate(sub)


@router.get("/my-submissions")
def my_submissions(db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    subs = db.query(Submission).filter(Submission.user_id == current.id).order_by(Submission.submitted_at.desc()).all()
    a_ids = {s.assignment_id for s in subs}
    assignments = {a.id: a for a in db.query(Assignment).filter(Assignment.id.in_(a_ids)).all()} if a_ids else {}
    result = []
    for s in subs:
        d = SubmissionOut.model_validate(s).model_dump()
        a = assignments.get(s.assignment_id)
        d["assignment_title"] = a.title if a else ""
        d["max_score"] = a.max_score if a else 0
        result.append(d)
    return result


# ── Grading (admin/instructor) ─────────────────────────────────────

@router.get("/submissions/{assignment_id}")
def get_submissions(assignment_id: int, db: Session = Depends(get_db),
                    current: User = Depends(get_current_user)):
    if current.role not in ("admin", "instructor"):
        raise HTTPException(status_code=403, detail="Not allowed")
    subs = db.query(Submission).filter(
        Submission.assignment_id == assignment_id
    ).order_by(Submission.submitted_at.desc()).all()
    user_ids = {s.user_id for s in subs}
    names = {u.id: u.name for u in db.query(User).filter(User.id.in_(user_ids)).all()} if user_ids else {}
    result = []
    for s in subs:
        d = SubmissionOut.model_validate(s).model_dump()
        d["student_name"] = names.get(s.user_id, "Unknown")
        result.append(d)
    return result


@router.put("/grade/{submission_id}")
def grade_submission(submission_id: int, body: GradeSubmission,
                     db: Session = Depends(get_db),
                     current: User = Depends(get_current_user)):
    if current.role not in ("admin", "instructor"):
        raise HTTPException(status_code=403, detail="Not allowed")
    sub = db.query(Submission).filter(Submission.id == submission_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
    assignment = db.query(Assignment).filter(Assignment.id == sub.assignment_id).first()
    if body.score < 0 or (assignment and body.score > assignment.max_score):
        raise HTTPException(status_code=400, detail=f"Score must be between 0 and {assignment.max_score if assignment else 100}")
    sub.score = body.score
    sub.feedback = body.feedback
    sub.graded = True
    sub.graded_at = datetime.now(timezone.utc)
    db.commit(); db.refresh(sub)
    send_notification(
        db, sub.user_id,
        title="Assignment Graded",
        message=f"Your submission for '{assignment.title}' received {body.score}/{assignment.max_score}",
        type="success",
        link="/assignments",
    )
    return SubmissionOut.model_validate(sub)


@router.get("/all-submissions")
def all_submissions_audit(db: Session = Depends(get_db),
                          current: User = Depends(get_current_user)):
    """Admin/Instructor: all submissions across all assignments."""
    if current.role not in ("admin", "instructor"):
        raise HTTPException(status_code=403, detail="Not allowed")
    subs = db.query(Submission).order_by(Submission.submitted_at.desc()).all()
    a_ids = {s.assignment_id for s in subs}
    u_ids = {s.user_id for s in subs}
    assignments = {a.id: a for a in db.query(Assignment).filter(Assignment.id.in_(a_ids)).all()} if a_ids else {}
    users = {u.id: u for u in db.query(User).filter(User.id.in_(u_ids)).all()} if u_ids else {}
    return [
        {
            "id": s.id,
            "assignment_id": s.assignment_id,
            "assignment_title": assignments[s.assignment_id].title if s.assignment_id in assignments else f"#{s.assignment_id}",
            "max_score": assignments[s.assignment_id].max_score if s.assignment_id in assignments else None,
            "user_id": s.user_id,
            "student_name": users[s.user_id].name if s.user_id in users else f"User #{s.user_id}",
            "student_email": users[s.user_id].email if s.user_id in users else None,
            "score": s.score,
            "graded": s.graded,
            "submitted_at": s.submitted_at.isoformat() if s.submitted_at else None,
        }
        for s in subs
    ]
