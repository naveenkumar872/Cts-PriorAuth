"""
Authorization Requests — /api/v1/authorizations

Accepts the EXACT payload shape that CreateRequest.tsx sends:
{
  patient: { name, dob, gender, memberId, groupId, plan, payer, phone, address, primaryCare },
  provider: { id, name, npi, specialty, organization, phone, fax, address, taxId },
  diagnoses: [{ code, description, type }],
  procedures: [{ code, description, modifier, quantity, serviceDate, placeOfService }],
  clinicalNotes: str,
  priority: str,
  documents: [{ id, name, type, size, uploadedAt, uploadedBy }]
}

Returns the EXACT AuthorizationRequest shape that every frontend page reads.
"""

import uuid
import threading
import os
import re
import json
import tempfile
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from core.database import (
    AuditLog, AuthorizationRequest, Document, Notification, Patient, Provider, User, get_db,
    SessionLocal,
)
from core.privacy import anonymize_text, mask_text_with_tokens, unmask_data_with_tokens

logger = logging.getLogger(__name__)

router = APIRouter()


# ── Serialiser ────────────────────────────────────────────────────────────────

def _ser(req: AuthorizationRequest, db: Optional[Session] = None, auto_evaluate: bool = False) -> Dict[str, Any]:
    """Convert ORM row → exact AuthorizationRequest JSON shape expected by the frontend."""
    p = req.patient
    prov = req.provider

    rule_eval = {}
    if db is not None:
        try:
            from core.database import RuleEvaluationRecord
            import json
            rec = db.query(RuleEvaluationRecord).filter_by(authorization_id=req.id).first()
            if rec and rec.pathways:
                p_val = rec.pathways
                if isinstance(p_val, str):
                    try:
                        p_val = json.loads(p_val)
                    except Exception:
                        p_val = []

                m_val = rec.missing_information
                if isinstance(m_val, str):
                    try:
                        m_val = json.loads(m_val)
                    except Exception:
                        m_val = []

                e_val = rec.exclusions
                if isinstance(e_val, str):
                    try:
                        e_val = json.loads(e_val)
                    except Exception:
                        e_val = []

                rule_eval = {
                    "decision": rec.decision,
                    "reason": rec.reason,
                    "aiReasoning": rec.ai_reasoning,
                    "missingInformation": m_val or [],
                    "exclusions": e_val or [],
                    "pathways": p_val or [],
                    "keyFactors": rec.key_factors or [],
                    "policyReferences": rec.policy_references or [],
                    "mlComplexity": rec.ml_complexity or {},
                    "evaluatedAt": rec.evaluated_at.isoformat() + "Z" if rec.evaluated_at else None,
                }
        except Exception:
            pass

    if not rule_eval:
        rule_eval = (req.policy_context or {}).get("ruleEvaluation") or {}

    if auto_evaluate and (not rule_eval or not rule_eval.get("pathways")) and db is not None:
        try:
            from api.routes.evaluation import _evaluate_and_store
            rule_eval = _evaluate_and_store(req, db)
        except Exception:
            pass

    # Always compute dynamic AI recommendation & confidence score from evaluated criteria
    if rule_eval and rule_eval.get("pathways"):
        decision_map = {
            "Approved": "Approve",
            "Not Approved": "Deny",
            "Denied": "Deny",
            "More Information Required": "Request More Info",
            "Nurse Review Required": "Escalate",
        }
        dec = decision_map.get(rule_eval.get("decision"), "Escalate")

        pathways = rule_eval.get("pathways", [])
        if isinstance(pathways, str):
            try:
                import json
                pathways = json.loads(pathways)
            except Exception:
                pathways = []

        total_conds = 0
        passed_conds = 0
        if isinstance(pathways, list):
            for pathway in pathways:
                if isinstance(pathway, dict):
                    for cond in pathway.get("conditions", []):
                        total_conds += 1
                        cstr = str(cond)
                        if ": passed" in cstr or "evidence found" in cstr or "verified" in cstr:
                            passed_conds += 1
                elif isinstance(pathway, str):
                    total_conds += 1
                    if ": passed" in pathway or "evidence found" in pathway or "verified" in pathway:
                        passed_conds += 1

        if total_conds > 0:
            calc_conf = round((passed_conds / total_conds) * 100)
            if dec == "Approve":
                calc_conf = max(85, calc_conf)
            elif dec == "Deny":
                calc_conf = max(80, calc_conf)
        else:
            calc_conf = 0

        ai_rec = {
            "decision": dec,
            "confidence": calc_conf,
            "reasoning": rule_eval.get("reason", "Rule engine evaluation completed."),
            "keyFactors": [
                f"{passed_conds} of {total_conds} clinical policy criteria satisfied",
                f"Rule Engine Decision: {rule_eval.get('decision', 'Nurse Review Required')}",
            ]
        }
    else:
        ai_rec = req.ai_recommendation

    return {
        "id": req.id,
        "caseNumber": req.case_number,
        "status": req.status,
        "priority": req.priority,
        "riskLevel": req.risk_level,
        "submittedAt": req.submitted_at.isoformat() + "Z" if req.submitted_at else None,
        "updatedAt": req.updated_at.isoformat() + "Z" if req.updated_at else None,
        "dueDate": req.due_date.isoformat() + "Z" if req.due_date else None,
        "assignedTo": req.assigned_to,
        "clinicalNotes": req.clinical_notes,
        "diagnoses": req.diagnoses or [],
        "procedures": req.procedures or [],
        "aiRecommendation": ai_rec,
        # Module 4 — Context & Policy Mapping
        "policyId":      req.policy_id,
        "policyContext": req.policy_context,
        "ruleEvaluation": rule_eval,

        "patient": {
            "id": p.id,
            "name": p.name,
            "dob": p.dob.isoformat() if p.dob else None,
            "memberId": p.member_id,
            "groupId": p.group_id or "",
            "plan": p.plan or "",
            "payer": p.payer or "",
            "gender": p.gender or "Other",
            "phone": p.phone or "",
            "address": p.address or "",
            "primaryCare": p.primary_care or "",
        } if p else None,
        "provider": {
            "id": prov.id,
            "name": prov.name,
            "npi": prov.npi,
            "specialty": prov.specialty or "",
            "organization": prov.organization or "",
            "phone": prov.phone or "",
            "fax": prov.fax or "",
            "address": prov.address or "",
            "taxId": prov.tax_id or "",
        } if prov else None,
        "documents": [
            {
                "id": d.id,
                "name": d.name,
                "type": d.type,
                "size": d.size or "",
                "uploadedAt": d.uploaded_at.isoformat() + "Z" if d.uploaded_at else None,
                "uploadedBy": d.uploaded_by or "",
                "url": d.file_url,
            }
            for d in (req.documents or [])
        ],
        "auditLog": [
            {
                "id": a.id,
                "action": a.action,
                "performedBy": a.performed_by,
                "role": a.role or "",
                "timestamp": a.timestamp.isoformat() + "Z" if a.timestamp else None,
                "details": a.details or "",
                "previousValue": a.previous_value,
                "newValue": a.new_value,
            }
            for a in sorted(req.audit_log or [], key=lambda x: x.timestamp or datetime.min)
        ],
    }


def _load(db: Session):
    return db.query(AuthorizationRequest).options(
        joinedload(AuthorizationRequest.patient),
        joinedload(AuthorizationRequest.provider),
        joinedload(AuthorizationRequest.documents),
        joinedload(AuthorizationRequest.audit_log),
    )


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class PatientPayload(BaseModel):
    patientId: Optional[str] = ""
    name: str
    dob: str
    gender: Optional[str] = "Other"
    memberId: str
    groupId: Optional[str] = ""
    plan: Optional[str] = ""
    payer: Optional[str] = ""
    phone: Optional[str] = ""
    address: Optional[str] = ""
    primaryCare: Optional[str] = ""
    policyId: Optional[str] = ""       # provider-supplied policy ID e.g. "MRI-87720129"


class ProviderPayload(BaseModel):
    id: Optional[str] = None
    name: Optional[str] = ""
    npi: Optional[str] = ""
    specialty: Optional[str] = ""
    organization: Optional[str] = ""
    phone: Optional[str] = ""
    fax: Optional[str] = ""
    address: Optional[str] = ""
    taxId: Optional[str] = ""


class DiagnosisPayload(BaseModel):
    code: str
    description: str
    type: str = "primary"


class ProcedurePayload(BaseModel):
    code: str
    description: str
    modifier: Optional[str] = ""
    codingSystem: Optional[str] = "CPT"   # CPT | HCPCS | ICD-10-PCS | NDC | Other
    quantity: Optional[int] = 1
    serviceDate: Optional[str] = ""
    placeOfService: Optional[str] = ""


class DocumentPayload(BaseModel):
    id: Optional[str] = None
    name: str
    type: str
    size: Optional[str] = ""
    uploadedAt: Optional[str] = None
    uploadedBy: Optional[str] = ""


class CreateAuthPayload(BaseModel):
    patient: PatientPayload
    provider: ProviderPayload
    diagnoses: List[DiagnosisPayload]
    procedures: List[ProcedurePayload]
    clinicalNotes: Optional[str] = ""
    priority: Optional[str] = "normal"
    documents: Optional[List[DocumentPayload]] = []


class DecisionPayload(BaseModel):
    decision: str
    rationale: Optional[str] = ""


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/")
def list_authorizations(
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    q = _load(db)
    if status and isinstance(status, str) and status.lower() not in ("all", ""):
        q = q.filter(AuthorizationRequest.status.ilike(status))
    if priority and isinstance(priority, str) and priority.lower() not in ("all", ""):
        q = q.filter(AuthorizationRequest.priority == priority.lower())
    cases = q.order_by(AuthorizationRequest.submitted_at.desc()).all()

    if search and isinstance(search, str):
        s = search.lower()
        cases = [
            c for c in cases
            if s in (c.case_number or "").lower()
            or s in (c.patient.name if c.patient else "").lower()
            or s in (c.provider.name if c.provider else "").lower()
            or any(s in (pr.get("description", "")).lower() for pr in (c.procedures or []))
        ]

    return {"total": len(cases), "cases": [_ser(c, db, auto_evaluate=False) for c in cases]}


@router.post("/autofill")
async def autofill_from_document(
    file: UploadFile = File(...)
):
    """
    Extract text from uploaded clinical document (PDF, DOCX, PNG, JPG, TXT, CSV)
    using Kreuzberg document extractor, then map text fields to PA Request form JSON.
    """
    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    original_name = file.filename or "uploaded_document.pdf"
    ext = os.path.splitext(original_name)[1].lower() or ".pdf"

    # 1. Extract text using Kreuzberg with temporary file
    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        tmp.write(contents)
        tmp_path = tmp.name

    extracted_text = ""
    try:
        from kreuzberg import extract_file_sync
        res = extract_file_sync(tmp_path)
        extracted_text = (res.content if hasattr(res, "content") else str(res)).strip()
    except Exception as exc:
        logger.warning("Kreuzberg text extraction failed for %s: %s", original_name, exc)
    finally:
        if os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except Exception:
                pass

    if not extracted_text:
        try:
            extracted_text = contents.decode("utf-8", errors="ignore").strip()
        except Exception:
            extracted_text = ""

    if not extracted_text:
        raise HTTPException(status_code=422, detail="No readable text could be extracted from document.")

    # 2. Tokenize PHI (replace real names, IDs, DOBs with deterministic tokens) before sending to LLM
    safe_text_for_llm, token_map = mask_text_with_tokens(extracted_text)

    # 3. Map extracted text to structured PA Request Form JSON using Gemini NLP
    structured_data: Dict[str, Any] = {}
    try:
        from core.config import settings
        if settings.GEMINI_API_KEY:
            try:
                from google import genai
                from google.genai import types as genai_types
                client = genai.Client(api_key=settings.GEMINI_API_KEY)
                prompt = (
                    "You are a medical NLP data extraction system processing a Prior Authorization clinical document.\n"
                    "Extract structured form fields from the text below and return ONLY valid JSON — no markdown, no explanation.\n\n"
                    "JSON Schema:\n"
                    "{\n"
                    '  "patient": {\n'
                    '    "patientId": "p-003",\n'
                    '    "name": "Full Patient Name",\n'
                    '    "dob": "YYYY-MM-DD",\n'
                    '    "gender": "Male|Female|Other",\n'
                    '    "memberId": "Member ID",\n'
                    '    "policyId": "Policy ID e.g. KID-26349233",\n'
                    '    "policyTier": "Platinum|Gold HMO Plan|Standard Plan"\n'
                    "  },\n"
                    '  "treatment": {\n'
                    '    "serviceType": "Surgery / Procedure",\n'
                    '    "serviceName": "Procedure Name / Description",\n'
                    '    "serviceCode": "CPT code e.g. 50360",\n'
                    '    "codingSystem": "CPT",\n'
                    '    "quantity": "1",\n'
                    '    "frequency": "",\n'
                    '    "duration": ""\n'
                    "  },\n"
                    '  "diagnoses": [\n'
                    '    { "code": "E11.22", "description": "Diagnosis Description", "type": "primary" }\n'
                    "  ],\n"
                    '  "clinicalIndication": "Clinical history summary",\n'
                    '  "symptoms": "Symptoms summary",\n'
                    '  "previousTreatments": [\n'
                    '    { "id": "1", "name": "Treatment Name", "duration": "Duration", "outcome": "Outcome" }\n'
                    "  ],\n"
                    '  "measurements": [\n'
                    '    { "id": "1", "name": "Measurement Name e.g. eGFR or BMI", "value": "Value", "unit": "Unit" }\n'
                    "  ],\n"
                    '  "testResults": [\n'
                    '    { "id": "1", "name": "Test Name", "date": "YYYY-MM-DD", "finding": "Finding" }\n'
                    "  ],\n"
                    '  "clinicalJustification": "Clinical justification"\n'
                    "}\n\n"
                    f"TEXT TO EXTRACT FROM:\n{safe_text_for_llm}"
                )
                response = client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=prompt,
                    config=genai_types.GenerateContentConfig(
                        temperature=0.1,
                        response_mime_type="application/json",
                    ),
                )
                raw = (response.text or "").strip()
                if raw.startswith("```"):
                    raw = re.sub(r"^```(?:json)?\s*", "", raw)
                    raw = re.sub(r"\s*```$", "", raw)
                structured_data = json.loads(raw)
            except Exception as e:
                logger.warning("Gemini autofill extraction failed: %s", e)
    except Exception:
        pass

    if not isinstance(structured_data, dict):
        structured_data = {}

    p_data = structured_data.setdefault("patient", {})
    if not p_data.get("name"):
        m = re.search(r'Patient Name:\s*([^\n\r,]+)', extracted_text, re.IGNORECASE)
        if m: p_data["name"] = m.group(1).strip()
    if not p_data.get("patientId"):
        m = re.search(r'Patient ID:\s*([^\n\r,\s]+)', extracted_text, re.IGNORECASE)
        if m: p_data["patientId"] = m.group(1).strip()
    if not p_data.get("memberId"):
        m = re.search(r'Member ID:\s*([^\n\r,\s]+)', extracted_text, re.IGNORECASE)
        if m: p_data["memberId"] = m.group(1).strip()
    if not p_data.get("policyId"):
        m = re.search(r'Policy ID:\s*([^\n\r,\s]+)', extracted_text, re.IGNORECASE)
        if m: p_data["policyId"] = m.group(1).strip()

    t_data = structured_data.setdefault("treatment", {})
    if not t_data.get("serviceCode"):
        m = re.search(r'CPT\s* Code:\s*(\d{5})', extracted_text, re.IGNORECASE) or re.search(r'CPT\s*(\d{5})', extracted_text, re.IGNORECASE)
        if m: t_data["serviceCode"] = m.group(1)

    # 4. Unmask token placeholders LOCALLY on the server using the in-memory token map
    structured_data = unmask_data_with_tokens(structured_data, token_map)

    return {
        "fileName": original_name,
        "extractedText": extracted_text[:500] + "..." if len(extracted_text) > 500 else extracted_text,
        "formData": structured_data,
    }


@router.get("/{case_id}")
def get_authorization(case_id: str, db: Session = Depends(get_db)):
    req = _load(db).filter(AuthorizationRequest.id == case_id).first()
    if not req:
        # also try by case_number
        req = _load(db).filter(AuthorizationRequest.case_number == case_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Case not found")
    return _ser(req, db, auto_evaluate=True)


@router.get("/patients/verify-patient/{patient_id}")
def verify_patient_id(patient_id: str, db: Session = Depends(get_db)):
    """Check whether a Patient ID is present in the database."""
    pid = (patient_id or "").strip()
    if not pid:
        return {"exists": False, "patientId": "", "message": "Patient ID is empty."}

    patient = db.query(Patient).filter(Patient.id.ilike(pid)).first()
    if not patient:
        patient = db.query(Patient).filter(Patient.id.ilike(f"%{pid}")).first()

    if patient:
        return {
            "exists": True,
            "patientId": patient.id,
            "patient": {
                "id": patient.id,
                "name": patient.name,
                "dob": patient.dob.isoformat() if patient.dob else None,
                "payer": patient.payer or "Apex Health Plan",
                "plan": patient.plan or "Gold HMO Plan",
                "groupId": patient.group_id or "",
                "gender": patient.gender or "Other",
                "phone": patient.phone or "",
                "primaryCare": patient.primary_care or "",
                "member_id": patient.member_id or "",
                "memberId": patient.member_id or "",
            },
            "message": f"Patient ID '{patient.id}' is verified in database ({patient.name})."
        }

    return {
        "exists": False,
        "patientId": pid,
        "patient": None,
        "message": f"Patient ID '{pid}' was not found in the patient database."
    }


@router.get("/patients/verify-member/{member_id}")
def verify_member_id(member_id: str, db: Session = Depends(get_db)):
    """Check whether a patient's insurance member ID is present in the database."""
    mid = (member_id or "").strip()
    if not mid:
        return {"exists": False, "memberId": "", "message": "Member ID is empty."}

    patient = db.query(Patient).filter(Patient.member_id.ilike(mid)).first()
    if patient:
        return {
            "exists": True,
            "memberId": patient.member_id,
            "patient": {
                "id": patient.id,
                "name": patient.name,
                "dob": patient.dob.isoformat() if patient.dob else None,
                "payer": patient.payer or "Apex Health Plan",
                "plan": patient.plan or "Gold HMO Plan",
                "groupId": patient.group_id or "",
                "gender": patient.gender or "Other",
                "phone": patient.phone or "",
                "primaryCare": patient.primary_care or "",
                "member_id": patient.member_id or "",
                "memberId": patient.member_id or "",
            },
            "message": f"Member ID '{patient.member_id}' is verified in database ({patient.name})."
        }

    return {
        "exists": False,
        "memberId": mid,
        "patient": None,
        "message": f"Member ID '{mid}' was not found in the patient database."
    }


from api.routes.context import _get_index


@router.post("/", status_code=201)
def create_authorization(payload: CreateAuthPayload, db: Session = Depends(get_db)):
    now = datetime.utcnow()

    # ── 0. Validate Policy ID against predefined rulesets ──────────────────
    policy_id = (payload.patient.policyId or "").strip()
    if policy_id:
        try:
            index = _get_index()
            valid_keys = {k.upper() for k in index.keys()}
            if policy_id.upper() not in valid_keys:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid Policy ID '{policy_id}'. Policy ID must match an existing predefined ruleset policy."
                )
        except HTTPException:
            raise
        except Exception:
            pass

    # ── 1. Upsert patient by Patient ID or memberId ────────────────────────
    pid = (payload.patient.patientId or payload.patient.groupId or "").strip()
    patient = None
    if pid:
        patient = db.query(Patient).filter(Patient.id.ilike(pid)).first()
    if not patient and payload.patient.memberId:
        patient = db.query(Patient).filter(Patient.member_id.ilike(payload.patient.memberId.strip())).first()

    # Validate entered Member ID against existing patient record if registered
    if patient and patient.member_id and payload.patient.memberId:
        if payload.patient.memberId.strip().upper() != patient.member_id.strip().upper():
            raise HTTPException(
                status_code=400,
                detail=f"Entered Member ID '{payload.patient.memberId}' does not match registered Insurance Member ID on record for Patient ID '{patient.id}' ({patient.member_id})."
            )

    if not patient:
        patient = Patient(
            id=pid if pid else f"pat-{uuid.uuid4().hex[:8]}",
            name=payload.patient.name,
            dob=datetime.strptime(payload.patient.dob, "%Y-%m-%d").date() if payload.patient.dob else now.date(),
            member_id=payload.patient.memberId or None,
            group_id=payload.patient.groupId,
            plan=payload.patient.plan or "Standard Plan",
            payer=payload.patient.payer or "BlueCross BlueShield Insurance",
            gender=payload.patient.gender,
            phone=payload.patient.phone,
            address=payload.patient.address,
            primary_care=payload.patient.primaryCare,
        )
        db.add(patient)
        db.flush()
    else:
        # Update mutable fields in case they changed
        patient.name = payload.patient.name
        if payload.patient.memberId:
            patient.member_id = payload.patient.memberId
        patient.plan = payload.patient.plan or patient.plan or "Standard Plan"
        patient.payer = payload.patient.payer or patient.payer or "BlueCross BlueShield Insurance"


    # ── 2. Upsert provider ────────────────────────────────────────────────
    provider_npi = (payload.provider.npi or "").strip()
    provider_id = (payload.provider.id or "").strip()

    provider = None
    if provider_npi:
        provider = db.query(Provider).filter(Provider.npi == provider_npi).first()
    if not provider and provider_id:
        provider = db.query(Provider).filter(Provider.id == provider_id).first()

    if not provider:
        new_prov_id = provider_id
        if not new_prov_id or db.query(Provider).filter(Provider.id == new_prov_id).first():
            new_prov_id = f"prov-{uuid.uuid4().hex[:8]}"

        provider = Provider(
            id=new_prov_id,
            name=payload.provider.name or "Unknown Provider",
            npi=provider_npi or "0000000000",
            specialty=payload.provider.specialty,
            organization=payload.provider.organization,
            phone=payload.provider.phone,
            fax=payload.provider.fax,
            address=payload.provider.address,
            tax_id=payload.provider.taxId,
        )
        db.add(provider)
        db.flush()
    else:
        if payload.provider.name:
            provider.name = payload.provider.name
        if provider_npi and not db.query(Provider).filter(Provider.npi == provider_npi, Provider.id != provider.id).first():
            provider.npi = provider_npi
        if payload.provider.specialty:
            provider.specialty = payload.provider.specialty
        if payload.provider.organization:
            provider.organization = payload.provider.organization

    # ── 3. Generate case number ────────────────────────────────────────────
    year = now.year
    all_cases = (
        db.query(AuthorizationRequest.case_number)
        .filter(AuthorizationRequest.case_number.like(f"PA-{year}-%"))
        .all()
    )
    max_seq = 0
    for (cn,) in all_cases:
        if cn:
            try:
                num = int(cn.split("-")[-1])
                if num > max_seq:
                    max_seq = num
            except (ValueError, IndexError):
                pass

    seq = max_seq + 1
    while True:
        case_number = f"PA-{year}-{seq:05d}"
        if not db.query(AuthorizationRequest).filter(AuthorizationRequest.case_number == case_number).first():
            break
        seq += 1

    # ── 4. Determine risk ──────────────────────────────────────────────────
    risk_map = {"urgent": "high", "high": "high", "normal": "medium", "low": "low"}
    risk = risk_map.get((payload.priority or "normal").lower(), "medium")

    # ── 5. Create the request ──────────────────────────────────────────────
    req_id = f"auth-{uuid.uuid4().hex[:8]}"
    req = AuthorizationRequest(
        id=req_id,
        case_number=case_number,
        patient_id=patient.id,
        provider_id=provider.id,
        diagnoses=[d.model_dump() for d in payload.diagnoses],
        procedures=[p.model_dump() for p in payload.procedures],
        status="Pending Review",
        priority=(payload.priority or "normal").lower(),
        risk_level=risk,
        submitted_at=now,
        updated_at=now,
        due_date=now + timedelta(days=3),
        assigned_to=None,
        clinical_notes=payload.clinicalNotes,
        ai_recommendation=None,
        policy_id=payload.patient.policyId or None,
        policy_context=None,   # populated by background thread after context mapping
    )
    db.add(req)
    db.flush()

    # ── 6. Save documents ──────────────────────────────────────────────────
    for doc in (payload.documents or []):
        db.add(Document(
            id=f"doc-{uuid.uuid4().hex[:12]}",   # always generate fresh — frontend IDs may collide
            authorization_id=req.id,
            name=doc.name,
            type=doc.type,
            size=doc.size,
            uploaded_by=doc.uploadedBy,
            uploaded_at=datetime.fromisoformat(doc.uploadedAt.replace("Z", "")) if doc.uploadedAt else now,
        ))

    # ── 7. Initial audit entry ─────────────────────────────────────────────
    db.add(AuditLog(
        id=f"at-{uuid.uuid4().hex[:8]}",
        authorization_id=req.id,
        action="Request Submitted",
        performed_by=provider.name,
        role="Provider",
        timestamp=now,
        details=f"Prior authorization request submitted for {payload.diagnoses[0].description if payload.diagnoses else 'procedure'}.",
        category="submission",
        event_metadata={
            "Procedure": payload.procedures[0].code if payload.procedures else "",
            "CodingSystem": payload.procedures[0].codingSystem if payload.procedures else "",
            "Payer": payload.patient.payer or "",
            "PolicyId": payload.patient.policyId or "",
            "Priority": payload.priority or "normal",
        },
    ))
    db.commit()

    # ── 7.5 Synchronously perform context mapping & rule evaluation ─────────
    try:
        from api.routes.context import map_policy, MapPolicyRequest
        from api.routes.evaluation import _evaluate_and_store

        procs = req.procedures or []
        first_proc = procs[0] if procs else {}
        mapping = map_policy(MapPolicyRequest(
            policyId=req.policy_id or None,
            serviceCode=first_proc.get("code") or None,
            codingSystem=first_proc.get("codingSystem") or "CPT",
            caseId=req.id,
        ))
        req.policy_context = mapping
        db.flush()
        _evaluate_and_store(req, db)
    except Exception as exc:
        logger = __import__("logging").getLogger(__name__)
        logger.warning("Synchronous context mapping / evaluation failed for %s: %s", req.id, exc)

    # ── 8. Auto-trigger validation & preprocessing + context mapping in background ──
    def _trigger_pipeline(auth_id: str) -> None:
        """
        Background thread — runs two sequential modules after submission:
          Module 3: Validation & Preprocessing (OCR, NLP, structuring)
          Module 4: Context & Policy Mapping (policyId → applicable ruleset)

        All processing runs asynchronously so the POST /authorizations response is never blocked.
        """
        import logging
        log = logging.getLogger(__name__)

        bg_db = SessionLocal()
        try:
            # ── Module 4: Context & Policy Mapping (runs first — only needs
            # policyId/service code, not OCR) so its matched ruleset field
            # vocabulary can guide Module 3's clinical NLP extraction. ──────
            applicable_rule_sets: list = []
            try:
                bg_req = bg_db.query(AuthorizationRequest).filter(
                    AuthorizationRequest.id == auth_id
                ).first()

                if bg_req is None:
                    log.warning("Context mapping skipped — request %s not found", auth_id)
                    return

                # Extract the inputs for map_policy
                req_policy_id  = bg_req.policy_id or ""
                procs          = bg_req.procedures or []
                service_code   = procs[0].get("code", "")           if procs else ""
                coding_system  = procs[0].get("codingSystem", "CPT") if procs else "CPT"

                if not req_policy_id and not service_code:
                    log.info("Context mapping skipped for %s — no policyId or serviceCode", auth_id)
                else:
                    from api.routes.context import map_policy, MapPolicyRequest
                    result = map_policy(MapPolicyRequest(
                        policyId=req_policy_id or None,
                        serviceCode=service_code or None,
                        codingSystem=coding_system or None,
                        caseId=auth_id,
                    ))

                    # Persist the mapping result to the policy_context column
                    bg_req.policy_context = result
                    bg_req.updated_at     = datetime.utcnow()
                    applicable_rule_sets  = result.get("applicableRuleSets", [])

                    # Audit log entry
                    matched     = result.get("matched", False)
                    policy_name = result.get("policyName", "")
                    method      = result.get("matchMethod", "none")
                    rule_count  = len(applicable_rule_sets)

                    bg_db.add(AuditLog(
                        id=f"at-{uuid.uuid4().hex[:8]}",
                        authorization_id=auth_id,
                        action="Context & Policy Mapping Completed" if matched else "Context Mapping — No Match",
                        performed_by="Prioris Policy Engine",
                        role="System",
                        timestamp=datetime.utcnow(),
                        details=(
                            f"Matched policy: {policy_name} ({req_policy_id}) via {method}. "
                            f"{rule_count} applicable rule set(s) identified."
                        ) if matched else (
                            f"No matching ruleset found for policyId='{req_policy_id}' / "
                            f"serviceCode='{service_code}'. Suggestions: {len(result.get('suggestions', []))}."
                        ),
                        new_value=result.get("policyId") or "unmatched",
                        category="context_mapping",
                        event_metadata={
                            "matchMethod":       method,
                            "policyId":          result.get("policyId"),
                            "policyName":        policy_name,
                            "rulesetFile":       result.get("rulesetFile"),
                            "applicableRuleSets": [rs.get("ruleSetId") for rs in applicable_rule_sets],
                            "serviceCode":       service_code,
                            "codingSystem":      coding_system,
                        },
                    ))
                    bg_db.commit()
                    log.info(
                        "Module 4 context mapping completed for %s — %s, method=%s",
                        auth_id, policy_name or "no match", method,
                    )

            except Exception as exc:
                log.warning("Module 4 context mapping failed for %s: %s", auth_id, exc)
                try:
                    bg_db.rollback()
                except Exception:
                    pass

            # ── Module 3: Validation pipeline (NLP extraction is now aware
            # of the exact policy_facts field vocabulary the matched ruleset
            # requires) ──────────────────────────────────────────────────
            try:
                from api.routes.validation import _run_pipeline, _load_req
                bg_req = _load_req(auth_id, bg_db)
                _run_pipeline(bg_req, bg_db, applicable_rule_sets=applicable_rule_sets)
                log.info("Module 3 pipeline completed for %s", auth_id)
            except Exception as exc:
                log.warning("Module 3 pipeline failed for %s: %s", auth_id, exc)

            # ── Rule-based evaluation ───────────────────────────────────
            try:
                bg_req = bg_db.query(AuthorizationRequest).filter(
                    AuthorizationRequest.id == auth_id
                ).first()
                if bg_req is not None:
                    from api.routes.evaluation import _evaluate_and_store
                    _evaluate_and_store(bg_req, bg_db)
            except Exception as exc:
                log.warning("Rule evaluation failed for %s: %s", auth_id, exc)
                try:
                    bg_db.rollback()
                except Exception:
                    pass

            # ── Module 6A: Policy Evidence + LLM Explanation ────────────
            try:
                from api.routes.explanation import generate_explanation
                generate_explanation(auth_id, bg_db)
            except Exception as exc:
                log.warning("Explanation generation failed for %s: %s", auth_id, exc)
                try:
                    bg_db.rollback()
                except Exception:
                    pass

        finally:
            bg_db.close()

    # When documents are included, the provider uploads their binary content
    # immediately after this response. Processing starts from /process only
    # after those uploads finish, preventing OCR from racing the upload.
    if payload.documents:
        logger = __import__("logging").getLogger(__name__)
        logger.info("Processing deferred for %s until document upload completes", req.id)
    else:
        threading.Thread(target=_trigger_pipeline, args=(req.id,), daemon=True).start()

    # Return full shape
    created = _load(db).filter(AuthorizationRequest.id == req.id).first()
    result = _ser(created)
    result["caseNumber"] = case_number   # ensure frontend gets it in top-level too
    return result


@router.post("/{case_id}/process", status_code=202)
def process_authorization(case_id: str, db: Session = Depends(get_db)):
    """Start processing after provider uploads the request's binary documents."""
    req = db.query(AuthorizationRequest).filter(AuthorizationRequest.id == case_id).first()
    if not req:
        req = db.query(AuthorizationRequest).filter(AuthorizationRequest.case_number == case_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Case not found")

    def _process() -> None:
        bg_db = SessionLocal()
        try:
            from api.routes.validation import _load_req, _run_pipeline
            from api.routes.context import map_policy, MapPolicyRequest
            from api.routes.evaluation import _evaluate_and_store

            # Map policy first so its field vocabulary can guide NLP extraction.
            bg_req = bg_db.query(AuthorizationRequest).filter(AuthorizationRequest.id == req.id).first()
            procedures = bg_req.procedures or []
            first_procedure = procedures[0] if procedures else {}
            mapping = map_policy(MapPolicyRequest(
                policyId=bg_req.policy_id or None,
                serviceCode=first_procedure.get("code") or None,
                codingSystem=first_procedure.get("codingSystem") or "CPT",
                caseId=bg_req.id,
            ))
            bg_req.policy_context = mapping
            bg_req.updated_at = datetime.utcnow()
            bg_db.commit()

            bg_req = _load_req(req.id, bg_db)
            _run_pipeline(bg_req, bg_db, applicable_rule_sets=mapping.get("applicableRuleSets", []))
            bg_req = bg_db.query(AuthorizationRequest).filter(AuthorizationRequest.id == req.id).first()
            _evaluate_and_store(bg_req, bg_db)
        except Exception:
            bg_db.rollback()
        finally:
            bg_db.close()

    threading.Thread(target=_process, daemon=True).start()
    return {"status": "processing", "caseId": req.id, "message": "Documents uploaded. Processing has started."}


@router.patch("/{case_id}/decision")
def submit_decision(case_id: str, payload: DecisionPayload, db: Session = Depends(get_db)):
    req = db.query(AuthorizationRequest).filter(AuthorizationRequest.id == case_id).first()
    if not req:
        req = db.query(AuthorizationRequest).filter(AuthorizationRequest.case_number == case_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Case not found")

    old_status = req.status
    # Map frontend decision strings → status values
    status_map = {
        "Approve":                    "Approved",
        "Approved":                   "Approved",
        "Deny":                       "Not Approved",
        "Denied":                     "Not Approved",
        "Rejected":                   "Not Approved",
        "Not Approved":               "Not Approved",
        "More Information Required":  "More Information Required",
        "Nurse Review Needed":         "Nurse Review Required",
        "Nurse Review Required":       "Nurse Review Required",
        "approved":                   "Approved",
        "denied":                     "Not Approved",
        "rejected":                   "Not Approved",
        "more_info":                  "More Information Required",
    }
    req.status = status_map.get(payload.decision, payload.decision)
    req.updated_at = datetime.utcnow()

    # Audit entry
    db.add(AuditLog(
        id=f"at-{uuid.uuid4().hex[:8]}",
        authorization_id=req.id,
        action=f"Request {req.status}",
        performed_by="Sarah Henderson",   # reviewer identity — replace with JWT user when auth added
        role="Insurance Reviewer",
        timestamp=datetime.utcnow(),
        details=payload.rationale or "",
        previous_value=old_status,
        new_value=req.status,
        category="decision",
        event_metadata={"Decision": req.status},
    ))

    # ── Auto-notification to provider (and reviewer for nurse review) ──────
    patient_name  = req.patient.name if req.patient else "the patient"
    case_num      = req.case_number
    now_ts        = datetime.utcnow()

    notif_type_map = {
        "Approved":                  ("success", "✅ Authorization Approved",
                                      f"PA request {case_num} for {patient_name} has been approved."),
        "Not Approved":              ("error",   "❌ Authorization Not Approved",
                                      f"PA request {case_num} for {patient_name} has been denied. Reason: {payload.rationale or 'See case details.'}"),
        "More Information Required": ("warning", "⚠️ More Information Required",
                                      f"PA request {case_num} for {patient_name} requires additional information before a decision can be made."),
        "Nurse Review Required":     ("info",    "🩺 Sent to Nurse Review Queue",
                                      f"PA request {case_num} for {patient_name} has been escalated for clinical nurse review."),
    }

    notif_cfg = notif_type_map.get(req.status)
    if notif_cfg:
        notif_type, title, message = notif_cfg

        # Notify the provider (all providers in demo — production would filter by req.provider_id → user)
        provider_users = db.query(User).filter(User.role == "provider").all()
        for pu in provider_users:
            db.add(Notification(
                id=f"notif-{uuid.uuid4().hex[:10]}",
                user_id=pu.id,
                title=title,
                message=message,
                type=notif_type,
                timestamp=now_ts,
                is_read=False,
                case_id=req.id,
            ))

        # For Nurse Review Required — also notify all reviewer users
        if req.status == "Nurse Review Required":
            reviewer_users = db.query(User).filter(User.role == "reviewer").all()
            for ru in reviewer_users:
                db.add(Notification(
                    id=f"notif-{uuid.uuid4().hex[:10]}",
                    user_id=ru.id,
                    title="🩺 New Nurse Review Case",
                    message=f"PA request {case_num} for {patient_name} has been added to the nurse review queue.",
                    type="info",
                    timestamp=now_ts,
                    is_read=False,
                    case_id=req.id,
                ))

    db.commit()

    updated = _load(db).filter(AuthorizationRequest.id == req.id).first()
    return {"message": "Decision recorded", "case": _ser(updated)}