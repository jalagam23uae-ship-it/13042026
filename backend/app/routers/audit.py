from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app.models.audit_log import AuditLog
from app.models.user import User
from app.routers.deps import require_admin

router = APIRouter(prefix="/audit", tags=["Audit"])


def log_action(db: Session, user_id: int, action: str, entity_type: str = None,
               entity_id: int = None, details: str = None, ip: str = None):
    """Helper to create audit log entries from other routers."""
    entry = AuditLog(
        user_id=user_id, action=action, entity_type=entity_type,
        entity_id=entity_id, details=details, ip_address=ip,
    )
    db.add(entry)
    db.commit()


@router.get("/")
def get_audit_logs(
    db: Session = Depends(get_db),
    _=Depends(require_admin),
    action: Optional[str] = Query(None),
    entity_type: Optional[str] = Query(None),
    user_id: Optional[int] = Query(None),
    limit: int = Query(100, le=500),
    offset: int = Query(0),
):
    q = db.query(AuditLog)
    if action:
        q = q.filter(AuditLog.action == action)
    if entity_type:
        q = q.filter(AuditLog.entity_type == entity_type)
    if user_id:
        q = q.filter(AuditLog.user_id == user_id)

    total = q.count()
    logs = q.order_by(AuditLog.created_at.desc()).offset(offset).limit(limit).all()

    uids = {l.user_id for l in logs if l.user_id}
    names = {u.id: u.name for u in db.query(User).filter(User.id.in_(uids)).all()} if uids else {}

    return {
        "total": total,
        "logs": [{
            "id": l.id, "user_id": l.user_id, "action": l.action,
            "entity_type": l.entity_type, "entity_id": l.entity_id,
            "details": l.details, "ip_address": l.ip_address,
            "created_at": l.created_at,
            "user_name": names.get(l.user_id, "System"),
        } for l in logs],
    }


@router.get("/actions")
def get_action_types(db: Session = Depends(get_db), _=Depends(require_admin)):
    rows = db.query(AuditLog.action).distinct().all()
    return [r[0] for r in rows if r[0]]
