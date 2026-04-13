"""
Admin endpoint to upload a DOCX course guide.
Parses the document, extracts topics by headings, creates course + lessons.
Admin can then assign videos to each topic.
"""
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Form
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app.models.course import Course
from app.models.lesson import Lesson
from app.models.user import User
from app.services.docx_parser import parse_course_docx
from app.routers.deps import require_admin

router = APIRouter(prefix="/course-import", tags=["Course Import"])


@router.post("/preview")
async def preview_docx(file: UploadFile = File(...), _=Depends(require_admin)):
    """
    Upload a DOCX file and preview the extracted structure without saving.
    Returns parsed topics/lessons that admin can review before importing.
    """
    import traceback
    fname = (file.filename or "").lower()
    print(f"[DOCX PREVIEW] filename='{file.filename}' content_type='{file.content_type}' fname_lower='{fname}'")

    if not fname.endswith('.docx'):
        detail = f"File must be .docx format (got: '{file.filename}', content_type: '{file.content_type}')"
        print(f"[DOCX PREVIEW] REJECTED: {detail}")
        raise HTTPException(status_code=400, detail=detail)

    content = await file.read()
    print(f"[DOCX PREVIEW] Read {len(content)} bytes")

    if len(content) > 50 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 50MB)")

    try:
        result = parse_course_docx(content)
    except Exception as e:
        tb = traceback.format_exc()
        print(f"[DOCX PREVIEW] PARSE ERROR: {tb}")
        raise HTTPException(status_code=400, detail=f"Failed to parse DOCX: {str(e)}")

    return {
        "filename": file.filename,
        "parsed": result,
        "lesson_count": len(result["flat_lessons"]),
        "section_count": len(result["sections"]),
    }


@router.post("/import")
async def import_docx(
    file: UploadFile = File(...),
    course_title: Optional[str] = Form(None),
    course_description: Optional[str] = Form(None),
    category: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    """
    Upload a DOCX file and create a course with lessons from the extracted topics.
    Each Heading 2 becomes a lesson. Admin can later add videos per lesson.
    """
    fname = (file.filename or "").lower()
    if not fname.endswith('.docx'):
        raise HTTPException(status_code=400, detail=f"File must be .docx format (got: '{file.filename}')")

    content = await file.read()
    try:
        result = parse_course_docx(content)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse DOCX: {str(e)}")

    # Create course
    title = course_title or result["title"]
    desc = course_description or result["description"]

    course = Course(
        title=title,
        description=desc,
        category=category,
        is_active=True,
    )
    db.add(course); db.flush()

    # Create lessons from parsed topics
    lessons_created = []
    for item in result["flat_lessons"]:
        lesson = Lesson(
            course_id=course.id,
            title=item["title"],
            description=item["description"],
            content_type="article",  # Default to article, admin adds video later
            sort_order=item["sort_order"],
            duration_min=max(5, len(item["description"]) // 200),  # Estimate reading time
        )
        db.add(lesson)
        lessons_created.append(item["title"])

    db.commit(); db.refresh(course)

    return {
        "course_id": course.id,
        "course_title": course.title,
        "lessons_created": len(lessons_created),
        "lesson_titles": lessons_created,
        "message": f"Course '{course.title}' created with {len(lessons_created)} lessons from DOCX. Add videos to each lesson in Course Content.",
    }


@router.post("/import-to-existing/{course_id}")
async def import_docx_to_course(
    course_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    """
    Upload a DOCX file and add lessons to an existing course.
    Appends to existing lessons (does not overwrite).
    """
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    fname = (file.filename or "").lower()
    if not fname.endswith('.docx'):
        raise HTTPException(status_code=400, detail=f"File must be .docx format (got: '{file.filename}')")

    content = await file.read()
    try:
        result = parse_course_docx(content)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse DOCX: {str(e)}")

    # Get current max sort_order
    from sqlalchemy import func
    max_order = db.query(func.max(Lesson.sort_order)).filter(
        Lesson.course_id == course_id
    ).scalar() or 0

    lessons_created = []
    for item in result["flat_lessons"]:
        max_order += 1
        lesson = Lesson(
            course_id=course_id,
            title=item["title"],
            description=item["description"],
            content_type="article",
            sort_order=max_order,
            duration_min=max(5, len(item["description"]) // 200),
        )
        db.add(lesson)
        lessons_created.append(item["title"])

    db.commit()

    return {
        "course_id": course_id,
        "lessons_added": len(lessons_created),
        "lesson_titles": lessons_created,
        "message": f"Added {len(lessons_created)} lessons to '{course.title}'. Add videos in Course Content.",
    }
