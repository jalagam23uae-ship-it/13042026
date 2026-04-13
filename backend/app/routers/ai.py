"""AI Assistant endpoint - proxies to local LLM for course-aware chat."""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
import httpx
import json

from app.database import get_db
from app.models.user import User
from app.models.course import Course
from app.models.lesson import Lesson
from app.routers.deps import get_current_user, require_admin_or_instructor

router = APIRouter(prefix="/ai", tags=["AI Assistant"])

DEFAULT_LLM_BASE_URL = "http://10.10.100.201:32080/v1"
DEFAULT_LLM_MODEL = "meta-llama/Llama-4-Scout-17B-16E-Instruct"


def _get_llm_config(db):
    from app.routers.settings import get_setting
    return {
        "base_url": get_setting(db, "llm_base_url") or DEFAULT_LLM_BASE_URL,
        "model": get_setting(db, "llm_model") or DEFAULT_LLM_MODEL,
        "max_tokens": int(get_setting(db, "llm_max_tokens") or "1024"),
        "temperature": float(get_setting(db, "llm_temperature") or "0.7"),
    }


def _check_ai_enabled(db):
    from app.routers.settings import get_setting
    if get_setting(db, "ai_enabled") != "true":
        raise HTTPException(status_code=403, detail="AI assistant is disabled by administrator")


class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    course_id: Optional[int] = None
    lesson_id: Optional[int] = None
    history: List[ChatMessage] = []


def build_system_prompt(db: Session, course_id: Optional[int], lesson_id: Optional[int]) -> str:
    base = (
        "You are an AI Learning Assistant for an online Automatic Training Platform (ATP). "
        "You help students understand course material, explain concepts, answer questions, "
        "and provide study tips. Be encouraging, clear, and concise. "
        "Use examples when helpful. Format responses with markdown for readability."
    )

    if not course_id:
        return base + "\nThe student is browsing the LMS. Help them with general learning questions."

    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        return base

    lessons = db.query(Lesson).filter(
        Lesson.course_id == course_id
    ).order_by(Lesson.sort_order).all()

    lesson_list = "\n".join(
        f"  {i+1}. {l.title}" + (f" - {l.description[:100]}" if l.description else "")
        for i, l in enumerate(lessons)
    )

    context = (
        f"\n\nCurrent course: {course.title}"
        f"\nCourse description: {course.description or 'N/A'}"
        f"\n\nCourse lessons:\n{lesson_list}"
    )

    if lesson_id:
        lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
        if lesson:
            context += (
                f"\n\nThe student is currently on lesson: {lesson.title}"
                f"\nLesson content: {lesson.description or 'N/A'}"
            )

    return base + context


@router.post("/chat")
async def chat(body: ChatRequest, db: Session = Depends(get_db),
               current: User = Depends(get_current_user)):
    """Send a message to the AI assistant with course context."""
    _check_ai_enabled(db)
    llm = _get_llm_config(db)
    system_prompt = build_system_prompt(db, body.course_id, body.lesson_id)

    messages = [{"role": "system", "content": system_prompt}]

    for msg in body.history[-10:]:
        messages.append({"role": msg.role, "content": msg.content})

    messages.append({"role": "user", "content": body.message})

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                f"{llm['base_url']}/chat/completions",
                json={
                    "model": llm["model"],
                    "messages": messages,
                    "max_tokens": llm["max_tokens"],
                    "temperature": llm["temperature"],
                },
            )
            resp.raise_for_status()
            data = resp.json()
            reply = data["choices"][0]["message"]["content"]

            # Generate follow-up questions
            followup_msgs = messages + [
                {"role": "assistant", "content": reply},
                {"role": "user", "content": "Based on your last answer, suggest exactly 3 short follow-up questions the student might want to ask next. Return ONLY the questions, one per line, no numbering or bullets."},
            ]
            try:
                followup_resp = await client.post(
                    f"{llm['base_url']}/chat/completions",
                    json={
                        "model": llm["model"],
                        "messages": followup_msgs,
                        "max_tokens": 150,
                        "temperature": 0.8,
                    },
                )
                followup_resp.raise_for_status()
                followup_text = followup_resp.json()["choices"][0]["message"]["content"]
                followups = [q.strip().lstrip('0123456789.-) ') for q in followup_text.strip().split('\n') if q.strip()][:3]
            except Exception:
                followups = []

            return {"reply": reply, "followups": followups}
    except httpx.ConnectError:
        raise HTTPException(status_code=503, detail="AI service unavailable")
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=502, detail=f"AI service error: {e.response.status_code}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI error: {str(e)}")


@router.post("/suggest")
async def suggest_questions(body: ChatRequest, db: Session = Depends(get_db),
                            current: User = Depends(get_current_user)):
    """Get suggested questions based on current course/lesson context."""
    if not body.course_id:
        return {"suggestions": [
            "What courses should I start with?",
            "How do I track my progress?",
            "What are some effective study techniques?",
        ]}

    course = db.query(Course).filter(Course.id == body.course_id).first()
    if not course:
        return {"suggestions": []}

    lesson = None
    if body.lesson_id:
        lesson = db.query(Lesson).filter(Lesson.id == body.lesson_id).first()

    suggestions = []
    if lesson:
        suggestions = [
            f"Explain {lesson.title} in simple terms",
            f"What are the key concepts in {lesson.title}?",
            f"Give me a practice exercise for {lesson.title}",
            f"How does {lesson.title} relate to real-world applications?",
        ]
    else:
        suggestions = [
            f"Give me an overview of {course.title}",
            f"What are the prerequisites for {course.title}?",
            f"What will I learn in {course.title}?",
            f"Create a study plan for {course.title}",
        ]

    return {"suggestions": suggestions}


@router.post("/parse-document")
async def parse_document_with_ai(file: UploadFile = File(...),
                                  db: Session = Depends(get_db),
                                  _=Depends(require_admin_or_instructor)):
    """Upload any document, extract text, send to LLM to generate full course structure. Admin/instructor only."""
    _check_ai_enabled(db)
    llm = _get_llm_config(db)
    from app.services.docx_parser import parse_course_docx
    import io

    MAX_SIZE = 10 * 1024 * 1024  # 10 MB
    fname = (file.filename or "").lower()
    content = await file.read()

    if len(content) > MAX_SIZE:
        raise HTTPException(status_code=400, detail=f"File too large. Max size is {MAX_SIZE // (1024*1024)}MB")

    # Extract raw text based on file type
    raw_text = ""
    if fname.endswith('.docx'):
        try:
            from docx import Document
            doc = Document(io.BytesIO(content))
            raw_text = "\n".join(p.text for p in doc.paragraphs if p.text.strip())
        except Exception:
            raw_text = content.decode('utf-8', errors='ignore')
    elif fname.endswith('.txt') or fname.endswith('.md'):
        raw_text = content.decode('utf-8', errors='ignore')
    elif fname.endswith('.pdf'):
        try:
            import subprocess
            # Fallback: just read as text
            raw_text = content.decode('utf-8', errors='ignore')
        except Exception:
            raw_text = content.decode('utf-8', errors='ignore')
    else:
        raw_text = content.decode('utf-8', errors='ignore')

    if not raw_text.strip():
        raise HTTPException(status_code=400, detail="Could not extract text from file")

    # Truncate to ~8000 chars to fit in LLM context
    truncated = raw_text[:8000]

    prompt = f"""You are a course design expert. Analyze the following document content and generate a complete course structure in JSON format.

DOCUMENT CONTENT:
---
{truncated}
---

Generate a JSON object with ALL of these fields:
{{
  "title": "<course title>",
  "description": "<2-3 sentence course description>",
  "category": "<single category>",
  "tags": ["tag1", "tag2", "tag3"],
  "learning_outcomes": ["what student will learn 1", "what student will learn 2", ...],
  "requirements": ["prerequisite 1", "prerequisite 2"],
  "total_hours": <estimated hours>,
  "total_articles": <estimated articles>,
  "total_exercises": <estimated exercises>,
  "total_resources": <estimated resources>,
  "sections": [
    {{
      "title": "<section title>",
      "sort_order": 1,
      "lessons": [
        {{
          "title": "<lesson title>",
          "description": "<lesson description from document>",
          "content_type": "article",
          "duration_min": <estimated minutes>,
          "sort_order": 1
        }}
      ]
    }}
  ]
}}

Rules:
- Extract real topics/sections from the document, don't invent content
- Each major topic should be a section
- Each sub-topic or concept should be a lesson
- Keep lesson descriptions from the actual document content
- Generate 6-10 learning outcomes based on the content
- Suggest 2-4 realistic prerequisites
- Return ONLY valid JSON, no markdown, no explanation"""

    try:
        async with httpx.AsyncClient(timeout=90.0) as client:
            resp = await client.post(
                f"{llm['base_url']}/chat/completions",
                json={
                    "model": llm["model"],
                    "messages": [
                        {"role": "system", "content": "You are a course design expert. Always respond with valid JSON only. No markdown code blocks."},
                        {"role": "user", "content": prompt},
                    ],
                    "max_tokens": 4096,
                    "temperature": 0.3,
                },
            )
            resp.raise_for_status()
            text = resp.json()["choices"][0]["message"]["content"].strip()
            # Extract JSON from response
            if "```" in text:
                text = text.split("```")[1]
                if text.startswith("json"):
                    text = text[4:]
                text = text.strip()
            result = json.loads(text)
            result["_raw_text_length"] = len(raw_text)
            result["_filename"] = file.filename
            return result
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"LLM returned invalid JSON: {str(e)}")
    except httpx.ConnectError:
        raise HTTPException(status_code=503, detail="AI service unavailable")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI error: {str(e)}")


class CourseGenRequest(BaseModel):
    title: str
    description: Optional[str] = ""
    lessons: List[str] = []  # lesson titles


@router.post("/generate-course-meta")
async def generate_course_metadata(body: CourseGenRequest,
                                    db: Session = Depends(get_db),
                                    _=Depends(get_current_user)):
    """Use LLM to generate course metadata from title, description, and lesson list."""
    _check_ai_enabled(db)
    llm = _get_llm_config(db)
    lessons_text = "\n".join(f"  - {l}" for l in body.lessons) if body.lessons else "No lessons yet."

    prompt = f"""You are a course design expert. Based on the following course information, generate structured metadata in JSON format.

Course Title: {body.title}
Description: {body.description or 'N/A'}
Lessons/Topics:
{lessons_text}

Generate a JSON object with exactly these fields:
{{
  "learning_outcomes": ["outcome1", "outcome2", ...],  // 6-10 specific things students will learn
  "requirements": ["req1", "req2", ...],  // 2-4 prerequisites
  "tags": ["tag1", "tag2", "tag3"],  // 3-5 topic tags for categorization
  "total_hours": <number>,  // estimated total hours based on lesson count
  "total_articles": <number>,  // estimated articles
  "total_exercises": <number>,  // estimated coding exercises
  "total_resources": <number>,  // estimated downloadable resources
  "category": "<single category name>"  // best fitting category
}}

Return ONLY valid JSON, no markdown, no explanation."""

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                f"{llm['base_url']}/chat/completions",
                json={
                    "model": llm["model"],
                    "messages": [
                        {"role": "system", "content": "You are a course design expert. Always respond with valid JSON only."},
                        {"role": "user", "content": prompt},
                    ],
                    "max_tokens": 800,
                    "temperature": 0.5,
                },
            )
            resp.raise_for_status()
            text = resp.json()["choices"][0]["message"]["content"].strip()
            # Extract JSON from response (handle markdown code blocks)
            if "```" in text:
                text = text.split("```")[1]
                if text.startswith("json"):
                    text = text[4:]
                text = text.strip()
            result = json.loads(text)
            return result
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="LLM returned invalid JSON")
    except httpx.ConnectError:
        raise HTTPException(status_code=503, detail="AI service unavailable")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI error: {str(e)}")
