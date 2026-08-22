"""
Document Upload — /api/v1/documents/

POST /api/v1/documents/upload
  Accepts multipart/form-data with:
    - authorization_id: str
    - document_type:    str  (imaging | lab_result | clinical_note | referral | prescription | medical_history | other)
    - uploaded_by:      str  (provider name)
    - file:             UploadFile (PDF | PNG | JPG | JPEG | DOCX | TIFF | TXT | CSV)

  Saves to:  backend/uploads/{authorization_id}/{uuid}_{original_name}
  Updates:   documents table row with file_url = relative path
  Returns:   updated document record

GET /api/v1/documents/{doc_id}
  Returns the document record with its file_url

GET /api/v1/documents/authorization/{auth_id}
  Returns all documents for an authorization request
"""

import os, uuid, shutil
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from core.database import get_db, Document, AuthorizationRequest

router = APIRouter()

# ── Constants ─────────────────────────────────────────────────────────────────

UPLOAD_ROOT = Path(__file__).parent.parent.parent / "uploads"
UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {
    ".pdf", ".png", ".jpg", ".jpeg", ".tiff", ".tif",
    ".docx", ".doc", ".txt", ".csv", ".xlsx",
}

MAX_FILE_SIZE_MB = 25
MAX_FILE_BYTES   = MAX_FILE_SIZE_MB * 1024 * 1024


def _format_size(n_bytes: int) -> str:
    if n_bytes < 1024 * 1024:
        return f"{n_bytes / 1024:.1f} KB"
    return f"{n_bytes / (1024 * 1024):.2f} MB"


def _ser(doc: Document) -> dict:
    return {
        "id":              doc.id,
        "authorizationId": doc.authorization_id,
        "name":            doc.name,
        "type":            doc.type,
        "size":            doc.size,
        "uploadedAt":      doc.uploaded_at.isoformat() + "Z" if doc.uploaded_at else None,
        "uploadedBy":      doc.uploaded_by,
        "fileUrl":         doc.file_url,
    }


# ── Upload ────────────────────────────────────────────────────────────────────

@router.post("/upload", status_code=201)
async def upload_document(
    authorization_id: str     = Form(...),
    document_type:    str     = Form(default="other"),
    uploaded_by:      str     = Form(default="Provider"),
    file:             UploadFile = File(...),
    db:               Session = Depends(get_db),
):
    # 1. Validate authorization exists
    req = db.query(AuthorizationRequest).filter(
        AuthorizationRequest.id == authorization_id
    ).first()
    if not req:
        raise HTTPException(status_code=404, detail=f"Authorization '{authorization_id}' not found")

    # 2. Validate file extension
    original_name = file.filename or "upload"
    ext = Path(original_name).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{ext}' not allowed. Supported: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    # 3. Read and size-check
    contents = await file.read()
    if len(contents) > MAX_FILE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds {MAX_FILE_SIZE_MB} MB limit ({_format_size(len(contents))})",
        )

    # 4. Save to disk:  uploads/{authorization_id}/{uuid}_{original_name}
    auth_dir = UPLOAD_ROOT / authorization_id
    auth_dir.mkdir(parents=True, exist_ok=True)

    file_id    = uuid.uuid4().hex[:12]
    saved_name = f"{file_id}_{original_name}"
    saved_path = auth_dir / saved_name
    saved_path.write_bytes(contents)

    # Relative path stored in DB (portable across OS)
    rel_url = f"uploads/{authorization_id}/{saved_name}"

    # 5. Check if a Document row already exists for this file name in this request
    existing = db.query(Document).filter(
        Document.authorization_id == authorization_id,
        Document.name == original_name,
    ).first()

    now = datetime.utcnow()

    if existing:
        # Update existing record with new file path
        existing.file_url    = rel_url
        existing.type        = document_type
        existing.size        = _format_size(len(contents))
        existing.uploaded_by = uploaded_by
        existing.uploaded_at = now
        db.commit()
        db.refresh(existing)
        return _ser(existing)
    else:
        # Create new Document row
        doc = Document(
            id               = f"doc-{file_id}",
            authorization_id = authorization_id,
            name             = original_name,
            type             = document_type,
            size             = _format_size(len(contents)),
            uploaded_at      = now,
            uploaded_by      = uploaded_by,
            file_url         = rel_url,
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)
        return _ser(doc)


# ── Get single document ───────────────────────────────────────────────────────

@router.get("/{doc_id}")
def get_document(doc_id: str, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return _ser(doc)


# ── List documents for an authorization ──────────────────────────────────────

@router.get("/authorization/{auth_id}")
def get_documents_for_authorization(auth_id: str, db: Session = Depends(get_db)):
    docs = db.query(Document).filter(Document.authorization_id == auth_id).all()
    return [_ser(d) for d in docs]


# ── Serve / download file ─────────────────────────────────────────────────────

@router.get("/{doc_id}/download")
def download_document(doc_id: str, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if not doc.file_url:
        raise HTTPException(status_code=404, detail="No file stored for this document")

    file_path = Path(__file__).parent.parent.parent / doc.file_url
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found on disk")

    return FileResponse(
        path=str(file_path),
        filename=doc.name,
        media_type="application/octet-stream",
    )
