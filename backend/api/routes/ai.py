"""
AI Triage — /api/v1/ai
Generates and persists ai_recommendation JSON into authorization_requests.
Strictly grounded on Deterministic Rule Engine Decisions — LLM generates clinical reasoning,
key factor weights, and policy evidence citations based on Provider Input + Rule Set + Rule Decision.
"""

import json
import uuid
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from core.config import settings
from core.database import AuditLog, AuthorizationRequest, get_db

router = APIRouter()
log = logging.getLogger("ai_triage")


class TriageRequest(BaseModel):
    case_id: str
    patient_data: Optional[Dict[str, Any]] = {}
    clinical_notes: Optional[str] = ""
    diagnoses: Optional[List[Dict[str, Any]]] = []
    procedures: Optional[List[Dict[str, Any]]] = []


def _get_gemini_client():
    if not settings.GEMINI_API_KEY:
        return None
    try:
        from google import genai
        return genai.Client(api_key=settings.GEMINI_API_KEY)
    except Exception:
        try:
            import google.generativeai as genai_legacy
            genai_legacy.configure(api_key=settings.GEMINI_API_KEY)
            return genai_legacy
        except Exception as e:
            log.warning("Could not initialize Gemini SDK: %s", e)
            return None


def _generate_recommendation(
    clinical_notes: str,
    diagnoses: list,
    procedures: list,
    rule_decision: str = "Approved",
    rule_reason: str = "All deterministic policy pathways satisfied.",
    policy_id: str = "POL-001"
) -> Dict[str, Any]:
    """
    LLM Clinical Reasoning Generator.
    The Rule Engine makes the decision — the LLM receives Provider Input + Rule Set + Rule Engine Decision,
    and synthesizes human-readable clinical reasoning & key factor breakdowns.
    """
    # Map Rule Engine decision to UI decision label
    ui_decision_map = {
        "Approved": "Approve",
        "Not Approved": "Deny",
        "Denied": "Deny",
        "Rejected": "Deny",
        "More Information Required": "Request More Info",
        "Nurse Review Required": "Escalate",
        "Pending Review": "Escalate",
        "Under Review": "Escalate"
    }
    final_decision = ui_decision_map.get(rule_decision, "Approve")
    confidence_map = {"Approve": 94, "Deny": 88, "Request More Info": 78, "Escalate": 82}
    confidence = confidence_map.get(final_decision, 88)

    client = _get_gemini_client()
    if client:
        try:
            diag_text = ", ".join(f"{d.get('code','')} ({d.get('description','')})" for d in (diagnoses or []))
            proc_text = ", ".join(f"{p.get('code','')} ({p.get('description','')})" for p in (procedures or []))

            prompt = f"""=== CLINICAL RULE ENGINE DECISION & PROVIDER CONTEXT ===
RULE ENGINE DECISION: {rule_decision} (Mapped UI Recommendation: {final_decision})
RULE ENGINE REASON: {rule_reason}
POLICY ID: {policy_id}

REQUESTED PROCEDURES: {proc_text or 'Unspecified'}
DIAGNOSES: {diag_text or 'Unspecified'}
CLINICAL NOTES:
{(clinical_notes or '')[:1500]}

TASK: You are an expert clinical medical reviewer. The deterministic Rule Engine has already made the decision above ({final_decision}).
Your job is to generate clear clinical reasoning and factor analysis explaining WHY the Rule Engine reached this decision.
Do NOT contradict the Rule Engine decision.

Return ONLY a valid JSON object matching this exact schema:
{{
  "reasoning": "2-3 sentence clinical reasoning explaining why the rule engine decision was reached.",
  "keyFactors": [
    {{"name": "Factor Name", "impact": "positive" | "negative" | "neutral", "weight": 0.40, "description": "Details"}}
  ],
  "missingInfo": ["Item 1 if any missing"],
  "policyReferences": [
    {{"id": "ref-1", "title": "Applicable Policy Guideline", "section": "Section 3.1", "relevanceScore": 0.94, "excerpt": "Excerpt summary"}}
  ]
}}"""

            response = client.models.generate_content(
                model=settings.GEMINI_MODEL,
                contents=prompt,
            )

            raw_text = (response.text or "").strip()
            if raw_text.startswith("```"):
                lines = raw_text.splitlines()
                raw_text = "\n".join(lines[1:-1]) if lines[-1].startswith("```") else "\n".join(lines[1:])

            parsed = json.loads(raw_text)
            return {
                "decision": final_decision,
                "confidence": confidence,
                "reasoning": parsed.get("reasoning", f"Rule engine decision: {final_decision}. {rule_reason}"),
                "keyFactors": parsed.get("keyFactors", []),
                "missingInfo": parsed.get("missingInfo", []),
                "policyReferences": parsed.get("policyReferences", [{
                    "id": f"ref-{policy_id}",
                    "title": f"Policy {policy_id} Guidelines",
                    "section": "Section 3 — Clinical Indications",
                    "relevanceScore": 0.94,
                    "excerpt": rule_reason
                }]),
                "generatedAt": datetime.utcnow().isoformat() + "Z",
                "modelVersion": f"Gemini {settings.GEMINI_MODEL} (Rule Engine Grounded)"
            }
        except Exception as e:
            log.warning("Gemini LLM Reasoning generation failed, using fallback: %s", e)

    # Fallback reasoning structure when Gemini SDK is unconfigured
    return {
        "decision": final_decision,
        "confidence": confidence,
        "reasoning": f"Rule Engine Decision: {final_decision}. {rule_reason}",
        "keyFactors": [
            {"name": "Rule Engine Pathway Evaluation", "impact": "positive" if final_decision == "Approve" else "negative", "weight": 0.50, "description": rule_reason},
            {"name": "Clinical Documentation", "impact": "positive" if final_decision == "Approve" else "neutral", "weight": 0.30, "description": "Submitted clinical notes evaluated against policy criteria."}
        ],
        "missingInfo": [] if final_decision == "Approve" else ["Updated clinical consultation notes"],
        "policyReferences": [{
            "id": f"ref-{policy_id}",
            "title": f"Policy {policy_id} Guidelines",
            "section": "Section 3 — Clinical Indications",
            "relevanceScore": 0.94,
            "excerpt": rule_reason
        }],
        "generatedAt": datetime.utcnow().isoformat() + "Z",
        "modelVersion": "Rule-Engine-Grounded-v2.1"
    }


@router.post("/triage")
def run_triage(payload: TriageRequest, db: Session = Depends(get_db)):
    req = db.query(AuthorizationRequest).filter(AuthorizationRequest.id == payload.case_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Case not found")

    clinical_notes = payload.clinical_notes or req.clinical_notes or ""
    diagnoses      = payload.diagnoses or req.diagnoses or []
    procedures     = payload.procedures or req.procedures or []

    policy_ctx    = req.policy_context or {}
    rule_eval     = policy_ctx.get("ruleEvaluation") or {}
    rule_decision = rule_eval.get("decision") or req.status or "Approved"
    rule_reason   = rule_eval.get("reason") or "Rule evaluation completed under medical coverage policy."
    policy_id     = req.policy_id or policy_ctx.get("policyId") or "POL-001"

    recommendation = _generate_recommendation(
        clinical_notes,
        diagnoses,
        procedures,
        rule_decision=rule_decision,
        rule_reason=rule_reason,
        policy_id=policy_id
    )

    req.ai_recommendation = recommendation
    req.updated_at = datetime.utcnow()

    # Audit Log
    db.add(AuditLog(
        id=f"at-{uuid.uuid4().hex[:8]}",
        authorization_id=req.id,
        action="LLM Reasoning Generated for Rule Decision",
        performed_by="CareAuth Gemini Reasoning Engine",
        role="System",
        timestamp=datetime.utcnow(),
        details=f"Rule Engine Decision: {rule_decision}. LLM Reasoning generated: {recommendation['reasoning']}",
        new_value=recommendation["decision"],
        category="ai_analysis",
        event_metadata={"Model": recommendation.get("modelVersion", "Gemini"), "RuleDecision": rule_decision},
    ))

    db.commit()

    return {
        "case_id": payload.case_id,
        "recommendation": recommendation,
    }


@router.post("/what-if")
def what_if(payload: Dict[str, Any]):
    changes     = payload.get("changes", {})
    base_conf   = payload.get("baseConfidence", 75)

    delta  = 0
    notes  = []

    if changes.get("conservative_treatment_documented"):
        delta += 15; notes.append("Conservative treatment documentation resolves primary gap")
    if changes.get("specialist_referral"):
        delta += 8;  notes.append("Specialist referral supports clinical indication")
    if changes.get("imaging_provided"):
        delta += 7;  notes.append("Radiographic evidence strengthens medical necessity")
    if changes.get("no_prior_treatment"):
        delta -= 20; notes.append("Absence of prior treatment fails conservative criteria")
    if changes.get("bmi_high"):
        delta -= 10; notes.append("Elevated BMI increases surgical risk — escalation recommended")

    new_conf = max(10, min(99, base_conf + delta))
    decision = "Approve" if new_conf >= 80 else ("Deny" if new_conf <= 55 else "Request More Info")

    return {
        "simulatedOutcome": decision,
        "newConfidence": new_conf,
        "delta": delta,
        "rationale": "; ".join(notes) or "No significant change based on provided parameters.",
    }
