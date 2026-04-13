from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from app.config import settings
from app.database import engine, Base
from app.routers.deps import get_current_user
from app.models.user import User
import app.models  # noqa: ensure all models are registered
import os
from pathlib import Path
from app.routers import (
    auth, users, sessions, attendance, tests, results,
    feedback, enrollments, notifications, certificates, lessons,
    uploads, discussions, assignments, notes, announcements,
    reviews, learning_paths, wishlists, audit, analytics,
    calendar, bulk, course_import, ai, time_tracking, search,
    approvals,
)
from app.routers import settings as system_settings_router

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="ATP API",
    description="Automate Training Platform",
    version="3.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(sessions.router)
app.include_router(attendance.router)
app.include_router(tests.router)
app.include_router(results.router)
app.include_router(feedback.router)
app.include_router(enrollments.router)
app.include_router(notifications.router)
app.include_router(certificates.router)
app.include_router(lessons.router)
app.include_router(uploads.router)
app.include_router(discussions.router)
app.include_router(assignments.router)
app.include_router(notes.router)
app.include_router(announcements.router)
app.include_router(reviews.router)
app.include_router(learning_paths.router)
app.include_router(wishlists.router)
app.include_router(audit.router)
app.include_router(analytics.router)
app.include_router(calendar.router)
app.include_router(bulk.router)
app.include_router(course_import.router)
app.include_router(ai.router)
app.include_router(time_tracking.router)
app.include_router(search.router)
app.include_router(approvals.router)
app.include_router(system_settings_router.router)

# Serve uploaded files — authenticated only, with path-traversal protection.
UPLOAD_DIR = Path("/app/uploads").resolve()
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@app.get("/uploads/{file_path:path}", tags=["Uploads"])
def serve_upload(file_path: str, _: User = Depends(get_current_user)):
    if not file_path or "\x00" in file_path:
        raise HTTPException(status_code=400, detail="Invalid path")
    candidate = (UPLOAD_DIR / file_path).resolve()
    try:
        candidate.relative_to(UPLOAD_DIR)
    except ValueError:
        raise HTTPException(status_code=403, detail="Forbidden")
    if not candidate.is_file():
        raise HTTPException(status_code=404, detail="Not found")
    return FileResponse(candidate)


@app.on_event("startup")
def bootstrap_admin_from_env():
    """Optional first-run admin bootstrap.

    Only runs when ADMIN_BOOTSTRAP_EMAIL and ADMIN_BOOTSTRAP_PASSWORD are set
    in the environment AND no admin user currently exists. Credentials are
    never hardcoded or logged. To create additional admins, use the seed
    script or the bulk import endpoint.
    """
    from app.database import SessionLocal
    from app.models.user import User
    from app.services.auth_service import hash_password

    email = os.environ.get("ADMIN_BOOTSTRAP_EMAIL", "").strip()
    password = os.environ.get("ADMIN_BOOTSTRAP_PASSWORD", "")
    if not email or not password:
        return
    if len(password) < 12:
        raise RuntimeError("ADMIN_BOOTSTRAP_PASSWORD must be at least 12 characters")

    db = SessionLocal()
    try:
        if db.query(User).filter(User.role == "admin").first():
            return
        db.add(User(
            name=os.environ.get("ADMIN_BOOTSTRAP_NAME", "Admin"),
            email=email,
            password=hash_password(password),
            role="admin",
        ))
        db.commit()
    finally:
        db.close()


@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "message": "ATP API is running"}


@app.get("/health", tags=["Health"])
def health():
    return {"status": "healthy"}
