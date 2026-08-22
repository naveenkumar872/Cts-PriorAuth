"""Deterministic rule-based evaluation for structured prior-authorization requests."""

import re
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from core.database import AuditLog, AuthorizationRequest, ValidationResult, get_db

router = APIRouter()

DECISIONS = ("Approved", "Nurse Review Required", "More Information Required")


def _normalise(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "").strip().lower())


def _flatten_facts(structured: Dict[str, Any]) -> Tuple[Dict[str, Any], str]:
    clinical = structured.get("clinicalData", {})
    facts: Dict[str, Any] = {}
    for section in (structured.get("paRequest", {}), structured.get("patient", {}),
                    structured.get("provider", {}), clinical, structured.get("documents", {}),
                    structured.get("validationSummary", {})):
        if isinstance(section, dict):
            facts.update(section)
    policy_facts = clinical.get("policyFacts", {})
    if isinstance(policy_facts, dict):
        facts.update(policy_facts)

    diagnoses = clinical.get("diagnoses", [])
    procedures = clinical.get("procedures", [])
    facts["diagnosis"] = " ".join(
        f"{d.get('code', '')} {d.get('description', '')}" for d in diagnoses if isinstance(d, dict)
    )
    facts["procedure"] = " ".join(
        f"{p.get('code', '')} {p.get('description', '')}" for p in procedures if isinstance(p, dict)
    )
    text_parts = [str(v) for v in facts.values() if isinstance(v, (str, int, float, bool))]
    text_parts += [str(v) for v in clinical.get("conservativeTxDetails", [])]
    text_parts += [str(v) for v in clinical.get("keyClinicialFindings", [])]
    text_parts += [str(v) for v in clinical.get("functionalLimitations", [])]
    for document in structured.get("extractedDocuments", []):
        if isinstance(document, dict):
            text_parts.append(str(document.get("extractedText", "")))
    return facts, _normalise(" ".join(text_parts))


def _field_value(field: str, facts: Dict[str, Any]) -> Any:
    aliases = {
        "member_type": ("memberType", "payer", "plan"),
        "provider_type": ("providerType", "specialty"),
        "diagnosis": ("diagnosis",),
        "clinical_notes": ("clinicalNotes",),
        "conservative_treatment_documented": ("conservativeTxDocumented",),
        "treatment_limit": ("quantity",),
    }
    for key in aliases.get(field, (field,)):
        if key in facts and facts[key] not in (None, "", [], {}):
            return facts[key]
    return None


def _contains(value: Any, expected: Any) -> bool:
    actual = _normalise(value)
    wanted = _normalise(expected)
    return bool(wanted) and (actual == wanted or wanted in actual)


def _condition(condition: Dict[str, Any], facts: Dict[str, Any], corpus: str) -> Tuple[bool, bool, str]:
    """Return (passed, unknown, explanation). Unknown is intentionally conservative."""
    operator = _normalise(condition.get("operator")).upper()
    field = condition.get("field", "unknown")
    value = condition.get("value")
    if operator in {"ALL", "ANY"}:
        children = value if isinstance(value, list) and all(isinstance(v, dict) for v in value) else condition.get("sub_conditions", [])
        results = [_condition(child, facts, corpus) for child in children]
        passed = all(r[0] for r in results) if operator == "ALL" else any(r[0] for r in results)
        unknown = any(r[1] for r in results) and not passed
        return passed, unknown, f"{field}: {operator.lower()} condition"

    actual = _field_value(field, facts)
    if actual is None and operator in {"EQ", "EQUAL", "IN", "ONE_OF", "NOT_IN", "MEETS_ONE_OF"}:
        if operator == "NOT_IN":
            blocked = value if isinstance(value, list) else [value]
            return (False, True, f"{field}: could not verify absence of {blocked}")
        if isinstance(value, list):
            found = any(_contains(corpus, v) for v in value)
        else:
            found = _contains(corpus, value)
        return (found, not found, f"{field}: {'evidence found' if found else 'evidence missing'}")

    if operator in {"EQ", "EQUAL", "EQUAL_TO", "EQUALS"}:
        passed = _contains(actual, value)
    elif operator in {"IN", "ONE_OF", "IN_LIST"}:
        passed = any(_contains(actual, v) for v in (value if isinstance(value, list) else [value]))
    elif operator == "NOT_IN":
        passed = not any(_contains(actual, v) for v in (value if isinstance(value, list) else [value]))
    elif operator in {">=", "<=", ">", "<"}:
        try:
            left, right = float(actual), float(value)
            passed = {">=": left >= right, "<=": left <= right, ">": left > right, "<": left < right}[operator]
        except (TypeError, ValueError):
            return False, True, f"{field}: numeric evidence missing"
    elif operator == "MEETS_ONE_OF":
        branches = condition.get("sub_conditions", [])
        results = [_condition(branch, facts, corpus) for branch in branches]
        passed = any(r[0] for r in results)
        return passed, any(r[1] for r in results) and not passed, f"{field}: credential branch"
    else:
        return False, True, f"{field}: unsupported operator {operator}"
    return passed, False, f"{field}: {'passed' if passed else 'failed'}"


def evaluate_ruleset(structured: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
    facts, corpus = _flatten_facts(structured)
    rule_sets = context.get("applicableRuleSets", [])
    if not context.get("matched") or not rule_sets:
        return {"decision": "More Information Required", "reason": "No applicable policy ruleset was mapped.", "missingInformation": ["Valid policy ID or service code"], "pathways": [], "evaluatedAt": None}

    exclusions: List[str] = []
    for rule_set in rule_sets:
        for exclusion in rule_set.get("exclusions", []):
            description = exclusion.get("description", "") if isinstance(exclusion, dict) else str(exclusion)
            exclusion_id = _normalise(exclusion.get("exclusion_id", "")) if isinstance(exclusion, dict) else ""
            id_phrase = exclusion_id.replace("_", " ")
            # A rejection requires explicit exclusion evidence. Shared clinical
            # words are not enough to establish that a policy exclusion applies.
            if (id_phrase and id_phrase in corpus) or (_normalise(description) and _normalise(description) in corpus):
                exclusions.append(exclusion.get("exclusion_id", description) if isinstance(exclusion, dict) else description)

    pathway_results = []
    missing: List[str] = []
    approved = False
    for rule_set in rule_sets:
        for pathway in rule_set.get("pathways", []):
            conditions = pathway.get("conditions", [])
            results = [_condition(c, facts, corpus) for c in conditions]
            passed = all(r[0] for r in results) if _normalise(pathway.get("logic", "ALL")) == "all" else any(r[0] for r in results)
            unknown = any(r[1] for r in results) and not passed
            if passed:
                approved = True
            if unknown:
                missing.extend(c.get("field", "policy requirement") for c, result in zip(conditions, results) if result[1])
            pathway_results.append({"pathwayId": pathway.get("pathway_id"), "passed": passed, "unknown": unknown, "conditions": [r[2] for r in results]})

    missing = list(dict.fromkeys(missing))
    if exclusions:
        decision, reason = "Nurse Review Required", "A policy exclusion was identified in the submitted clinical evidence. Nurse review required."
    elif approved:
        decision, reason = "Approved", "At least one applicable policy pathway was satisfied."
    elif structured.get("validationSummary", {}).get("readyForTriage") is False:
        decision, reason = "More Information Required", "Required policy evidence could not be verified from the structured PA request."
    else:
        decision, reason = "Nurse Review Required", "The request is complete but no automated coverage pathway was satisfied."

    result = {"decision": decision, "reason": reason, "missingInformation": missing, "exclusions": exclusions, "pathways": pathway_results, "evaluatedAt": None}

    # Integrate ML Model: When decision is 'Nurse Review Required', run ML model inference to predict complexity
    if decision == "Nurse Review Required":
        from core.ml_predictor import predict_nurse_review_complexity
        ml_prediction = predict_nurse_review_complexity(structured, result)
        result["mlComplexity"] = ml_prediction

    return result


def _evaluate_and_store(req: AuthorizationRequest, db: Session) -> Dict[str, Any]:
    from api.routes.validation import _load_req
    context = dict(req.policy_context or {})  # copy — forces SQLAlchemy to detect mutation
    structured = {}
    vr = db.query(ValidationResult).filter_by(authorization_id=req.id).first()
    if vr:
        structured = vr.step4_structured or {}
    result = evaluate_ruleset(structured, context)
    result["evaluatedAt"] = datetime.utcnow().isoformat() + "Z"
    context["ruleEvaluation"] = result
    
    # Also mirror decision & status onto AuthorizationRequest
    if result.get("decision") == "Nurse Review Required":
        req.status = "Nurse Review Required"
    elif result.get("decision") == "Approved":
        req.status = "Approved"
    elif result.get("decision") == "More Information Required":
        req.status = "More Information Required"

    req.policy_context = context   # reassign the new dict so SQLAlchemy marks column dirty
    req.updated_at = datetime.utcnow()

    # Log detailed audit entry including ML prediction details if triggered
    ml_info = ""
    if result.get("mlComplexity"):
        c_label = result["mlComplexity"].get("predictedComplexity", "").upper()
        c_rank = result["mlComplexity"].get("complexityRank", 2)
        c_conf = result["mlComplexity"].get("confidenceScore", 0)
        ml_info = f" ML Model predicted '{c_label}' complexity (Rank {c_rank}, Confidence {c_conf}%). Queue Order: Rank {c_rank}."

    db.add(AuditLog(
        id=f"at-rule-{uuid.uuid4().hex[:12]}", 
        authorization_id=req.id, 
        action="Rule-Based Evaluation Completed", 
        performed_by="CareAuth Rule Engine + ML Classifier", 
        role="System", 
        details=f"Decision: {result['decision']}. {result['reason']}{ml_info}", 
        new_value=result["decision"], 
        category="rule_evaluation", 
        event_metadata={"decision": result["decision"], "missingInformation": result.get("missingInformation", []), "mlComplexity": result.get("mlComplexity")}
    ))
    db.commit()
    return result


@router.post("/{case_id}/run")
def run_evaluation(case_id: str, db: Session = Depends(get_db)):
    req = db.query(AuthorizationRequest).filter(AuthorizationRequest.id == case_id).first() or db.query(AuthorizationRequest).filter(AuthorizationRequest.case_number == case_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Authorization request not found")
    return _evaluate_and_store(req, db)


@router.get("/{case_id}")
def get_evaluation(case_id: str, db: Session = Depends(get_db)):
    req = db.query(AuthorizationRequest).filter(AuthorizationRequest.id == case_id).first() or db.query(AuthorizationRequest).filter(AuthorizationRequest.case_number == case_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Authorization request not found")
    return (req.policy_context or {}).get("ruleEvaluation") or {"status": "pending", "message": "Rule evaluation has not completed yet."}