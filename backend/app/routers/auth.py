from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.routers.deps import get_current_user
from app.schemas.auth import (
    ChangePasswordRequest,
    LoginRequest,
    ResetPasswordRequest,
    TokenResponse,
)
from app.schemas.user import UserCreate, UserOut
from app.services.auth_service import (
    authenticate_user,
    create_access_token,
    hash_password,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["Auth"])

# Simple in-memory rate limiter
_login_attempts = {}  # {ip: [(timestamp, count)]}
MAX_ATTEMPTS = 5
WINDOW_SECONDS = 300


def _check_rate_limit(ip: str):
    now = datetime.now(timezone.utc).timestamp()
    attempts = _login_attempts.get(ip, [])
    # Clean old entries
    attempts = [a for a in attempts if now - a < WINDOW_SECONDS]
    _login_attempts[ip] = attempts
    if len(attempts) >= MAX_ATTEMPTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many login attempts. Try again in {WINDOW_SECONDS // 60} minutes."
        )


@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, request: Request, db: Session = Depends(get_db)):
    client_ip = request.client.host if request.client else "unknown"
    _check_rate_limit(client_ip)

    user = authenticate_user(db, req.email, req.password)
    if not user:
        # Record failed attempt
        _login_attempts.setdefault(client_ip, []).append(
            datetime.now(timezone.utc).timestamp()
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )

    # Clear attempts on success
    _login_attempts.pop(client_ip, None)

    token = create_access_token({"sub": str(user.id), "role": user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user.role,
        "user_id": user.id,
        "name": user.name,
    }


@router.post("/register", response_model=UserOut)
def register(body: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    # Password complexity validation
    if len(body.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    user = User(
        name=body.name,
        email=body.email,
        password=hash_password(body.password),
        role="student",  # Self-registration always creates students
    )
    db.add(user); db.commit(); db.refresh(user)
    return user


@router.post("/refresh")
def refresh_token(current: User = Depends(get_current_user)):
    """Issue a fresh token for the currently authenticated user."""
    token = create_access_token({"sub": str(current.id), "role": current.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": current.role,
        "user_id": current.id,
        "name": current.name,
    }


@router.post("/change-password")
def change_password(
    body: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    if not verify_password(body.old_password, current.password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    current.password = hash_password(body.new_password)
    db.commit()
    return {"message": "Password changed successfully"}


@router.post("/reset-password")
def admin_reset_password(
    body: ResetPasswordRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_user),
):
    """Admin can reset any user's password."""
    if admin.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    user = db.query(User).filter(User.id == body.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.password = hash_password(body.new_password)
    db.commit()
    return {"message": f"Password reset for {user.name}"}
