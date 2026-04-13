from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.services.auth_service import hash_password
from app.routers.deps import require_admin
import csv
import io

router = APIRouter(prefix="/bulk", tags=["Bulk Operations"])

_ALLOWED_ROLES = {"student", "admin", "instructor"}
_MAX_CSV_BYTES = 2 * 1024 * 1024  # 2 MiB
_MAX_ROWS = 5000
_MIN_PASSWORD_LEN = 12


@router.post("/import-users")
async def import_users(file: UploadFile = File(...), db: Session = Depends(get_db),
                       _=Depends(require_admin)):
    """Import users from CSV. Expected columns: name, email, password, role.

    Atomic: the entire batch is rolled back if any row fails validation.
    Rows with unknown roles or blank passwords are rejected (no silent defaults).
    """
    if not file.filename or not file.filename.lower().endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a .csv")

    content = await file.read()
    if len(content) > _MAX_CSV_BYTES:
        raise HTTPException(status_code=413, detail=f"CSV exceeds {_MAX_CSV_BYTES} bytes")

    try:
        text = content.decode('utf-8')
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="CSV must be UTF-8 encoded")

    reader = csv.DictReader(io.StringIO(text))
    created = 0
    skipped = 0
    errors: list[str] = []
    staged: list[User] = []

    for i, row in enumerate(reader, start=2):
        if i - 1 > _MAX_ROWS:
            raise HTTPException(status_code=413, detail=f"CSV exceeds {_MAX_ROWS} rows")

        name = (row.get('name') or '').strip()
        email = (row.get('email') or '').strip().lower()
        password = (row.get('password') or '').strip()
        role = (row.get('role') or '').strip().lower()

        if not name or not email:
            errors.append(f"Row {i}: missing name or email")
            continue
        if '@' not in email:
            errors.append(f"Row {i}: invalid email")
            continue
        if role not in _ALLOWED_ROLES:
            errors.append(f"Row {i}: unknown role '{role}' (allowed: {sorted(_ALLOWED_ROLES)})")
            continue
        if not password:
            errors.append(f"Row {i}: password is required")
            continue
        if len(password) < _MIN_PASSWORD_LEN:
            errors.append(f"Row {i}: password shorter than {_MIN_PASSWORD_LEN} characters")
            continue

        if db.query(User).filter(User.email == email).first():
            skipped += 1
            continue

        staged.append(User(
            name=name,
            email=email,
            password=hash_password(password),
            role=role,
        ))
        created += 1

    if errors:
        # Reject the whole batch on any validation error — no partial imports.
        raise HTTPException(status_code=400, detail={
            "message": "CSV validation failed; no rows were imported",
            "errors": errors,
            "candidates": created,
            "skipped_duplicates": skipped,
        })

    try:
        for user in staged:
            db.add(user)
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Import failed; database rolled back")

    return {
        "created": created,
        "skipped": skipped,
        "message": f"Imported {created} users, skipped {skipped} duplicates",
    }
