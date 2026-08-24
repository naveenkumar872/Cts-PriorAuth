"""
backend/core/privacy.py
-----------------------
Hybrid Privacy & PHI De-identification Layer for Prioris.

Uses:
1. Native Deterministic Anonymizer for structured payload demographics (Name, Member ID, DOB -> Age).
2. Microsoft Presidio Analyzer + Anonymizer + Regex Engine for unstructured clinical notes & documents.
"""

import re
import logging
from datetime import datetime, date
from typing import Any, Dict, Optional, List, Tuple

log = logging.getLogger(__name__)

# Lazy singleton for Microsoft Presidio
_PRESIDIO_LOADED = False
_analyzer = None
_anonymizer = None

def _get_presidio():
    global _PRESIDIO_LOADED, _analyzer, _anonymizer
    if not _PRESIDIO_LOADED:
        _PRESIDIO_LOADED = True
        try:
            from presidio_analyzer import AnalyzerEngine
            from presidio_anonymizer import AnonymizerEngine
            _analyzer = AnalyzerEngine()
            _anonymizer = AnonymizerEngine()
            log.info("Microsoft Presidio Analyzer & Anonymizer initialized successfully.")
        except Exception as e:
            log.warning("Microsoft Presidio initialization skipped/fallback (%s). Using Native PHI Engine.", e)
            _analyzer = None
            _anonymizer = None
    return _analyzer, _anonymizer


# ── Common PHI Regex Patterns for Native Guardrails ───────────────────────────
SSN_RE     = re.compile(r'\b\d{3}-\d{2}-\d{4}\b')
PHONE_RE   = re.compile(r'\b(?:\+?1[-. ]?)?\(?\d{3}\)?[-. ]?\d{3}[-. ]?\d{4}\b')
EMAIL_RE   = re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b')
MRN_RE     = re.compile(r'\b(?:MRN|Pt ID|Patient ID)[\s#:]*([A-Z0-9-]{5,20})\b', re.IGNORECASE)
DATE_RE    = re.compile(r'\b(0?[1-9]|1[0-2])[\/-](0?[1-9]|[12]\d|3[01])[\/-](19|20)\d{2}\b')


def calculate_age_from_dob(dob_str: Optional[str]) -> Optional[str]:
    """Convert exact birthdate to safe age string (e.g. '54 years old') to preserve medical context."""
    if not dob_str:
        return None
    for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%d-%m-%Y"):
        try:
            dt = datetime.strptime(str(dob_str).split("T")[0], fmt).date()
            today = date.today()
            age = today.year - dt.year - ((today.month, today.day) < (dt.month, dt.day))
            return f"{age} years old"
        except (ValueError, TypeError):
            pass
    return None


# ─────────────────────────────────────────────────────────────────────────────
# 1. Structured Data Anonymizer (Native, Deterministic, 0ms latency)
# ─────────────────────────────────────────────────────────────────────────────

def anonymize_patient_payload(patient_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Sanitizes structured patient demographics before sending to external LLMs.
    Strips direct identifiers (Name, Member ID, Group ID, Phone, Address).
    Converts exact DOB to Age in years.
    """
    if not isinstance(patient_data, dict):
        return {}

    anon = dict(patient_data)
    raw_dob = anon.get("dob")
    age_str = calculate_age_from_dob(raw_dob)

    anon["name"]         = "[PATIENT_NAME_REDACTED]"
    anon["memberId"]     = "[MEMBER_ID_REDACTED]"
    anon["member_id"]    = "[MEMBER_ID_REDACTED]"
    anon["groupId"]      = "[GROUP_ID_REDACTED]"
    anon["group_id"]     = "[GROUP_ID_REDACTED]"
    anon["phone"]        = "[PHONE_REDACTED]"
    anon["address"]      = "[ADDRESS_REDACTED]"
    anon["dob"]          = age_str if age_str else "[DOB_REDACTED]"
    anon["age"]          = age_str if age_str else "Unknown age"

    return anon


# ─────────────────────────────────────────────────────────────────────────────
# 2. Unstructured Text Anonymizer (Microsoft Presidio + Context Regex)
# ─────────────────────────────────────────────────────────────────────────────

def anonymize_text(
    text: str,
    patient_name: str = "",
    member_id: str = "",
    dob_str: str = ""
) -> str:
    """
    De-identifies unstructured text (clinical notes, document OCR, Q&A queries).
    Combines:
    1. Direct dynamic string replacements for known Patient Name, Member ID, DOB.
    2. Native Regex fallback for pattern-based PHI (SSN, Phone, Email, MRN).
    3. Microsoft Presidio Analyzer for unknown PII entities when available.
    """
    if not text or not text.strip():
        return ""

    sanitized = text

    # Step A: Context-Aware Dynamic Replacements for Known Patient Data
    if patient_name and patient_name.strip():
        name_parts = patient_name.strip().split()
        sanitized = re.sub(re.escape(patient_name.strip()), "[PATIENT_NAME]", sanitized, flags=re.IGNORECASE)
        for part in name_parts:
            if len(part) > 2 and part.lower() not in ("doctor", "dr.", "md", "mr.", "mrs.", "ms."):
                sanitized = re.sub(r'\b' + re.escape(part) + r'\b', "[PATIENT_NAME]", sanitized, flags=re.IGNORECASE)

    if member_id and member_id.strip():
        sanitized = re.sub(re.escape(member_id.strip()), "[MEMBER_ID]", sanitized, flags=re.IGNORECASE)

    if dob_str and dob_str.strip():
        sanitized = re.sub(re.escape(dob_str.strip()), "[DOB_REDACTED]", sanitized)

    # Step B: Native Regex Clean-up Guardrails
    sanitized = SSN_RE.sub("[SSN_REDACTED]", sanitized)
    sanitized = PHONE_RE.sub("[PHONE_REDACTED]", sanitized)
    sanitized = EMAIL_RE.sub("[EMAIL_REDACTED]", sanitized)
    sanitized = MRN_RE.sub("[MRN_REDACTED]", sanitized)

    # Step C: Microsoft Presidio Anonymization for Unstructured Document Text (if ready)
    try:
        analyzer, anonymizer = _get_presidio()
        if analyzer and anonymizer:
            results = analyzer.analyze(
                text=sanitized,
                entities=["PERSON", "PHONE_NUMBER", "EMAIL_ADDRESS", "US_SSN", "LOCATION", "DATE_TIME"],
                language="en"
            )
            if results:
                anonymized_result = anonymizer.anonymize(
                    text=sanitized,
                    analyzer_results=results
                )
                sanitized = anonymized_result.text
    except Exception as err:
        log.warning("Presidio anonymization warning: %s.", err)

    return sanitized


# ─────────────────────────────────────────────────────────────────────────────
# 3. Tokenization & Local Re-identification (Zero-PHI External LLM Protocol)
# ─────────────────────────────────────────────────────────────────────────────

def mask_text_with_tokens(text: str) -> Tuple[str, Dict[str, str]]:
    """
    Scrubs PHI from document text by replacing sensitive names, IDs, DOBs, SSNs, and phone numbers
    with deterministic token placeholders (e.g. [TOKEN_PATIENT_NAME], [TOKEN_PATIENT_ID]).
    Returns both the masked text (safe for external LLM API) and a local in-memory token map.
    """
    if not text or not text.strip():
        return "", {}

    token_map: Dict[str, str] = {}
    masked_text = text

    # Patient Name
    m_name = re.search(r'Patient Name:\s*([^\n\r,]+)', text, re.IGNORECASE)
    if m_name:
        real_name = m_name.group(1).strip()
        if len(real_name) > 1 and real_name != "[PATIENT_NAME_REDACTED]":
            token = "[TOKEN_PATIENT_NAME]"
            token_map[token] = real_name
            masked_text = re.sub(re.escape(real_name), token, masked_text)

    # Patient ID
    m_id = re.search(r'Patient ID:\s*([^\n\r,\s]+)', text, re.IGNORECASE)
    if m_id:
        real_id = m_id.group(1).strip()
        token = "[TOKEN_PATIENT_ID]"
        token_map[token] = real_id
        masked_text = re.sub(re.escape(real_id), token, masked_text)

    # Member ID
    m_mem = re.search(r'Member ID:\s*([^\n\r,\s]+)', text, re.IGNORECASE)
    if m_mem:
        real_mem = m_mem.group(1).strip()
        token = "[TOKEN_MEMBER_ID]"
        token_map[token] = real_mem
        masked_text = re.sub(re.escape(real_mem), token, masked_text)

    # Date of Birth
    m_dob = re.search(r'Date of Birth:\s*([^\n\r,\s()]+)', text, re.IGNORECASE) or re.search(r'DOB:\s*([^\n\r,\s()]+)', text, re.IGNORECASE)
    if m_dob:
        real_dob = m_dob.group(1).strip()
        token = "[TOKEN_PATIENT_DOB]"
        token_map[token] = real_dob
        masked_text = re.sub(re.escape(real_dob), token, masked_text)

    # General Regex Redactions for extraneous PII
    masked_text = SSN_RE.sub("[SSN_REDACTED]", masked_text)
    masked_text = PHONE_RE.sub("[PHONE_REDACTED]", masked_text)
    masked_text = EMAIL_RE.sub("[EMAIL_REDACTED]", masked_text)
    masked_text = MRN_RE.sub("[MRN_REDACTED]", masked_text)

    return masked_text, token_map


def unmask_data_with_tokens(data: Any, token_map: Dict[str, str]) -> Any:
    """
    Recursively replaces token placeholders back to real PHI values
    LOCALLY on the secure backend before returning data to the provider frontend form.
    """
    if not token_map or not data:
        return data

    if isinstance(data, str):
        result = data
        for token, real_val in token_map.items():
            if token in result:
                result = result.replace(token, real_val)
        return result
    elif isinstance(data, dict):
        return {k: unmask_data_with_tokens(v, token_map) for k, v in data.items()}
    elif isinstance(data, list):
        return [unmask_data_with_tokens(item, token_map) for item in data]
    return data
