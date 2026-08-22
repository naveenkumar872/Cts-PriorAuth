"""
Users — /api/v1/users
Login, notifications (from DB), audit trail (from DB).
"""
import bcrypt
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from core.database import AuditLog, AuthorizationRequest, Notification, User, get_db

router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: str
    password: str


# ── Serialisers ───────────────────────────────────────────────────────────────

def _ser_notification(n: Notification):
    return {
        "id": n.id,
        "title": n.title,
        "message": n.message,
        "type": n.type,
        "timestamp": n.timestamp.isoformat() + "Z" if n.timestamp else None,
        "read": bool(n.is_read),
        "caseId": n.case_id,
    }


def _ser_audit(a: AuditLog, req: Optional[AuthorizationRequest]) -> dict:
    """Shape expected by AuditTrail.tsx — extended AuditEntry with caseNumber, patient, category, metadata."""
    return {
        "id": a.id,
        "action": a.action,
        "performedBy": a.performed_by,
        "role": a.role or "",
        "caseId": a.authorization_id,
        "caseNumber": req.case_number if req else "",
        "patient": req.patient.name if req and req.patient else "",
        "timestamp": a.timestamp.isoformat() + "Z" if a.timestamp else None,
        "details": a.details or "",
        "category": a.category or "system",
        "metadata": a.event_metadata or {},
        "previousValue": a.previous_value,
        "newValue": a.new_value,
    }


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/login")
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    try:
        ok = bcrypt.checkpw(payload.password.encode(), user.password_hash.encode())
    except Exception:
        ok = False

    if not ok:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    return {
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "organization": user.organization or "",
            "contact": user.contact or "",
        },
        "token": f"token-{user.id}-{user.role}",
    }


@router.get("/notifications")
def get_notifications(user_id: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(Notification).order_by(Notification.timestamp.desc())
    if user_id:
        q = q.filter(Notification.user_id == user_id)
    return [_ser_notification(n) for n in q.all()]


@router.patch("/notifications/{notification_id}/read")
def mark_read(notification_id: str, db: Session = Depends(get_db)):
    n = db.query(Notification).filter(Notification.id == notification_id).first()
    if not n:
        raise HTTPException(status_code=404, detail="Notification not found")
    n.is_read = True
    db.commit()
    return _ser_notification(n)


@router.patch("/notifications/read-all")
def mark_all_read(user_id: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(Notification)
    if user_id:
        q = q.filter(Notification.user_id == user_id)
    q.update({"is_read": True}, synchronize_session=False)
    db.commit()
    return {"message": "All notifications marked as read"}


@router.get("/audit-trail")
def get_audit_trail(db: Session = Depends(get_db)):
    entries = (
        db.query(AuditLog)
        .options(
            joinedload(AuditLog.request)
            .joinedload(AuthorizationRequest.patient)
        )
        .order_by(AuditLog.timestamp.desc())
        .all()
    )
    return [_ser_audit(a, a.request) for a in entries]
