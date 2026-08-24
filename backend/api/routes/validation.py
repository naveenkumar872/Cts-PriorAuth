"""
Module 3: Validation & Preprocessing Pipeline
/api/v1/validation/

Four sequential steps:
  Step 1 — Validate required fields          (pure Python rules)
  Step 2 — Extract text from documents        (REAL: Gemini 2.5 Flash vision OCR)
  Step 3 — Process clinical notes & results   (REAL: Gemini 2.5 Flash NLP)
  Step 4 — Convert to structured PA data      (aggregation + scoring)

For Step 2:
  PDF   → PyMuPDF renders each page as PNG image → Gemini reads each image
  Image → sent directly to Gemini vision
  DOCX  → python-docx extracts raw text → sent to Gemini for cleanup/structuring
  TXT   → read as plain text → sent to Gemini
  Other → skipped with a note

For Step 3:
  Combined text (clinical_notes + extracted doc text) is sent to Gemini
  with a structured JSON extraction prompt. Gemini returns:
  {icd10_codes, cpt_codes, medications, severity_indicators,
   duration_signals, conservative_treatment_documented, key_findings, ...}
"""

import io
import json
import logging
import os
import re
import shutil
import time
import uuid
from datetime import datetime, date
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

try:
    from kreuzberg import extract_file_sync, extract_bytes_sync
except ImportError:
    extract_file_sync = None
    extract_bytes_sync = None

try:
    from google import genai
    from google.genai import types as genai_types
except Exception:
    try:
        import google.generativeai as genai
        genai_types = None
    except Exception:
        genai = None
        genai_types = None
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from core.config import settings
from core.database import (
    AuditLog, AuthorizationRequest, Document,
    Patient, Provider, ValidationResult, get_db,
)
from core.privacy import anonymize_text, anonymize_patient_payload

log = logging.getLogger(__name__)

router = APIRouter()

# ── Gemini client (singleton) ─────────────────────────────────────────────────
_gemini_client = None

def _get_gemini():
    global _gemini_client
    if _gemini_client is None:
        if not settings.GEMINI_API_KEY:
            raise RuntimeError("GEMINI_API_KEY is not configured in .env")
        try:
            from google import genai
            _gemini_client = genai.Client(api_key=settings.GEMINI_API_KEY)
        except Exception:
            import google.generativeai as genai_legacy
            genai_legacy.configure(api_key=settings.GEMINI_API_KEY)
            _gemini_client = genai_legacy
    return _gemini_client

GEMINI_MODEL = "gemini-3.5-flash"

# ── File paths ────────────────────────────────────────────────────────────────
UPLOAD_ROOT = Path(__file__).parent.parent.parent / "uploads"

# ── Validation regexes ────────────────────────────────────────────────────────
ICD10_RE  = re.compile(r'^[A-Z]\d{2}(\.\d{1,4})?$')
CPT_RE    = re.compile(r'^\d{5}$')
NPI_RE    = re.compile(r'^\d{10}$')
MEMBER_RE = re.compile(r'^[A-Z0-9\-]{4,20}$', re.IGNORECASE)
DATE_FMTS = ("%Y-%m-%d", "%m/%d/%Y", "%d-%m-%Y")


def _parse_date(s: str) -> Optional[date]:
    for fmt in DATE_FMTS:
        try:
            return datetime.strptime(s, fmt).date()
        except (ValueError, TypeError):
            pass
    return None


def _serialize(vr: ValidationResult) -> Dict[str, Any]:
    return {
        "id":              vr.id,
        "authorizationId": vr.authorization_id,
        "pipelineStatus":  vr.pipeline_status,
        "ranAt":           vr.ran_at.isoformat() + "Z" if vr.ran_at else None,
        "durationMs":      vr.duration_ms,
        "steps": {
            "step1": {
                "label":   "Validate Required Information",
                "status":  vr.step1_status,
                "issues":  vr.step1_issues  or [],
                "summary": vr.step1_summary or "",
            },
            "step2": {
                "label":     "Extract Text from Documents",
                "status":    vr.step2_status,
                "extracted": vr.step2_extracted or [],
                "summary":   vr.step2_summary   or "",
            },
            "step3": {
                "label":    "Process Clinical Notes & Results",
                "status":   vr.step3_status,
                "entities": vr.step3_entities or {},
                "summary":  vr.step3_summary  or "",
            },
            "step4": {
                "label":      "Convert to Structured PA Data",
                "status":     vr.step4_status,
                "structured": vr.step4_structured or {},
                "summary":    vr.step4_summary    or "",
            },
        },
    }


# ─────────────────────────────────────────────────────────────────────────────
# Step 1 — Validate required fields (pure Python, no AI)
# ─────────────────────────────────────────────────────────────────────────────

def _run_step1(req: AuthorizationRequest, db: Optional[Session] = None) -> Dict[str, Any]:
    issues: List[Dict] = []
    patient  = req.patient
    provider = req.provider

    def issue(field: str, severity: str, message: str, resolution: str):
        issues.append({
            "id":         f"v-{uuid.uuid4().hex[:8]}",
            "field":      field,
            "severity":   severity,
            "message":    message,
            "resolution": resolution,
        })

    # Patient
    if not patient:
        issue("patient", "critical", "Patient information is missing.", "Provide full patient demographics.")
    else:
        if not (patient.name or "").strip():
            issue("patient.name", "critical", "Patient name is required.", "Enter the patient's legal full name.")
        if patient.dob:
            dob_str = patient.dob.isoformat() if hasattr(patient.dob, "isoformat") else str(patient.dob)
            parsed  = _parse_date(dob_str)
            if parsed is None:
                issue("patient.dob", "critical", "Date of birth is not a valid date.", "Use YYYY-MM-DD format.")
            elif parsed >= date.today():
                issue("patient.dob", "critical", "Date of birth cannot be today or in the future.", "Enter the correct date of birth.")
        else:
            issue("patient.dob", "critical", "Date of birth is required.", "Enter the patient's date of birth.")
        mid = (patient.member_id or "").strip()
        if not mid:
            issue("patient.memberId", "critical", "Insurance Member ID is required.", "Enter the patient's insurance member ID.")
        elif not MEMBER_RE.match(mid):
            issue("patient.memberId", "warning", f"Member ID '{mid}' format looks unusual.", "Standard member IDs are 4–20 alphanumeric characters.")
        elif db is not None:
            db_patient = db.query(Patient).filter(Patient.member_id.ilike(mid)).first()
            if not db_patient:
                issue(
                    "patient.memberId",
                    "warning",
                    f"Member ID '{mid}' is not currently registered in the database.",
                    "Verify member ID against health plan eligibility database or register patient."
                )
        # Patient Payer and Plan are auto-populated by active session context, not input in provider form

    # Provider (auto-populated by authenticated provider session)
    if not provider:
        issue("provider", "critical", "Provider information is missing.", "Attach a valid provider to this request.")
    else:
        if not (provider.name or "").strip():
            issue("provider.name", "critical", "Provider name is required.", "Enter the physician's full name.")
        npi = (provider.npi or "").strip()
        if not npi:
            issue("provider.npi", "critical", "Provider NPI number is required.", "Enter the 10-digit NPI number.")
        elif not NPI_RE.match(npi):
            issue("provider.npi", "warning", f"NPI '{npi}' is not a valid 10-digit number.", "NPI must be exactly 10 numeric digits.")

    # Diagnoses
    diagnoses = req.diagnoses or []
    if not diagnoses:
        issue("diagnoses", "critical", "At least one diagnosis (ICD-10) is required.", "Add a primary ICD-10 diagnosis code.")
    else:
        if not any(d.get("type") == "primary" for d in diagnoses):
            issue("diagnoses", "critical", "A primary diagnosis must be designated.", "Mark one diagnosis as 'primary'.")
        for i, diag in enumerate(diagnoses):
            code = (diag.get("code") or "").strip()
            desc = (diag.get("description") or "").strip()
            if not code:
                issue(f"diagnoses[{i}].code", "critical", f"Diagnosis {i+1} is missing an ICD-10 code.", "Enter a valid ICD-10 code.")
            if not desc:
                issue(f"diagnoses[{i}].description", "warning", f"Diagnosis {i+1} is missing a description.", "Add a description for the diagnosis.")

    # Procedures
    procedures = req.procedures or []
    if not procedures:
        issue("procedures", "critical", "At least one procedure (CPT code) is required.", "Add the requested procedure with a CPT code.")
    else:
        for i, proc in enumerate(procedures):
            code = (proc.get("code") or "").strip()
            desc = (proc.get("description") or "").strip()
            sdt  = (proc.get("serviceDate") or "").strip()
            if not code:
                issue(f"procedures[{i}].code", "critical", f"Procedure {i+1} is missing a CPT code.", "Enter a valid CPT code.")
            if not desc:
                issue(f"procedures[{i}].description", "warning", f"Procedure {i+1} is missing a description.", "Provide a procedure name.")

            if sdt and _parse_date(sdt) is None:
                issue(f"procedures[{i}].serviceDate", "warning", f"Service date '{sdt}' is invalid.", "Use YYYY-MM-DD format.")

    # Clinical notes
    notes = (req.clinical_notes or "").strip()
    if not notes:
        issue("clinicalNotes", "warning", "Clinical notes are missing in provider submission.", "Document the clinical indication and prior treatments.")
    elif len(notes.split()) < 10:
        issue("clinicalNotes", "warning", "Clinical notes are very brief.", "Provide detailed clinical justification.")


    # Documents
    if not (req.documents or []):
        issue("documents", "warning", "No supporting documents attached.", "Upload clinical notes, imaging reports, or lab results.")

    crits = sum(1 for i in issues if i["severity"] == "critical")
    warns = sum(1 for i in issues if i["severity"] == "warning")

    if crits > 0:
        status  = "failed"
        summary = f"{crits} critical issue(s) and {warns} warning(s). Resolve critical issues before proceeding."
    elif warns > 0:
        status  = "warning"
        summary = f"All required fields present. {warns} warning(s) noted — review recommended."
    else:
        status  = "passed"
        summary = "All required fields validated successfully. Patient, provider, diagnosis, procedure and clinical information are complete."

    return {"status": status, "issues": issues, "summary": summary}


# ─────────────────────────────────────────────────────────────────────────────
# Step 2 — Hybrid OCR Engine: Tesseract for PDFs, Gemini Vision for Images/Notes
# ─────────────────────────────────────────────────────────────────────────────

# ─────────────────────────────────────────────────────────────────────────────
# Step 2 — Unified Document Extraction Engine (Kreuzberg + Gemini Vision)
# ─────────────────────────────────────────────────────────────────────────────

def _extract_text_with_kreuzberg(file_path: Path) -> Tuple[str, float, str]:
    """Extract text from PDFs, DOCX, TXT, CSV, and images using Kreuzberg document extractor."""
    if extract_file_sync is not None:
        try:
            res = extract_file_sync(file_path)
            text = (res.content if hasattr(res, "content") else str(res)).strip()
            word_count = len(text.split())
            if word_count > 0:
                return text, 0.98, "kreuzberg"
        except Exception:
            pass

    ext = file_path.suffix.lower()
    if ext in (".txt", ".csv"):
        try:
            text = file_path.read_text(encoding="utf-8", errors="replace").strip()
            if text:
                return text, 0.99, "text-reader"
        except Exception:
            pass

    return "", 0.0, "kreuzberg"


def _extract_document_text(client: Any, file_path: Path, doc_type: str) -> Tuple[str, float, str]:
    """
    Kreuzberg 100% Local Document Extractor:
    Extracts text from PDFs, DOCX, TXT, CSV, and images completely offline using Kreuzberg.
    Zero document images or bytes leave the local server.
    """
    text, conf, engine = _extract_text_with_kreuzberg(file_path)
    if text:
        return text, max(conf, 0.85), "kreuzberg"

    return "No readable text extracted from document.", 0.3, "kreuzberg"


def _run_step2(req: AuthorizationRequest) -> Dict[str, Any]:
    documents = req.documents or []

    if not documents:
        return {
            "status":    "warning",
            "extracted": [],
            "summary":   "No documents attached. OCR skipped. Upload supporting documents to enable text extraction.",
        }

    # Check how many have actual files on disk
    docs_with_files = [d for d in documents if d.file_url and
                       (UPLOAD_ROOT.parent / d.file_url).exists()]
    docs_meta_only  = [d for d in documents if d not in docs_with_files]

    client = _get_gemini()
    extracted = []

    # Process docs with real files using Hybrid OCR dispatcher
    for doc in docs_with_files:
        file_path = UPLOAD_ROOT.parent / doc.file_url

        text, confidence, engine_name = _extract_document_text(client, file_path, doc.type or "other")

        word_count = len(text.split()) if text else 0
        # Estimate pages
        pages = max(1, word_count // 300)

        extracted.append({
            "docId":        doc.id,
            "docName":      doc.name,
            "docType":      doc.type or "other",
            "fileSize":     doc.size or "N/A",
            "uploadedBy":   doc.uploaded_by or "Provider",
            "filePath":     doc.file_url,
            "extractedText": text,
            "textPreview":  text[:300] + "..." if len(text) > 300 else text,
            "wordCount":    word_count,
            "pages":        pages,
            "confidence":   round(confidence, 2),
            "extractedAt":  datetime.utcnow().isoformat() + "Z",
            "ocrEngine":    engine_name,
            "status":       "extracted" if confidence > 0.3 else "failed",
        })

    # Docs with no file on disk (metadata only)
    for doc in docs_meta_only:
        extracted.append({
            "docId":        doc.id,
            "docName":      doc.name,
            "docType":      doc.type or "other",
            "fileSize":     doc.size or "N/A",
            "uploadedBy":   doc.uploaded_by or "Provider",
            "filePath":     doc.file_url or None,
            "extractedText": "",
            "textPreview":  "No file uploaded yet — metadata only.",
            "wordCount":    0,
            "pages":        0,
            "confidence":   0.0,
            "extractedAt":  datetime.utcnow().isoformat() + "Z",
            "ocrEngine":    "none",
            "status":       "no_file",
        })

    total_words = sum(e["wordCount"] for e in extracted)
    total_pages = sum(e["pages"] for e in extracted if e["pages"] > 0)
    with_text   = [e for e in extracted if e["wordCount"] > 0]
    doc_types   = list({e["docType"] for e in extracted})
    engines_used = list({e["ocrEngine"] for e in extracted if e["ocrEngine"] != "none"})

    if not with_text:
        status = "warning"
        summary = (
            f"{len(documents)} document(s) found but no files have been uploaded yet. "
            "Upload the actual files for real OCR text extraction."
        )
    elif len(with_text) < len(documents):
        status = "warning"
        summary = (
            f"OCR completed on {len(with_text)}/{len(documents)} document(s). "
            f"~{total_words} words extracted across ~{total_pages} page(s). "
            f"Engines: {', '.join(engines_used) or 'tesseract'}. "
            f"{len(docs_meta_only)} document(s) have no file uploaded yet."
        )
    else:
        status = "passed"
        summary = (
            f"OCR completed on all {len(documents)} document(s) using Hybrid OCR ({', '.join(engines_used) or 'tesseract'}). "
            f"~{total_words} words extracted across ~{total_pages} page(s). "
            f"Document types: {', '.join(doc_types)}."
        )

    return {"status": status, "extracted": extracted, "summary": summary}


# ─────────────────────────────────────────────────────────────────────────────
# Step 3 — Real Gemini NLP: extract clinical entities from all text
# ─────────────────────────────────────────────────────────────────────────────

def _collect_ruleset_field_hints(applicable_rule_sets: Optional[List[Dict]]) -> List[Dict[str, Any]]:
    """
    Walk every pathway condition and exclusion in the matched ruleset(s) and
    collect the exact field names + allowed values the rule engine will need.
    This lets the NLP extraction prompt ask for the same vocabulary the rules
    use, instead of guessing generic policy_facts keys.
    """
    hints: Dict[str, Dict[str, Any]] = {}

    def _walk_conditions(conditions: List[Dict]) -> None:
        for cond in conditions or []:
            nested = cond.get("conditions")
            if isinstance(nested, list):
                _walk_conditions(nested)
                continue
            field = cond.get("field")
            if not field:
                continue
            entry = hints.setdefault(field, {"field": field, "operator": cond.get("operator", ""), "examples": []})
            value = cond.get("value")
            if value not in (None, ""):
                values = value if isinstance(value, list) else [value]
                for v in values:
                    if v not in entry["examples"]:
                        entry["examples"].append(v)
            for sub in cond.get("sub_conditions", []) or []:
                _walk_conditions([sub])

    for rule_set in applicable_rule_sets or []:
        for pathway in rule_set.get("pathways", []) or []:
            _walk_conditions(pathway.get("conditions", []))
        for exclusion in rule_set.get("exclusions", []) or []:
            eid = exclusion.get("exclusion_id") if isinstance(exclusion, dict) else None
            if eid:
                hints.setdefault(eid, {"field": eid, "operator": "EXCLUSION", "examples": []})

    return list(hints.values())


_ENTITY_EXTRACTION_PROMPT = """You are a clinical NLP system processing a Prior Authorization (PA) request.

Extract structured clinical entities from the text below and return ONLY valid JSON — no markdown, no explanation.

The JSON must follow this EXACT schema:
{
  "icd10_codes": [{"code": "M17.11", "description": "...", "type": "primary|secondary"}],
  "cpt_codes": [{"code": "27447", "description": "...", "valid": true}],
  "medications": ["metformin", "lisinopril"],
  "severity_indicators": ["severe pain", "grade IV osteoarthritis"],
  "duration_signals": ["6 months", "chronic", "persistent for 3 weeks"],
  "conservative_treatment_documented": true,
  "conservative_treatment_details": ["physical therapy x 12 weeks", "NSAIDs failed"],
  "key_clinical_findings": ["MRI confirms full-thickness rotator cuff tear", "..."],
  "dates_mentioned": ["2026-09-15", "2025-03-01"],
  "functional_limitations": ["unable to walk > 1 block", "..."],
  "relevant_history": ["prior knee surgery 2022", "..."],
    "policy_facts": {"field_name": "explicitly documented value"},
  "clinical_complexity_score": 75,
  "medical_necessity_strength": "strong|moderate|weak",
  "summary": "Brief 1-2 sentence clinical summary of the case"
}

Rules:
- clinical_complexity_score: 0-100 based on documentation completeness, diagnosis severity, and evidence quality
- medical_necessity_strength: "strong" = well-documented with evidence, "moderate" = partially documented, "weak" = minimal evidence
- conservative_treatment_documented: true only if prior non-surgical/non-invasive treatment is explicitly mentioned
- Extract ONLY what is actually present in the text — do not invent information
- policy_facts must contain only explicit, clinically relevant facts that can be
    matched against policy rule fields. Preserve the policy field concept as the
    key and use a boolean, number, string, or list of strings as the value.
- Do not infer policy_facts from general medical knowledge or missing evidence.
- If a field has no data found, use empty array [] or false/null

TEXT TO ANALYZE:
"""


def _run_step3(req: AuthorizationRequest, extracted_docs: List[Dict], field_hints: Optional[List[Dict]] = None) -> Dict[str, Any]:
    # Combine ALL text sources:
    # 1. Clinical notes (typed by provider in the form)
    # 2. Actual OCR-extracted text from every uploaded document
    text_parts = []

    if req.clinical_notes and req.clinical_notes.strip():
        text_parts.append(f"=== CLINICAL NOTES (Provider Submitted) ===\n{req.clinical_notes.strip()}")

    for doc in extracted_docs:
        ocr_text = doc.get("extractedText", "").strip()
        if ocr_text and doc.get("wordCount", 0) > 0:
            text_parts.append(
                f"=== DOCUMENT: {doc['docName']} (type: {doc['docType']}) ===\n{ocr_text}"
            )

    # Also include diagnoses and procedures from the form for context
    for d in (req.diagnoses or []):
        text_parts.append(f"Submitted diagnosis: {d.get('code','')} — {d.get('description','')} ({d.get('type','')})")
    for p in (req.procedures or []):
        text_parts.append(f"Requested procedure: CPT {p.get('code','')} — {p.get('description','')}")

    if not text_parts:
        return {
            "status": "warning",
            "entities": {
                "icd10_codes": [], "cpt_codes": [], "medications": [],
                "severity_indicators": [], "duration_signals": [],
                "conservative_treatment_documented": False,
                "conservative_treatment_details": [],
                "key_clinical_findings": [], "dates_mentioned": [],
                "functional_limitations": [], "relevant_history": [], "policy_facts": {},
                "clinical_complexity_score": 0,
                "medical_necessity_strength": "weak",
                "summary": "No clinical text available for analysis.",
                "notesWordCount": 0,
            },
            "summary": "No text available for NLP processing. Add clinical notes or upload documents.",
        }

    full_text = "\n\n".join(text_parts)

    # Anonymize clinical text to scrub PHI before sending to external Gemini LLM
    p_name = req.patient.name if req.patient else ""
    p_mid = req.patient.member_id if req.patient else ""
    p_dob = str(req.patient.dob) if req.patient and req.patient.dob else ""
    full_text = anonymize_text(full_text, patient_name=p_name, member_id=p_mid, dob_str=p_dob)

    field_hint_block = ""
    if field_hints:
        lines = []
        for h in field_hints:
            line = f"- {h['field']}"
            if h.get("examples"):
                line += f" (expects one of: {h['examples']})"
            if h.get("operator") == "EXCLUSION":
                line += " — coverage EXCLUSION; set true only if explicitly documented"
            lines.append(line)
        field_hint_block = (
            "\n\nThe applicable coverage policy requires these EXACT policy_facts keys "
            "(use these field names verbatim — do not invent your own names):\n"
            + "\n".join(lines)
            + "\nFor each, only populate it in policy_facts if the text explicitly supports a value; "
            "otherwise omit the key entirely (do not guess)."
        )

    prompt = _ENTITY_EXTRACTION_PROMPT + full_text + field_hint_block

    client = _get_gemini()
    try:
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config=genai_types.GenerateContentConfig(
                temperature=0.1,      # low temperature = consistent structured output
                response_mime_type="application/json",
            ),
        )
        raw = (response.text or "").strip()

        # Strip markdown code fences if Gemini wraps in ```json ... ```
        if raw.startswith("```"):
            raw = re.sub(r"^```(?:json)?\s*", "", raw)
            raw = re.sub(r"\s*```$", "", raw)

        entities = json.loads(raw)

    except json.JSONDecodeError as e:
        # If JSON parse fails, do a fallback extraction from raw text
        entities = {
            "icd10_codes":  [{"code": d.get("code",""), "description": d.get("description",""), "type": d.get("type","secondary")} for d in (req.diagnoses or [])],
            "cpt_codes":    [{"code": p.get("code",""), "description": p.get("description",""), "valid": bool(CPT_RE.match(p.get("code","")))} for p in (req.procedures or [])],
            "medications":  [],
            "severity_indicators": [],
            "duration_signals": [],
            "conservative_treatment_documented": False,
            "conservative_treatment_details": [],
            "key_clinical_findings": [],
            "dates_mentioned": [],
            "functional_limitations": [],
            "relevant_history": [],
            "policy_facts": {},
            "clinical_complexity_score": 30,
            "medical_necessity_strength": "weak",
            "summary": f"Gemini returned malformed JSON. Fallback to form data only. Error: {e}",
        }
    except Exception as e:
        return {
            "status":   "failed",
            "entities": {},
            "summary":  f"NLP processing failed: {e}",
        }

    # Add word count for UI display
    entities["notesWordCount"] = len((req.clinical_notes or "").split())
    entities["totalTextWords"] = len(full_text.split())

    # Determine step status based on entity quality
    score       = entities.get("clinical_complexity_score", 0)
    strength    = entities.get("medical_necessity_strength", "weak")
    conservative = entities.get("conservative_treatment_documented", False)

    issues = []
    if not conservative:
        issues.append("No prior conservative treatment documented.")
    if score < 30:
        issues.append("Clinical complexity score is low — insufficient documentation.")
    if strength == "weak":
        issues.append("Medical necessity evidence is weak.")

    if len(issues) >= 2:
        status = "warning"
    else:
        status = "passed"

    icd_count = len(entities.get("icd10_codes", []))
    cpt_count = len(entities.get("cpt_codes", []))
    med_count = len(entities.get("medications", []))

    summary = (
        f"Gemini NLP extraction complete. "
        f"{icd_count} ICD-10 code(s), {cpt_count} CPT code(s), {med_count} medication(s) identified. "
        f"Clinical complexity: {score}/100. Medical necessity: {strength.upper()}. "
        f"{'Prior conservative treatment documented.' if conservative else 'No prior conservative treatment found.'}"
        + (f" Attention: {'; '.join(issues)}" if issues else "")
    )

    return {"status": status, "entities": entities, "summary": summary}


# ─────────────────────────────────────────────────────────────────────────────
# Step 4 — Assemble structured PA data + completeness scoring
# ─────────────────────────────────────────────────────────────────────────────

def _run_step4(req: AuthorizationRequest, step1: Dict, step2: Dict, step3: Dict) -> Dict[str, Any]:
    patient  = req.patient
    provider = req.provider
    entities = step3.get("entities", {})
    docs     = step2.get("extracted", [])
    docs_with_text = [d for d in docs if d.get("wordCount", 0) > 0]

    # Completeness scoring per field category
    has_insurance = bool(patient and (patient.payer or patient.member_id or patient.group_id or req.policy_id))
    has_provider  = bool(provider and (provider.npi or provider.name))
    has_diag      = bool(req.diagnoses and any(d.get("code") or d.get("description") for d in req.diagnoses))
    has_proc      = bool(req.procedures and any(p.get("code") or p.get("description") for p in req.procedures))
    notes_text    = (req.clinical_notes or "").strip()
    notes_words   = len(notes_text.split())
    has_notes     = notes_words >= 5
    has_docs      = bool(docs_with_text or docs or notes_words >= 20)
    has_tx        = bool(
        entities.get("conservative_treatment_documented")
        or any(k in notes_text.lower() for k in ["treatment", "therapy", "physical", "nsaid", "trial", "history", "indication", "symptom", "pain", "month", "week", "year", "justification", "previous", "measurement", "test", "scan", "result"])
    )

    field_scores = {
        "patientDemographics":     10 if (patient and patient.name and patient.dob) else 0,
        "insuranceInfo":           10 if has_insurance else 0,
        "providerCredentials":     10 if has_provider else 0,
        "primaryDiagnosis":        15 if has_diag else 0,
        "procedureCodes":          15 if has_proc else 0,
        "clinicalNotes":           15 if notes_words >= 15 else (5 if has_notes else 0),
        "supportingDocuments":     15 if docs_with_text else (10 if docs else 0),
        "conservativeTxEvidence":  15 if has_tx else 0,
    }
    completeness = min(100, sum(field_scores.values()))

    # Risk assessment
    critical_issues = [i for i in step1.get("issues", []) if i.get("severity") == "critical"]
    warning_issues  = [i for i in step1.get("issues", []) if i.get("severity") == "warning"]

    if critical_issues or completeness < 40:
        risk = "high";   risk_reason = "Critical validation failures or incomplete submission."
    elif warning_issues or completeness < 70:
        risk = "medium"; risk_reason = "Some documentation gaps identified."
    else:
        risk = "low";    risk_reason = "Complete and well-documented submission."

    urgency_map = {"urgent": "STAT", "high": "Expedited", "normal": "Routine", "low": "Elective"}

    structured = {
        "paRequest": {
            "caseNumber":  req.case_number,
            "requestId":   req.id,
            "submittedAt": req.submitted_at.isoformat() + "Z" if req.submitted_at else None,
            "urgencyTier": urgency_map.get(req.priority, "Routine"),
            "priority":    req.priority,
        },
        "patient": {
            "name":        patient.name          if patient else None,
            "dob":         patient.dob.isoformat() if patient and patient.dob else None,
            "gender":      patient.gender         if patient else None,
            "memberId":    patient.member_id      if patient else None,
            "payer":       patient.payer          if patient else None,
            "plan":        patient.plan           if patient else None,
        },
        "provider": {
            "name":         provider.name         if provider else None,
            "npi":          provider.npi          if provider else None,
            "specialty":    provider.specialty    if provider else None,
            "organization": provider.organization if provider else None,
        },
        "clinicalData": {
            "diagnoses":                   req.diagnoses   or [],
            "procedures":                  req.procedures  or [],
            "clinicalNotes":               req.clinical_notes or "",
            # ── Gemini NLP output ──────────────────────────────────────
            "icd10CodesExtracted":         entities.get("icd10_codes", []),
            "cptCodesExtracted":           entities.get("cpt_codes", []),
            "medicationsFound":            entities.get("medications", []),
            "severityIndicators":          entities.get("severity_indicators", []),
            "durationSignals":             entities.get("duration_signals", []),
            "conservativeTxDocumented":    entities.get("conservative_treatment_documented", False),
            "conservativeTxDetails":       entities.get("conservative_treatment_details", []),
            "keyClinicialFindings":        entities.get("key_clinical_findings", []),
            "functionalLimitations":       entities.get("functional_limitations", []),
            "relevantHistory":             entities.get("relevant_history", []),
            "clinicalComplexityScore":     entities.get("clinical_complexity_score", 0),
            "medicalNecessityStrength":    entities.get("medical_necessity_strength", "weak"),
            "clinicalSummary":             entities.get("summary", ""),
            "policyFacts":                  entities.get("policy_facts", {}),
        },
        "documents": {
            "total":         len(docs),
            "withText":      len(docs_with_text),
            "types":         list({d["docType"] for d in docs}),
            "totalWords":    sum(d.get("wordCount", 0) for d in docs),
            "ocrCompleted":  len(docs_with_text) == len(docs) and len(docs) > 0,
        },
        "validationSummary": {
            "completenessScore":  completeness,
            "fieldBreakdown":     field_scores,
            "criticalIssues":     len(critical_issues),
            "warningIssues":      len(warning_issues),
            "riskLevel":          risk,
            "riskReason":         risk_reason,
            "readyForTriage":     completeness >= 70 and len(critical_issues) == 0,
        },
        "metadata": {
            "processedAt":    datetime.utcnow().isoformat() + "Z",
            "moduleVersion":  "3.1",
            "ocrEngine":      "gemini-2.5-flash-vision",
            "nlpEngine":      "gemini-2.5-flash",
            "pipelineSteps":  ["field_validation", "gemini_ocr", "gemini_nlp", "structuring"],
        },
    }

    vs = structured["validationSummary"]
    if completeness >= 70 and not critical_issues:
        status  = "passed"
        summary = (
            f"Structured PA data generated successfully. "
            f"Completeness: {completeness}/100. Risk: {risk.upper()}. "
            f"{'Ready for AI triage.' if vs['readyForTriage'] else 'Address warnings before triage.'}"
        )
    elif critical_issues:
        status  = "failed"
        summary = f"Incomplete PA data — {len(critical_issues)} critical issue(s). Completeness: {completeness}/100."
    else:
        status  = "warning"
        summary = "Procedure CPT & Diagnosis code(s) submitted without supporting clinical documentation or notes."

    return {"status": status, "structured": structured, "summary": summary}


# ─────────────────────────────────────────────────────────────────────────────
# Pipeline orchestrator
# ─────────────────────────────────────────────────────────────────────────────

def _run_pipeline(
    req: AuthorizationRequest,
    db: Session,
    applicable_rule_sets: Optional[List[Dict]] = None,
) -> ValidationResult:
    start_ms = int(time.time() * 1000)

    field_hints = _collect_ruleset_field_hints(applicable_rule_sets)

    s1 = _run_step1(req, db)
    s2 = _run_step2(req)
    s3 = _run_step3(req, s2.get("extracted", []), field_hints)
    s4 = _run_step4(req, s1, s2, s3)

    duration = int(time.time() * 1000) - start_ms

    statuses = [s1["status"], s2["status"], s3["status"], s4["status"]]
    if "failed"  in statuses: pipeline_status = "failed"
    elif "warning" in statuses: pipeline_status = "warning"
    else:                        pipeline_status = "passed"

    # Upsert
    existing = db.query(ValidationResult).filter(
        ValidationResult.authorization_id == req.id
    ).first()
    if existing:
        db.delete(existing)
        db.flush()

    vr = ValidationResult(
        id               = f"vr-{uuid.uuid4().hex[:10]}",
        authorization_id = req.id,
        pipeline_status  = pipeline_status,
        ran_at           = datetime.utcnow(),
        duration_ms      = duration,
        step1_status     = s1["status"],  step1_issues    = s1["issues"],    step1_summary = s1["summary"],
        step2_status     = s2["status"],  step2_extracted = s2["extracted"], step2_summary = s2["summary"],
        step3_status     = s3["status"],  step3_entities  = s3["entities"],  step3_summary = s3["summary"],
        step4_status     = s4["status"],  step4_structured= s4["structured"],step4_summary = s4["summary"],
    )
    db.add(vr)

    completeness = (s4.get("structured") or {}).get("validationSummary", {}).get("completenessScore", 0)
    db.add(AuditLog(
        id               = f"at-{uuid.uuid4().hex[:8]}",
        authorization_id = req.id,
        action           = "Module 3 Validation & Preprocessing Completed",
        performed_by     = "Prioris Validation Engine (Gemini 2.5 Flash)",
        role             = "System",
        timestamp        = datetime.utcnow(),
        details          = (
            f"Pipeline: {pipeline_status.upper()}. "
            f"OCR: {len([e for e in s2.get('extracted',[]) if e.get('wordCount',0)>0])} doc(s) processed. "
            f"Completeness: {completeness}/100. Duration: {duration}ms."
        ),
        new_value        = pipeline_status,
        category         = "system",
        event_metadata   = {
            "module":          "3",
            "pipelineStatus":  pipeline_status,
            "ocrEngine":       "gemini-2.5-flash",
            "nlpEngine":       "gemini-2.5-flash",
            "durationMs":      duration,
            "completeness":    completeness,
        },
    ))

    db.commit()
    db.refresh(vr)
    return vr


# ─────────────────────────────────────────────────────────────────────────────
# Route helpers
# ─────────────────────────────────────────────────────────────────────────────

def _load_req(case_id: str, db: Session) -> AuthorizationRequest:
    req = (
        db.query(AuthorizationRequest)
        .options(
            joinedload(AuthorizationRequest.patient),
            joinedload(AuthorizationRequest.provider),
            joinedload(AuthorizationRequest.documents),
        )
        .filter(AuthorizationRequest.id == case_id)
        .first()
    ) or (
        db.query(AuthorizationRequest)
        .options(
            joinedload(AuthorizationRequest.patient),
            joinedload(AuthorizationRequest.provider),
            joinedload(AuthorizationRequest.documents),
        )
        .filter(AuthorizationRequest.case_number == case_id)
        .first()
    )
    if not req:
        raise HTTPException(status_code=404, detail="Authorization request not found")
    return req


# ─────────────────────────────────────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/{case_id}")
def get_validation_result(case_id: str, db: Session = Depends(get_db)):
    """Fetch the latest stored validation result."""
    req = _load_req(case_id, db)
    vr  = db.query(ValidationResult).filter(
        ValidationResult.authorization_id == req.id
    ).first()
    if not vr:
        raise HTTPException(status_code=404, detail="No validation result found. Run the pipeline first.")
    return _serialize(vr)


@router.get("/{case_id}/structured-pa")
def get_structured_pa(case_id: str, db: Session = Depends(get_db)):
    """
    Return the final combined Structured PA JSON — the single authoritative
    output of the Validation & Preprocessing pipeline.

    Shape:
    {
      "caseNumber": "PA-2026-00001",
      "pipelineStatus": "passed|warning|failed",
      "ranAt": "<ISO datetime>",
      "durationMs": 4201,
      "paRequest":   { caseNumber, requestId, submittedAt, urgencyTier, priority },
      "patient":     { name, dob, gender, memberId, payer, plan },
      "provider":    { name, npi, specialty, organization },
      "clinicalData": {
          diagnoses, procedures, clinicalNotes,
          icd10CodesExtracted, cptCodesExtracted, medicationsFound,
          severityIndicators, durationSignals,
          conservativeTxDocumented, conservativeTxDetails,
          keyClinicialFindings, functionalLimitations, relevantHistory,
          clinicalComplexityScore, medicalNecessityStrength, clinicalSummary
      },
      "documents": { total, withText, types, totalWords, ocrCompleted },
      "extractedDocuments": [ { docId, docName, docType, wordCount,
                                confidence, ocrEngine, textPreview, extractedText } ],
      "validationSummary": {
          completenessScore, fieldBreakdown, criticalIssues,
          warningIssues, riskLevel, riskReason, readyForTriage
      },
      "validationIssues": [ { id, field, severity, message, resolution } ],
      "metadata": { processedAt, moduleVersion, ocrEngine, nlpEngine, pipelineSteps }
    }

    If the pipeline has not run yet (e.g. Gemini key not configured) it returns
    a 202 with a "pending" body so the frontend can show a spinner and retry.
    """
    req = _load_req(case_id, db)
    vr  = db.query(ValidationResult).filter(
        ValidationResult.authorization_id == req.id
    ).first()

    if not vr:
        # Pipeline not run yet — auto-trigger execution on demand and save to TiDB
        try:
            vr = _run_pipeline(req, db)
        except Exception as e:
            log.warning("Auto-triggering validation pipeline for %s failed: %s", req.case_number, e)
            from fastapi.responses import JSONResponse
            return JSONResponse(
                status_code=202,
                content={
                    "status": "pending",
                    "message": "Validation pipeline triggered automatically. Please retry in a few seconds.",
                    "caseNumber": req.case_number,
                    "requestId":  req.id,
                },
            )


    # Pull the step-4 structured blob (the main output)
    structured: Dict[str, Any] = vr.step4_structured or {}

    # Merge in pipeline-level metadata + the per-document OCR detail from step 2
    # and the raw validation issues from step 1, so callers have everything
    # in ONE document without needing to call the full /validation/{id} endpoint.
    combined: Dict[str, Any] = {
        # ── Identity ──────────────────────────────────────────────────────
        "caseNumber":    req.case_number,
        "requestId":     req.id,
        "pipelineStatus": vr.pipeline_status,
        "ranAt":         vr.ran_at.isoformat() + "Z" if vr.ran_at else None,
        "durationMs":    vr.duration_ms,

        # ── Step-4 structured sections (the core PA payload) ──────────────
        "paRequest":         structured.get("paRequest", {}),
        "patient":           structured.get("patient", {}),
        "provider":          structured.get("provider", {}),
        "clinicalData":      structured.get("clinicalData", {}),
        "documents":         structured.get("documents", {}),
        "validationSummary": structured.get("validationSummary", {}),
        "metadata":          structured.get("metadata", {}),

        # ── Step-1 issues list (for the UI to render field-level errors) ──
        "validationIssues": vr.step1_issues or [],

        # ── Step-2 per-document OCR detail ────────────────────────────────
        "extractedDocuments": [
            {
                "docId":         d.get("docId"),
                "docName":       d.get("docName"),
                "docType":       d.get("docType"),
                "wordCount":     d.get("wordCount", 0),
                "pages":         d.get("pages", 0),
                "confidence":    d.get("confidence", 0),
                "ocrEngine":     d.get("ocrEngine"),
                "status":        d.get("status"),
                "textPreview":   d.get("textPreview", ""),
                # full text intentionally kept — downstream rule engine needs it
                "extractedText": d.get("extractedText", ""),
            }
            for d in (vr.step2_extracted or [])
        ],
    }

    return combined


@router.post("/{case_id}/run", status_code=200)
def run_validation_pipeline(case_id: str, db: Session = Depends(get_db)):
    """Run (or re-run) the full Module 3 pipeline with real Gemini OCR + NLP."""
    req = _load_req(case_id, db)
    vr  = _run_pipeline(req, db)
    return _serialize(vr)


class ReapplyRequestPayload(BaseModel):
    newDocuments: Optional[List[Dict[str, Any]]] = []
    additionalNotes: Optional[str] = None


@router.post("/{case_id}/reapply")
def reapply_authorization_request(
    case_id: str,
    payload: ReapplyRequestPayload,
    db: Session = Depends(get_db)
):
    """
    Provider re-applies / submits missing documentation for a case that had status 'More Information Required'.
    Appends new missing documents to existing req.documents, appends clinical notes,
    sets status to 'Nurse Review Required', re-runs validation pipeline,
    and logs an audit entry so the case is continued (not newly created).
    """
    req = _load_req(case_id, db)

    # 1. Append new documents to existing req.documents
    added_doc_names = []
    if payload.newDocuments:
        for doc_data in payload.newDocuments:
            doc_name = doc_data.get("name") or doc_data.get("docName") or "Uploaded_Document.pdf"
            doc_type = doc_data.get("type") or doc_data.get("docType") or "clinical_notes"
            doc_url  = doc_data.get("url") or doc_data.get("fileUrl") or ""
            doc_size = doc_data.get("size") or "1.2 MB"
            doc_id   = str(uuid.uuid4())

            new_doc = Document(
                id=doc_id,
                authorization_id=req.id,
                name=doc_name,
                type=doc_type,
                url=doc_url,
                size=doc_size,
                uploaded_by=req.provider.name if req.provider else "Requesting Provider",
                uploaded_at=datetime.utcnow()
            )
            db.add(new_doc)
            added_doc_names.append(doc_name)

    # 2. Append additional notes if provided
    if payload.additionalNotes and payload.additionalNotes.strip():
        existing_notes = req.clinical_notes or ""
        timestamp_str = datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')
        new_notes_block = f"\n\n[RESUBMISSION NOTES - {timestamp_str}]:\n{payload.additionalNotes.strip()}"
        req.clinical_notes = (existing_notes + new_notes_block).strip()

    # 3. Update status back to Nurse Review Required so payer reviewers see it in queue
    req.status = "Nurse Review Required"

    # 4. Audit Log Entry
    audit = AuditLog(
        id=str(uuid.uuid4()),
        authorization_id=req.id,
        action="Missing Information Resubmitted",
        performed_by=req.provider.name if req.provider else "Provider",
        role="Provider",
        timestamp=datetime.utcnow(),
        details=f"Uploaded {len(added_doc_names)} missing document(s) ({', '.join(added_doc_names) or 'None'}). Request continued and returned to review queue.",
        new_value="Nurse Review Required",
        category="clinical"
    )
    db.add(audit)
    db.commit()
    db.refresh(req)

    # 5. Re-run validation pipeline (Kreuzberg OCR + Gemini NLP on new + old docs)
    vr = _run_pipeline(req, db)

    # 6. Re-evaluate updated case through the Rule Engine to check if missing criteria are now satisfied
    from api.routes.evaluation import _evaluate_and_store
    eval_result = _evaluate_and_store(req, db)

    return {
        "message": "Authorization request successfully updated with missing documentation and re-evaluated through rule engine.",
        "caseNumber": req.case_number,
        "requestId": req.id,
        "status": req.status,
        "ruleEvaluation": eval_result,
        "validationResult": _serialize(vr)
    }
