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
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from core.database import (
    AuditLog, AuthorizationRequest, Document, Notification, Patient, Provider, User, get_db,
    SessionLocal,
)

router = APIRouter()


# ── Serialiser ────────────────────────────────────────────────────────────────

def _ser(req: AuthorizationRequest) -> Dict[str, Any]:
    """Convert ORM row → exact AuthorizationRequest JSON shape expected by the frontend."""
    p = req.patient
    prov = req.provider

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
        # Module 4 — Context & Policy Mapping
        "policyId":      req.policy_id,
        "policyContext": req.policy_context,
        "ruleEvaluation": (req.policy_context or {}).get("ruleEvaluation"),
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
    if status and status.lower() not in ("all", ""):
        q = q.filter(AuthorizationRequest.status.ilike(status))
    if priority and priority.lower() not in ("all", ""):
        q = q.filter(AuthorizationRequest.priority == priority.lower())
    cases = q.order_by(AuthorizationRequest.submitted_at.desc()).all()

    if search:
        s = search.lower()
        cases = [
            c for c in cases
            if s in (c.case_number or "").lower()
            or s in (c.patient.name if c.patient else "").lower()
            or s in (c.provider.name if c.provider else "").lower()
            or any(s in (pr.get("description", "")).lower() for pr in (c.procedures or []))
        ]

    return {"total": len(cases), "cases": [_ser(c) for c in cases]}


@router.get("/{case_id}")
def get_authorization(case_id: str, db: Session = Depends(get_db)):
    req = _load(db).filter(AuthorizationRequest.id == case_id).first()
    if not req:
        # also try by case_number
        req = _load(db).filter(AuthorizationRequest.case_number == case_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Case not found")
    return _ser(req)


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
            valid_keys.update({f"POL-00{i}" for i in range(1, 10)})
            if policy_id.upper() not in valid_keys:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid Policy ID '{policy_id}'. Policy ID must match an existing predefined ruleset policy."
                )
        except HTTPException:
            raise
        except Exception:
            pass

    # ── 1. Upsert patient by memberId ──────────────────────────────────────
    patient = db.query(Patient).filter(Patient.member_id == payload.patient.memberId).first()
    if not patient:
        patient = Patient(
            id=f"p-{uuid.uuid4().hex[:8]}",
            name=payload.patient.name,
            dob=datetime.strptime(payload.patient.dob, "%Y-%m-%d").date() if payload.patient.dob else now.date(),
            member_id=payload.patient.memberId,
            group_id=payload.patient.groupId,
            plan=payload.patient.plan,
            payer=payload.patient.payer,
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
        patient.plan = payload.patient.plan or patient.plan
        patient.payer = payload.patient.payer or patient.payer

    # ── 2. Upsert provider by NPI ──────────────────────────────────────────
    provider_npi = payload.provider.npi or "0000000000"
    provider = db.query(Provider).filter(Provider.npi == provider_npi).first()
    if not provider:
        provider = Provider(
            id=payload.provider.id or f"prov-{uuid.uuid4().hex[:8]}",
            name=payload.provider.name or "Unknown Provider",
            npi=provider_npi,
            specialty=payload.provider.specialty,
            organization=payload.provider.organization,
            phone=payload.provider.phone,
            fax=payload.provider.fax,
            address=payload.provider.address,
            tax_id=payload.provider.taxId,
        )
        db.add(provider)
        db.flush()

    # ── 3. Generate case number ────────────────────────────────────────────
    year = now.year
    last = (
        db.query(AuthorizationRequest)
        .filter(AuthorizationRequest.case_number.like(f"PA-{year}-%"))
        .order_by(AuthorizationRequest.submitted_at.desc())
        .first()
    )
    if last:
        try:
            last_seq = int(last.case_number.split("-")[-1])
        except ValueError:
            last_seq = 0
        seq = last_seq + 1
    else:
        seq = 1
    case_number = f"PA-{year}-{seq:05d}"

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
                        performed_by="CareAuth Policy Engine",
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