from fastapi import Depends, HTTPException
from app.middleware.auth_middleware import get_current_user, require_admin
from app.models.user import User


def require_admin_or_instructor(current: User = Depends(get_current_user)):
    if current.role not in ("admin", "instructor"):
        raise HTTPException(status_code=403, detail="Admin or instructor access required")
    return current


__all__ = ["get_current_user", "require_admin", "require_admin_or_instructor"]
