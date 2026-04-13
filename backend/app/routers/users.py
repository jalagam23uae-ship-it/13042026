from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserOut, UserUpdate
from app.services.auth_service import hash_password
from app.routers.deps import require_admin, get_current_user

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/", response_model=List[UserOut])
def list_users(db: Session = Depends(get_db), _=Depends(require_admin)):
    return db.query(User).all()

@router.post("/", response_model=UserOut)
def create_user(body: UserCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(**body.model_dump(exclude={"password"}), password=hash_password(body.password))
    db.add(user); db.commit(); db.refresh(user)
    return user

@router.get("/me", response_model=UserOut)
def get_me(current=Depends(get_current_user)):
    return current

@router.put("/me", response_model=UserOut)
def update_me(body: UserUpdate, db: Session = Depends(get_db),
              current=Depends(get_current_user)):
    # Students can only update name, avatar_url, bio
    allowed = {"name", "avatar_url", "bio"}
    for k, v in body.model_dump(exclude_none=True).items():
        if k in allowed:
            setattr(current, k, v)
    db.commit(); db.refresh(current)
    return current

@router.get("/{user_id}", response_model=UserOut)
def get_user(user_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.put("/{user_id}", response_model=UserOut)
def update_user(user_id: int, body: UserUpdate, db: Session = Depends(get_db), _=Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(user, k, v)
    db.commit(); db.refresh(user)
    return user

@router.delete("/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user); db.commit()
    return {"message": "User deleted"}
