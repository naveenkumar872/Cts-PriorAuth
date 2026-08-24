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

    if actual == wanted:
        return True

    # If wanted itself explicitly specifies a negative condition (e.g. "no evidence", "absent", "no fever"),
    # do not run clinical negation disqualification against wanted's own terms.
    wanted_has_negation = bool(re.search(r'\b(?:no|not|negative|without|denies|absent|none)\b', wanted))

    if not wanted_has_negation:
        # Clinical negation detection (e.g. "negative for progressive", "no fever", "without trauma")
        w_words_clean = [w for w in wanted.split() if len(w) > 3 and w not in STOP_WORDS]
        if w_words_clean:
            for w in w_words_clean:
                pattern = r'\b(?:no|not|negative for|without|denies|absent)\b[^.\n]*?\b' + re.escape(w) + r'\b'
                if re.search(pattern, actual):
                    return False

    if wanted in actual:
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

    # Special handling for BETWEEN operator / age evaluation
    if operator == "BETWEEN" or field == "age":
        user_age = None
        actual_val = _field_value(field, facts)
        if actual_val is not None:
            try:
                user_age = float(actual_val)
            except (TypeError, ValueError):
                pass
        if user_age is None and facts.get("dob"):
            try:
                dob_str = str(facts.get("dob"))
                dob_date = datetime.strptime(dob_str[:10], "%Y-%m-%d")
                user_age = float((datetime.now() - dob_date).days // 365)
            except Exception:
                pass
        if user_age is None:
            age_match = re.search(r'\b(\d{1,3})\s*(?:years?\s*old|-year-old|yo\b)', corpus) or re.search(r'\bage[:\s]+(\d{1,3})\b', corpus)
            if age_match:
                user_age = float(age_match.group(1))

        if user_age is not None and isinstance(value, list) and len(value) == 2:
            min_v, max_v = float(value[0]), float(value[1])
            passed = min_v <= user_age <= max_v
            return (passed, False, f"age: {int(user_age)} years old {'passed' if passed else 'outside range'}")

    # Special handling for boolean candidate fields
    if field == "kidney_transplant_candidate" or (isinstance(value, bool) and value is True):
        terms = ["candidate", "transplant candidate", "transplant evaluation", "referred for", "transplantation", "kidney transplant"]
        actual_candidate = _field_value(field, facts)
        passed = any(t in corpus for t in terms) or bool(actual_candidate)
        return (passed, not passed, f"{field}: {'passed' if passed else 'missing'}")

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
        has_explicit_val = False
        try:
            left, right = float(actual), float(value)
            passed = {">=": left >= right, "<=": left <= right, ">": left > right, "<": left < right}[operator]
            has_explicit_val = True
        except (TypeError, ValueError):
            found_nums = [float(n) for n in re.findall(r'\b\d+(?:\.\d+)?\b', corpus)]
            if found_nums:
                passed = any({">=": n >= float(value), "<=": n <= float(value), ">": n > float(value), "<": n < float(value)}[operator] for n in found_nums)
                has_explicit_val = True
            else:
                return False, True, f"{field}: numeric evidence missing"
        return (passed, False if has_explicit_val else not passed, f"{field}: {'passed' if passed else 'out of range / non-compliant'}")
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
    
    is_unknown = actual is None and not passed
    return passed, is_unknown, f"{field}: {'passed' if passed else ('clinical evidence missing' if is_unknown else 'out of range / failed')}"



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
            if isinstance(exclusion, dict):
                cond_text = exclusion.get("condition") or exclusion.get("description") or exclusion.get("exclusion_id") or ""
                excl_name = exclusion.get("condition") or exclusion.get("description") or exclusion.get("exclusion_id") or ""
            else:
                cond_text = str(exclusion)
                excl_name = str(exclusion)
            
            norm_cond = _normalise(cond_text)
            if norm_cond and norm_cond in corpus:
                exclusions.append(excl_name)

    pathway_results = []
    missing: List[str] = []
    target_failures: List[str] = []
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
                for c, result in zip(conditions, results):
                    field_name = c.get("field", "policy requirement")
                    if result[1]:  # unknown / missing evidence
                        missing.append(field_name)
                    elif not result[0]:  # failed / out of bounds
                        target_failures.append(field_name)

            if passed:
                any_approved = True

            pathway_results.append({
                "pathwayId": pathway_id,
                "passed": passed,
                "unknown": unknown,
                "isTargetPathway": is_target,
                "requestedCpt": primary_cpt,
                "conditions": [r[2] for r in results]
            })

    missing = list(dict.fromkeys(missing))
    target_failures = list(dict.fromkeys(target_failures))

    # Check missing required documents
    notes = (structured.get("clinicalNotes") or (getattr(req, "clinical_notes", None) if req else "") or "").strip()
    docs = structured.get("documents", []) or (getattr(req, "documents", None) if req else []) or []
    has_missing_docs = not notes and len(docs) == 0

    if exclusions:
        decision = "Nurse Review Required"
        reason = f"A policy exclusion was identified in the submitted clinical evidence ({', '.join(exclusions)}). Clinical nurse review required."
        missing = []
    elif target_pathway_approved or any_approved:
        decision = "Approved"
        reason = f"Target policy pathway for requested procedure (CPT {primary_cpt or 'Code'}) was fully satisfied."
        missing = []
    elif target_failures:
        decision = "Nurse Review Required"
        fail_clean = [f.replace("_", " ").title() for f in target_failures[:3]]
        reason = f"Submitted clinical data contains criteria non-compliance or out-of-bounds findings ({', '.join(fail_clean)}). Clinical nurse review required."
    elif has_missing_docs or missing or structured.get("validationSummary", {}).get("readyForTriage") is False:
        decision = "More Information Required"
        if has_missing_docs and "Clinical notes / supporting medical documentation" not in missing:
            missing.insert(0, "Clinical notes / supporting medical documentation")
        missing_clean = [m.replace("_", " ").title() for m in missing[:3]]
        reason = f"Coverage criteria unverified for requested CPT {primary_cpt or 'procedure'}. Required policy information missing: {', '.join(missing_clean)}."
    else:
        decision = "Nurse Review Required"
        reason = f"Coverage criteria unverified for requested CPT {primary_cpt or 'procedure'}. Clinical nurse review required."

    result = {"decision": decision, "reason": reason, "missingInformation": missing, "exclusions": exclusions, "pathways": pathway_results, "evaluatedAt": None}

    # Integrate ML Model: When decision is 'Nurse Review Required', run ML model inference to predict complexity
    if decision == "Nurse Review Required":
        try:
            from core.ml_predictor import predict_nurse_review_complexity
            ml_prediction = predict_nurse_review_complexity(structured, result)
            result["mlComplexity"] = ml_prediction
        except Exception:
            pass

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
    
    # System provides recommendations only — final workflow status remains "Pending Review" until human reviewer submits a decision
    if not req.status or req.status not in ("Approved", "Not Approved", "Denied", "Rejected"):
        req.status = "Pending Review"

    req.policy_context = context   # reassign the new dict so SQLAlchemy marks column dirty
    req.updated_at = datetime.utcnow()

    # Store into dedicated rule_evaluations database table safely with JSON serialization
    try:
        from core.database import RuleEvaluationRecord
        import json
        
        missing_json = json.dumps(result.get("missingInformation", []))
        exclusions_json = json.dumps(result.get("exclusions", []))
        pathways_json = json.dumps(result.get("pathways", []))
        key_factors_json = json.dumps(result.get("keyFactors", []))
        policy_refs_json = json.dumps(result.get("policyReferences", []))
        ml_comp_json = json.dumps(result.get("mlComplexity", {})) if result.get("mlComplexity") else "{}"

        rec = db.query(RuleEvaluationRecord).filter_by(authorization_id=req.id).first()
        if rec:
            rec.policy_id = req.policy_id or context.get("policyId")
            rec.decision = result.get("decision", "Nurse Review Required")
            rec.reason = result.get("reason", "")
            rec.ai_reasoning = result.get("aiReasoning", "")
            rec.missing_information = missing_json
            rec.exclusions = exclusions_json
            rec.pathways = pathways_json
            rec.key_factors = key_factors_json
            rec.policy_references = policy_refs_json
            rec.ml_complexity = ml_comp_json
            rec.evaluated_at = datetime.utcnow()
        else:
            rec = RuleEvaluationRecord(
                id=f"eval-{uuid.uuid4().hex[:12]}",
                authorization_id=req.id,
                case_number=req.case_number,
                policy_id=req.policy_id or context.get("policyId"),
                decision=result.get("decision", "Nurse Review Required"),
                reason=result.get("reason", ""),
                ai_reasoning=result.get("aiReasoning", ""),
                missing_information=missing_json,
                exclusions=exclusions_json,
                pathways=pathways_json,
                key_factors=key_factors_json,
                policy_references=policy_refs_json,
                ml_complexity=ml_comp_json,
                evaluated_at=datetime.utcnow(),
            )
            db.add(rec)
        db.commit()
    except Exception as exc:
        db.rollback()
        try:
            from core.database import RuleEvaluationRecord
            import json
            rec = db.query(RuleEvaluationRecord).filter_by(authorization_id=req.id).first()
            if rec:
                rec.policy_id = req.policy_id or context.get("policyId")
                rec.decision = result.get("decision", "Nurse Review Required")
                rec.reason = result.get("reason", "")
                rec.ai_reasoning = result.get("aiReasoning", "")
                rec.missing_information = json.dumps(result.get("missingInformation", []))
                rec.exclusions = json.dumps(result.get("exclusions", []))
                rec.pathways = json.dumps(result.get("pathways", []))
                rec.key_factors = json.dumps(result.get("keyFactors", []))
                rec.policy_references = json.dumps(result.get("policyReferences", []))
                rec.ml_complexity = json.dumps(result.get("mlComplexity", {})) if result.get("mlComplexity") else "{}"
                rec.evaluated_at = datetime.utcnow()
                db.commit()
        except Exception:
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