"""System settings — admin-configurable LLM and feature flags."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.system_settings import SystemSetting
from app.models.user import User
from app.routers.deps import get_current_user, require_admin

router = APIRouter(prefix="/settings", tags=["Settings"])

DEFAULTS = {
    "ai_enabled": "true",
    "llm_base_url": "http://10.10.100.201:32080/v1",
    "llm_model": "meta-llama/Llama-4-Scout-17B-16E-Instruct",
    "llm_max_tokens": "1024",
    "llm_temperature": "0.7",
    "chatbot_welcome_message": "Hey there! I'm your AI Learning Assistant. I'm here to help you understand course material, explain concepts, and guide your studies.",
    "chatbot_name": "AI Learning Assistant",
}


def get_setting(db: Session, key: str) -> str:
    row = db.query(SystemSetting).filter(SystemSetting.key == key).first()
    return row.value if row else DEFAULTS.get(key, "")


def set_setting(db: Session, key: str, value: str):
    row = db.query(SystemSetting).filter(SystemSetting.key == key).first()
    if row:
        row.value = value
    else:
        db.add(SystemSetting(key=key, value=value))
    db.commit()


@router.get("/")
def get_all_settings(db: Session = Depends(get_db), _=Depends(require_admin)):
    """Admin: get all system settings."""
    result = {}
    for key, default in DEFAULTS.items():
        result[key] = get_setting(db, key)
    return result


@router.put("/")
def update_settings(body: dict, db: Session = Depends(get_db), _=Depends(require_admin)):
    """Admin: update system settings."""
    for key, value in body.items():
        if key in DEFAULTS:
            set_setting(db, key, str(value))
    return {"message": "Settings updated", "settings": {k: get_setting(db, k) for k in DEFAULTS}}


@router.get("/public")
def get_public_settings(db: Session = Depends(get_db), _=Depends(get_current_user)):
    """Any user: get public settings (ai_enabled, chatbot name, etc.)."""
    return {
        "ai_enabled": get_setting(db, "ai_enabled") == "true",
        "chatbot_name": get_setting(db, "chatbot_name"),
        "chatbot_welcome_message": get_setting(db, "chatbot_welcome_message"),
    }
