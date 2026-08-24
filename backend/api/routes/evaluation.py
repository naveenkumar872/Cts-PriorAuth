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


def _flatten_facts(structured: Dict[str, Any], req: Optional[Any] = None) -> Tuple[Dict[str, Any], str]:
    clinical = structured.get("clinicalData", {}) if isinstance(structured, dict) else {}
    facts: Dict[str, Any] = {}
    for section in (structured, structured.get("paRequest", {}), structured.get("patient", {}),
                    structured.get("provider", {}), clinical, structured.get("documents", {}),
                    structured.get("validationSummary", {})):
        if isinstance(section, dict):
            facts.update(section)
    policy_facts = clinical.get("policyFacts", {})
    if isinstance(policy_facts, dict):
        facts.update(policy_facts)

    diagnoses = clinical.get("diagnoses", []) or structured.get("diagnoses", [])
    procedures = clinical.get("procedures", []) or structured.get("procedures", [])

    if req is not None:
        if not diagnoses and getattr(req, "diagnoses", None):
            diagnoses = req.diagnoses or []
        if not procedures and getattr(req, "procedures", None):
            procedures = req.procedures or []
        if getattr(req, "clinical_notes", None):
            facts["clinicalNotes"] = req.clinical_notes
        if getattr(req, "patient", None):
            p = req.patient
            facts["patientName"] = getattr(p, "name", "")
            facts["dob"] = str(getattr(p, "dob", ""))
            facts["memberType"] = getattr(p, "plan", "") or getattr(p, "payer", "")
            facts["payer"] = getattr(p, "payer", "")

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
    if structured.get("clinicalNotes"):
        text_parts.append(str(structured.get("clinicalNotes")))
    if req is not None and getattr(req, "clinical_notes", None):
        text_parts.append(str(req.clinical_notes))

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


STOP_WORDS = {
    "for", "and", "the", "with", "from", "that", "pain", "back", "patient", "clinical",
    "after", "over", "month", "weeks", "years", "year", "week", "days", "day", "normal",
    "examination", "history", "presenting", "mild", "without", "having", "been", "reported",
    "findings", "two", "one", "criteria", "met", "signs", "symptoms", "study", "eval"
}

def _contains(value: Any, expected: Any) -> bool:
    actual = _normalise(value)
    wanted = _normalise(expected)
    if not wanted:
        return False

    # Clinical negation detection (e.g. "negative for progressive", "no fever", "without trauma")
    w_words_clean = [w for w in wanted.split() if len(w) > 3 and w not in STOP_WORDS]
    if w_words_clean:
        for w in w_words_clean:
            pattern = r'\b(?:no|not|negative for|without|denies|absent)\b[^.\n]*?\b' + re.escape(w) + r'\b'
            if re.search(pattern, actual):
                return False

    if actual == wanted or wanted in actual:
        return True

    # Fuzzy word overlap match for long descriptive criteria phrases (> 2 words)
    w_words = [w for w in wanted.split() if len(w) > 2 and w not in STOP_WORDS]
    if len(w_words) >= 3:
        matched_words = [w for w in w_words if w in actual]
        if len(matched_words) / len(w_words) >= 0.5:
            return True
    return False


GENERIC_WORDS = {"yes", "no", "true", "false", "1", "0", "y", "n", "t", "f", "none", "null", "undefined", "na", "n/a"}

def _is_generic_value(v: Any) -> bool:
    if isinstance(v, bool):
        return True
    s = _normalise(v)
    return s in GENERIC_WORDS or len(s) <= 3


def _condition(condition: Dict[str, Any], facts: Dict[str, Any], corpus: str) -> Tuple[bool, bool, str]:
    """Return (passed, unknown, explanation). Unknown is intentionally conservative."""
    operator = _normalise(condition.get("operator")).upper()
    field = condition.get("field", "unknown")
    value = condition.get("value")
    if operator in {"ALL", "ANY"}:
        children = value if isinstance(value, list) and all(isinstance(v, dict) for v in value) else condition.get("sub_conditions", [])
        if not children:
            if isinstance(value, list) and all(isinstance(v, str) for v in value):
                results = [_condition({"field": field, "operator": "EQ", "value": v}, facts, corpus) for v in value]
            else:
                return False, True, f"{field}: criteria missing"
        else:
            results = [_condition(child, facts, corpus) for child in children]
        passed = bool(results) and (all(r[0] for r in results) if operator == "ALL" else any(r[0] for r in results))
        unknown = any(r[1] for r in results) and not passed
        return passed, unknown, f"{field}: {operator.lower()} condition"

    actual = _field_value(field, facts)
    if actual is None and operator in {"EQ", "EQUAL", "EQUAL_TO", "EQUALS", "==", "=", "IN", "ONE_OF", "NOT_IN", "MEETS_ONE_OF"}:
        if operator == "NOT_IN":
            blocked = value if isinstance(value, list) else [value]
            return (False, True, f"{field}: could not verify absence of {blocked}")
        if _is_generic_value(value):
            found = False
        elif isinstance(value, list):
            found = any(_contains(corpus, v) for v in value if not _is_generic_value(v))
        else:
            found = _contains(corpus, value)
        return (found, not found, f"{field}: {'evidence found' if found else 'evidence missing'}")

    if operator in {"ALL", "EVERY"}:
        if isinstance(value, list):
            passed = all(_contains(corpus, str(v)) for v in value)
        else:
            passed = _contains(corpus, str(value))
        return (passed, not passed, f"{field}: {'evidence verified' if passed else 'clinical evidence missing'}")
    elif operator in {"ANY", "SOME"}:
        if isinstance(value, list):
            passed = any(_contains(corpus, str(v)) for v in value)
        else:
            passed = _contains(corpus, str(value))
        return (passed, not passed, f"{field}: {'evidence verified' if passed else 'clinical evidence missing'}")
    elif operator in {"EQ", "EQUAL", "EQUAL_TO", "EQUALS", "==", "="}:
        passed = _contains(actual or corpus, str(value))
    elif operator in {"IN", "ONE_OF", "IN_LIST"}:
        passed = any(_contains(actual or corpus, str(v)) for v in (value if isinstance(value, list) else [value]))
    elif operator == "NOT_IN":
        passed = not any(_contains(actual or corpus, str(v)) for v in (value if isinstance(value, list) else [value]))
    elif operator in {">=", "<=", ">", "<"}:
        try:
            left, right = float(actual), float(value)
            passed = {">=": left >= right, "<=": left <= right, ">": left > right, "<": left < right}[operator]
        except (TypeError, ValueError):
            found_nums = [float(n) for n in re.findall(r'\b\d+(?:\.\d+)?\b', corpus)]
            if found_nums:
                passed = any({">=": n >= float(value), "<=": n <= float(value), ">": n > float(value), "<": n < float(value)}[operator] for n in found_nums)
            else:
                return False, True, f"{field}: numeric evidence missing"
    elif operator == "MEETS_ONE_OF":
        branches = condition.get("sub_conditions", [])
        results = [_condition(branch, facts, corpus) for branch in branches]
        passed = any(r[0] for r in results)
        return passed, any(r[1] for r in results) and not passed, f"{field}: credential branch"
    else:
        # Fallback keyword match in clinical corpus
        passed = _contains(corpus, str(value or field))
        if passed:
            return True, False, f"{field}: evidence verified in clinical notes"
        return False, True, f"{field}: clinical evidence missing"
    return passed, not passed, f"{field}: {'passed' if passed else 'clinical evidence missing'}"



def evaluate_ruleset(structured: Dict[str, Any], context: Dict[str, Any], req: Optional[Any] = None) -> Dict[str, Any]:
    facts, corpus = _flatten_facts(structured, req=req)
    rule_sets = context.get("applicableRuleSets", [])
    if not context.get("matched") or not rule_sets:
        return {"decision": "More Information Required", "reason": "No applicable policy ruleset was mapped.", "missingInformation": ["Valid policy ID or service code"], "pathways": [], "evaluatedAt": None}

    # Extract requested CPT / procedure code
    requested_cpts = []
    procs = structured.get("procedures", [])
    if not procs and req is not None and getattr(req, "procedures", None):
        procs = req.procedures or []
    for p in procs:
        if isinstance(p, dict) and p.get("code"):
            requested_cpts.append(str(p["code"]).strip())

    primary_cpt = requested_cpts[0] if requested_cpts else ""

    exclusions: List[str] = []
    for rule_set in rule_sets:
        for exclusion in rule_set.get("exclusions", []):
            description = exclusion.get("description", "") if isinstance(exclusion, dict) else str(exclusion)
            exclusion_id = _normalise(exclusion.get("exclusion_id", "")) if isinstance(exclusion, dict) else ""
            id_phrase = exclusion_id.replace("_", " ")
            if (id_phrase and id_phrase in corpus) or (_normalise(description) and _normalise(description) in corpus):
                exclusions.append(exclusion.get("exclusion_id", description) if isinstance(exclusion, dict) else description)

    pathway_results = []
    missing: List[str] = []
    target_pathway_approved = False
    target_pathway_found = False
    any_approved = False

    for rs_idx, rule_set in enumerate(rule_sets):
        rs_codes = []
        mc = rule_set.get("match_criteria", {})
        sc = mc.get("service_code", {})
        if isinstance(sc, dict):
            v = sc.get("value", [])
            rs_codes = v if isinstance(v, list) else [v]

        for p_idx, pathway in enumerate(rule_set.get("pathways", [])):
            raw_conditions = pathway.get("conditions", [])
            conditions = [c for c in raw_conditions if _normalise(c.get("field", "")) != "member_type"]
            results = [_condition(c, facts, corpus) for c in conditions]

            # Calculate condition counts
            passed_count = sum(1 for r in results if r[0])
            failed_count = sum(1 for r in results if not r[0] and not r[1])
            unknown_count = sum(1 for r in results if r[1])

            logic = _normalise(pathway.get("logic", "ALL"))
            if logic == "any":
                passed = passed_count > 0
            else:
                passed = passed_count > 0 and unknown_count == 0 and failed_count == 0

            unknown = not passed and unknown_count > 0

            # Determine if this pathway is the primary target for requested CPT
            pathway_id = pathway.get("pathway_id", "")
            is_target = False
            if primary_cpt:
                if any(primary_cpt in str(c) for c in rs_codes):
                    is_target = True
                elif primary_cpt in pathway_id:
                    is_target = True

            # Default first pathway as target if no explicit CPT isolation
            if rs_idx == 0 and p_idx == 0 and not target_pathway_found:
                is_target = True

            if is_target:
                target_pathway_found = True
                if passed:
                    target_pathway_approved = True

            if passed:
                any_approved = True
            if unknown and is_target:
                missing.extend(c.get("field", "policy requirement") for c, result in zip(conditions, results) if result[1])

            pathway_results.append({
                "pathwayId": pathway_id,
                "passed": passed,
                "unknown": unknown,
                "isTargetPathway": is_target,
                "requestedCpt": primary_cpt,
                "conditions": [r[2] for r in results]
            })

    missing = list(dict.fromkeys(missing))

    # Check missing required documents
    notes = (structured.get("clinicalNotes") or (getattr(req, "clinical_notes", None) if req else "") or "").strip()
    docs = structured.get("documents", []) or (getattr(req, "documents", None) if req else []) or []
    has_missing_docs = not notes and len(docs) == 0

    if exclusions:
        decision, reason = "Nurse Review Required", "A policy exclusion was identified in the submitted clinical evidence. Nurse review required."
    elif has_missing_docs:
        decision, reason = "More Information Required", "Required clinical notes or supporting documentation missing for requested procedure."
        missing.insert(0, "Clinical notes / supporting medical documentation")
    elif target_pathway_approved or any_approved:
        decision, reason = "Approved", f"Target policy pathway for requested procedure (CPT {primary_cpt or 'Code'}) was fully satisfied."
        missing = []
    elif structured.get("validationSummary", {}).get("readyForTriage") is False:
        decision, reason = "More Information Required", "Required clinical evidence could not be verified from the structured PA request."
    else:
        decision = "Nurse Review Required"
        if missing:
            missing_clean = [m.replace("_", " ").title() for m in missing[:3]]
            reason = f"Coverage criteria unverified for requested CPT {primary_cpt or 'procedure'}. Missing key clinical evidence: {', '.join(missing_clean)}."
        else:
            reason = f"Coverage criteria unverified for requested CPT {primary_cpt or 'procedure'}. Nurse review required."

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
    
    # If context is not mapped yet, map it via policy_id (or service code)
    if not context or not context.get("matched"):
        from api.routes.context import map_policy, MapPolicyRequest
        procs = req.procedures or []
        sc = procs[0].get("code", "") if procs else ""
        cs = procs[0].get("codingSystem", "CPT") if procs else "CPT"
        context = map_policy(MapPolicyRequest(
            policyId=req.policy_id or None,
            serviceCode=sc or None,
            codingSystem=cs or None,
            caseId=req.id
        ))

    structured = {}
    vr = db.query(ValidationResult).filter_by(authorization_id=req.id).first()
    if vr:
        structured = vr.step4_structured or {}
    result = evaluate_ruleset(structured, context, req=req)
    result["evaluatedAt"] = datetime.utcnow().isoformat() + "Z"

    # Synthesize rich dynamic AI reasoning & factor breakdown
    try:
        from api.routes.ai import _generate_recommendation
        llm_rec = _generate_recommendation(
            clinical_notes=req.clinical_notes or "",
            diagnoses=req.diagnoses or [],
            procedures=req.procedures or [],
            rule_decision=result.get("decision", "Nurse Review Required"),
            rule_reason=result.get("reason", ""),
            policy_id=req.policy_id or context.get("policyId", "")
        )
        if llm_rec and llm_rec.get("reasoning"):
            result["aiReasoning"] = llm_rec["reasoning"]
            result["keyFactors"] = llm_rec.get("keyFactors", [])
            result["missingInfo"] = llm_rec.get("missingInfo", [])
            result["policyReferences"] = llm_rec.get("policyReferences", [])
    except Exception:
        pass

    context["ruleEvaluation"] = result
    
    # System provides suggestions only — final decision is made by human reviewer
    if req.status not in ("Approved", "Denied"):
        if result.get("decision") == "Nurse Review Required":
            req.status = "Nurse Review Required"
        elif result.get("decision") == "More Information Required":
            req.status = "More Information Required"
        elif result.get("decision") == "Approved":
            req.status = "Pending Review"  # Rule Engine suggests Approved, but status awaits reviewer final decision

    req.policy_context = context   # reassign the new dict so SQLAlchemy marks column dirty
    req.updated_at = datetime.utcnow()

    # Store into dedicated rule_evaluations database table
    try:
        from core.database import RuleEvaluationRecord
        rec = db.query(RuleEvaluationRecord).filter_by(authorization_id=req.id).first()
        if not rec:
            rec = RuleEvaluationRecord(
                id=f"eval-{uuid.uuid4().hex[:12]}",
                authorization_id=req.id,
                case_number=req.case_number,
            )
            db.add(rec)

        rec.policy_id = req.policy_id or context.get("policyId")
        rec.decision = result.get("decision", "Nurse Review Required")
        rec.reason = result.get("reason", "")
        rec.ai_reasoning = result.get("aiReasoning", "")
        rec.missing_information = result.get("missingInformation", [])
        rec.exclusions = result.get("exclusions", [])
        rec.pathways = result.get("pathways", [])
        rec.key_factors = result.get("keyFactors", [])
        rec.policy_references = result.get("policyReferences", [])
        rec.ml_complexity = result.get("mlComplexity", {})
        rec.evaluated_at = datetime.utcnow()
    except Exception as exc:
        pass

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
        performed_by="Prioris Rule Engine + ML Classifier", 
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
    
    existing = (req.policy_context or {}).get("ruleEvaluation")
    if existing:
        return existing
    
    # Auto-trigger rule evaluation on demand and save to database
    return _evaluate_and_store(req, db)