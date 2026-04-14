import os
import uuid
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from app.routers.deps import require_admin, get_current_user
from app.models.user import User

router = APIRouter(prefix="/uploads", tags=["Uploads"])

UPLOAD_DIR = "/app/uploads"
ALLOWED_VIDEO = {".mp4", ".webm", ".ogg", ".mov", ".avi"}
ALLOWED_FILES = ALLOWED_VIDEO | {
    ".pdf",
    ".ppt", ".pptx",
    ".doc", ".docx",
    ".xls", ".xlsx",
    ".png", ".jpg", ".jpeg", ".gif", ".webp",
    ".zip", ".txt", ".csv",
}
MAX_SIZE = 500 * 1024 * 1024  # 500MB


@router.post("/video")
async def upload_video(file: UploadFile = File(...), _: User = Depends(require_admin)):
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_VIDEO:
        raise HTTPException(status_code=400, detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_VIDEO)}")

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    size = 0
    with open(filepath, "wb") as f:
        while chunk := await file.read(1024 * 1024):  # 1MB chunks
            size += len(chunk)
            if size > MAX_SIZE:
                f.close()
                os.remove(filepath)
                raise HTTPException(status_code=400, detail="File too large (max 500MB)")
            f.write(chunk)

    return {
        "filename": filename,
        "url": f"/uploads/{filename}",
        "size_mb": round(size / (1024 * 1024), 2),
        "content_type": file.content_type,
    }


@router.post("/file")
async def upload_file(file: UploadFile = File(...), _: User = Depends(get_current_user)):
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_FILES:
        raise HTTPException(status_code=400, detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_FILES)}")

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    size = 0
    with open(filepath, "wb") as f:
        while chunk := await file.read(1024 * 1024):
            size += len(chunk)
            if size > MAX_SIZE:
                f.close()
                os.remove(filepath)
                raise HTTPException(status_code=400, detail="File too large")
            f.write(chunk)

    return {
        "filename": filename,
        "url": f"/uploads/{filename}",
        "size_mb": round(size / (1024 * 1024), 2),
    }
