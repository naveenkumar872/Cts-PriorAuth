"""
Users — /api/v1/users
Login, notifications (from DB), audit trail (from DB).
"""
import bcrypt
import requests
import uuid
from datetime import datetime
from typing import Optional
from urllib.parse import urlencode, quote

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from core.config import settings
from core.database import AuditLog, AuthorizationRequest, Notification, User, get_db

router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    role: str = "reviewer"
    organization: Optional[str] = ""
    contact: Optional[str] = ""


class GoogleCallbackRequest(BaseModel):
    code: Optional[str] = None
    role: Optional[str] = "reviewer"




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


@router.post("/register")
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    email_clean = payload.email.strip().lower()
    existing = db.query(User).filter(User.email == email_clean).first()
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email address already exists")

    role = payload.role.strip().lower()
    if role not in ["provider", "reviewer"]:
        role = "reviewer"

    try:
        hashed_pw = bcrypt.hashpw(payload.password.encode(), bcrypt.gensalt()).decode()
    except Exception:
        hashed_pw = payload.password

    new_user = User(
        id=str(uuid.uuid4()),
        name=payload.name.strip(),
        email=email_clean,
        password_hash=hashed_pw,
        role=role,
        organization=payload.organization or "",
        contact=payload.contact or "",
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "user": {
            "id": new_user.id,
            "name": new_user.name,
            "email": new_user.email,
            "role": new_user.role,
            "organization": new_user.organization or "",
            "contact": new_user.contact or "",
        },
        "token": f"token-{new_user.id}-{new_user.role}",
    }


@router.get("/google/login")

def google_login(role: Optional[str] = "reviewer"):
    client_id = settings.GOOGLE_CLIENT_ID.replace("http://", "").replace("https://", "").strip("/")
    redirect_uri = settings.GOOGLE_REDIRECT_URI
    if not client_id:
        raise HTTPException(status_code=400, detail="Google Client ID is not configured in backend settings")

    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "select_account",
        "state": role or "reviewer",
    }
    url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"
    return RedirectResponse(url=url)


@router.get("/google/callback")
@router.post("/google/callback")
def google_callback(
    code: Optional[str] = None,
    error: Optional[str] = None,
    state: Optional[str] = None,
    payload: Optional[GoogleCallbackRequest] = None,
    db: Session = Depends(get_db)
):
    auth_code = code or (payload.code if payload else None)
    if error:
        frontend_err_url = f"{settings.FRONTEND_URL}/google/callback?error={quote(error)}"
        return RedirectResponse(url=frontend_err_url)

    if not auth_code:
        raise HTTPException(status_code=400, detail="Missing authorization code")

    client_id = settings.GOOGLE_CLIENT_ID.replace("http://", "").replace("https://", "").strip("/")
    client_secret = settings.GOOGLE_CLIENT_SECRET
    redirect_uri = settings.GOOGLE_REDIRECT_URI

    # Exchange authorization code for token with Google
    token_url = "https://oauth2.googleapis.com/token"
    token_data = {
        "code": auth_code,
        "client_id": client_id,
        "client_secret": client_secret,
        "redirect_uri": redirect_uri,
        "grant_type": "authorization_code",
    }

    try:
        token_resp = requests.post(token_url, data=token_data, timeout=10)
    except Exception as exc:
        err_msg = f"Network error connecting to Google OAuth: {exc}"
        if code:
            return RedirectResponse(url=f"{settings.FRONTEND_URL}/google/callback?error={quote(err_msg)}")
        raise HTTPException(status_code=502, detail=err_msg)

    if not token_resp.ok:
        err_msg = f"Failed to exchange token with Google: {token_resp.text}"
        if code:
            return RedirectResponse(url=f"{settings.FRONTEND_URL}/google/callback?error={quote(err_msg)}")
        raise HTTPException(status_code=400, detail=err_msg)

    tokens = token_resp.json()
    access_token = tokens.get("access_token")

    # Fetch user profile from Google userinfo endpoint
    try:
        userinfo_resp = requests.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=10,
        )
    except Exception as exc:
        err_msg = f"Network error fetching user profile: {exc}"
        if code:
            return RedirectResponse(url=f"{settings.FRONTEND_URL}/google/callback?error={quote(err_msg)}")
        raise HTTPException(status_code=502, detail=err_msg)

    if not userinfo_resp.ok:
        err_msg = "Failed to fetch user profile from Google"
        if code:
            return RedirectResponse(url=f"{settings.FRONTEND_URL}/google/callback?error={quote(err_msg)}")
        raise HTTPException(status_code=400, detail=err_msg)

    google_user = userinfo_resp.json()
    email = google_user.get("email")
    name = google_user.get("name") or (email.split("@")[0] if email else "Google User")

    if not email:
        raise HTTPException(status_code=400, detail="Google account has no associated email address")

    # Locate existing user or auto-provision
    user = db.query(User).filter(User.email == email).first()
    requested_role = (state or (payload.role if payload else None) or "reviewer").lower()
    if requested_role not in ["provider", "reviewer"]:
        requested_role = "reviewer"

    if not user:
        user = User(
            id=str(uuid.uuid4()),
            name=name,
            email=email,
            password_hash="",
            role=requested_role,
            organization="Google Auth",
            contact="",
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    user_data = {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "organization": user.organization or "",
        "contact": user.contact or "",
    }
    auth_token = f"token-{user.id}-{user.role}"

    # If hit via browser redirect (GET), redirect back to frontend callback route with auth data
    if code:
        redirect_to_frontend = (
            f"{settings.FRONTEND_URL}/google/callback?"
            f"token={quote(auth_token)}&"
            f"id={quote(user.id)}&"
            f"name={quote(user.name)}&"
            f"email={quote(user.email)}&"
            f"role={quote(user.role)}"
        )
        return RedirectResponse(url=redirect_to_frontend)

    return {
        "user": user_data,
        "token": auth_token,
    }



from core.cache import get_cache, set_cache, invalidate_cache


@router.get("/notifications")
def get_notifications(user_id: Optional[str] = None, db: Session = Depends(get_db)):
    cache_key = f"notifications_{user_id or 'all'}"
    cached = get_cache(cache_key)
    if cached is not None:
        return cached

    q = db.query(Notification).order_by(Notification.timestamp.desc())
    if user_id:
        q = q.filter(Notification.user_id == user_id)
    res = [_ser_notification(n) for n in q.all()]
    set_cache(cache_key, res, ttl_seconds=15)
    return res


@router.patch("/notifications/{notification_id}/read")
def mark_read(notification_id: str, db: Session = Depends(get_db)):
    n = db.query(Notification).filter(Notification.id == notification_id).first()
    if not n:
        raise HTTPException(status_code=404, detail="Notification not found")
    n.is_read = True
    db.commit()
    invalidate_cache("notifications_")
    return _ser_notification(n)


@router.patch("/notifications/read-all")
def mark_all_read(user_id: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(Notification)
    if user_id:
        q = q.filter(Notification.user_id == user_id)
    q.update({"is_read": True}, synchronize_session=False)
    db.commit()
    invalidate_cache("notifications_")
    return {"message": "All notifications marked as read"}


@router.get("/audit-trail")
def get_audit_trail(db: Session = Depends(get_db)):
    cache_key = "audit_trail_all"
    cached = get_cache(cache_key)
    if cached is not None:
        return cached

    entries = (
        db.query(AuditLog)
        .options(
            joinedload(AuditLog.request)
            .joinedload(AuthorizationRequest.patient)
        )
        .order_by(AuditLog.timestamp.desc())
        .all()
    )
    res = [_ser_audit(a, a.request) for a in entries]
    set_cache(cache_key, res, ttl_seconds=20)
    return res

