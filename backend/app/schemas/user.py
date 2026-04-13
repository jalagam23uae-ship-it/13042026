from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from datetime import datetime


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str = "student"
    is_active: bool = True

    @field_validator("password")
    @classmethod
    def password_strength(cls, v):
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v

    @field_validator("role")
    @classmethod
    def valid_role(cls, v):
        if v not in ("student", "admin", "instructor"):
            raise ValueError("Role must be student, admin, or instructor")
        return v


class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None

    @field_validator("role")
    @classmethod
    def valid_role(cls, v):
        if v is not None and v not in ("student", "admin", "instructor"):
            raise ValueError("Role must be student, admin, or instructor")
        return v


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role: str
    is_active: bool
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
