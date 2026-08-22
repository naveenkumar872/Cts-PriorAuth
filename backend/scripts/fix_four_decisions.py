"""
fix_four_decisions.py
---------------------
Directly patches ValidationResult.step4_structured + policy_context for 4 cases
to produce all 4 rule engine decision types without relying on Gemini NLP.

Approach:
  - Inject policyFacts into clinicalData that exactly match the ruleset condition values
  - Re-run Module 5 (rule evaluation) only — no Gemini calls needed
  - Leave existing Nurse Review cases (11 others) untouched

Decision targets:
  auth-001 → Approved        (MRI-87720129: inject loose_body_or_mechanical_symptoms condition)
  auth-007 → Not Approved    (UNI-57180743: UniSpacer — switch policy, trigger not_medically_necessary exclusion)
  auth-013 → More Info       (WAT-77694605: already More Info, keep it)
  auth-002 → Approved        (MRI-69575638: already Approved, keep it)

Plus ensure we have at least 2 Nurse Reviews, 1 Not Approved visible.

Run from repo root:
    python backend/scripts/fix_four_decisions.py
"""
import sys, json, logging
from pathlib import Path
from datetime import datetime

sys.path.insert(0, str(Path(__file__).parent.parent))
logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
log = logging.getLogger("fix_four")

from core.database import SessionLocal, AuthorizationRequest, ValidationResult, PolicyEvidence

# ── UniSpacer policy info ─────────────────────────────────────────────────────
idx = json.loads((Path(__file__).parent.parent.parent / "rulesets" / "policy_index.json").read_text())
uni_pid   = "UNI-57180743"
uni_meta  = idx[uni_pid]
uni_rs    = json.loads((Path(__file__).parent.parent.parent / "rulesets" / uni_meta["file"]).read_text())
uni_rule_sets = uni_rs.get("rule_sets", [])

# MRI lower extremity policy info
mri_pid   = "MRI-87720129"
mri_meta  = idx[mri_pid]
mri_rs    = json.loads((Path(__file__).parent.parent.parent / "rulesets" / mri_meta["file"]).read_text())
mri_rule_sets = mri_rs.get("rule_sets", [])


def patch_structured(base: dict, policy_facts: dict) -> dict:
    """Inject policyFacts into clinicalData so _flatten_facts picks them up."""
    result = dict(base) if base else {}
    if "clinicalData" not in result:
        result["clinicalData"] = {}
    cd = dict(result["clinicalData"])
    cd["policyFacts"] = policy_facts
    # Also inject into validationSummary to ensure readyForTriage=True for approved cases
    if "validationSummary" not in result:
        result["validationSummary"] = {}
    result["clinicalData"] = cd
    return result


def build_unispacer_context():
    """
    UniSpacer: non_medicare_members pathway conditions require:
      member_type = Non-Medicare
      clinical_evidence = "insufficient evidence..."
      kaiser_permanente_medical_technology_assessment_criteria_met = False
    All pathways lead to NOT APPROVED — the exclusion 'not_medically_necessary' fires
    when exclusion_id phrase "not medically necessary" appears in corpus.
    """
    from api.routes.context import map_policy, MapPolicyRequest
    result = map_policy(MapPolicyRequest(
        policyId=uni_pid,
        serviceCode="No specific codes",
        codingSystem="CPT",
        caseId="auth-007",
    ))
    return result


def run() -> None:
    db = SessionLocal()
    try:
        # ── Case 1: NOT APPROVED — auth-007 ──────────────────────────────────
        # Switch to UniSpacer policy and inject matching policyFacts
        req7 = db.query(AuthorizationRequest).filter_by(id="auth-007").first()
        if req7:
            # Update to UniSpacer CPT code (placeholder) and policy
            procs = list(req7.procedures or [])
            if procs:
                procs[0] = {
                    "code": "27446", "description": "UniSpacer Knee System implant",
                    "codingSystem": "CPT", "quantity": 1, "modifier": "",
                    "serviceDate": "2026-06-25", "placeOfService": "21 - Inpatient Hospital",
                }
            req7.procedures   = procs
            req7.policy_id    = uni_pid
            req7.clinical_notes = (
                "Patient with medial compartment knee osteoarthritis requesting UniSpacer knee implant. "
                "Non-Medicare member. Orthopaedic surgeon recommends UniSpacer knee system. "
                "Note: UniSpacer is not medically necessary per Kaiser Permanente Medical Technology "
                "Assessment criteria. Insufficient evidence in the published medical literature to "
                "support clinical efficacy. Clinical evidence: insufficient evidence in the published "
                "medical literature to support coverage of this device."
            )
            req7.updated_at   = datetime.utcnow()

            # Build policy context from UniSpacer ruleset
            from api.routes.context import map_policy, MapPolicyRequest
            ctx7 = map_policy(MapPolicyRequest(
                policyId=uni_pid, serviceCode=None, codingSystem="CPT", caseId="auth-007"
            ))
            ctx7.pop("ruleEvaluation", None)
            req7.policy_context = ctx7

            # Patch step4_structured with policyFacts that match UniSpacer pathway conditions
            vr7 = db.query(ValidationResult).filter_by(authorization_id="auth-007").first()
            policy_facts_7 = {
                "member_type":                     "Non-Medicare",
                "clinical_evidence":               "insufficient evidence in the published medical literature to support coverage of this device",
                "kaiser_permanente_medical_technology_assessment_criteria_met": False,
                "not medically necessary":         True,  # triggers exclusion phrase match
            }
            if vr7:
                vr7.step4_structured = patch_structured(vr7.step4_structured, policy_facts_7)
                vr7.step4_structured["validationSummary"] = {
                    **(vr7.step4_structured.get("validationSummary") or {}),
                    "completenessScore": 75, "readyForTriage": True,
                    "criticalIssues": 0, "warningIssues": 0,
                }

            db.query(PolicyEvidence).filter_by(authorization_id="auth-007").delete()
            db.flush()
            log.info("auth-007 → UniSpacer Not Approved (patched)")

        # ── Case 2: APPROVED — auth-001 ──────────────────────────────────────
        # MRI Lower Extremity — inject matching pathway condition values
        req1 = db.query(AuthorizationRequest).filter_by(id="auth-001").first()
        if req1:
            vr1 = db.query(ValidationResult).filter_by(authorization_id="auth-001").first()
            policy_facts_1 = {
                # Pathway: joint_anatomy_or_structural_defect (logic=ANY)
                # field=loose_body_or_mechanical_symptoms_in_joint_space val="suspected and plain film negative"
                "loose_body_or_mechanical_symptoms_in_joint_space": "suspected and plain film negative",
                # field=ligament_tear_suspected val=True
                "ligament_tear_suspected": True,
            }
            if vr1:
                vr1.step4_structured = patch_structured(vr1.step4_structured, policy_facts_1)
                vr1.step4_structured["validationSummary"] = {
                    **(vr1.step4_structured.get("validationSummary") or {}),
                    "completenessScore": 85, "readyForTriage": True,
                    "criticalIssues": 0, "warningIssues": 0,
                }
            # Clear stale rule evaluation
            ctx1 = dict(req1.policy_context or {})
            ctx1.pop("ruleEvaluation", None)
            req1.policy_context = ctx1
            req1.updated_at = datetime.utcnow()
            db.query(PolicyEvidence).filter_by(authorization_id="auth-001").delete()
            db.flush()
            log.info("auth-001 → MRI Approved (patched policyFacts)")

        # ── Case 3: MORE INFORMATION REQUIRED — auth-011 ─────────────────────
        # Force low completeness so readyForTriage=False
        req11 = db.query(AuthorizationRequest).filter_by(id="auth-011").first()
        if req11:
            vr11 = db.query(ValidationResult).filter_by(authorization_id="auth-011").first()
            if vr11:
                s4 = dict(vr11.step4_structured or {})
                s4["validationSummary"] = {
                    **(s4.get("validationSummary") or {}),
                    "completenessScore": 35,
                    "readyForTriage": False,
                    "criticalIssues": 3,
                    "warningIssues": 2,
                    "riskLevel": "high",
                }
                vr11.step4_structured = s4
            ctx11 = dict(req11.policy_context or {})
            ctx11.pop("ruleEvaluation", None)
            req11.policy_context = ctx11
            req11.updated_at = datetime.utcnow()
            db.query(PolicyEvidence).filter_by(authorization_id="auth-011").delete()
            db.flush()
            log.info("auth-011 → ACU More Info (forced low completeness)")

        db.commit()
        log.info("Patches committed. Running Module 5 on 3 cases...")

    finally:
        db.close()

    # ── Re-run Module 5 only for the 3 patched cases ─────────────────────────
    from api.routes.evaluation import _evaluate_and_store

    for auth_id in ("auth-007", "auth-001", "auth-011"):
        db = SessionLocal()
        try:
            req = db.query(AuthorizationRequest).filter_by(id=auth_id).first()
            if not req:
                continue
            try:
                result = _evaluate_and_store(req, db)
                log.info("  Module 5 [%s]: %s", auth_id, result.get("decision"))
            except Exception as e:
                log.warning("  Module 5 failed [%s]: %s", auth_id, e)
                db.rollback()
        finally:
            db.close()

    log.info("Done. Final decisions:")

    # Print final summary
    db = SessionLocal()
    try:
        from collections import Counter
        cases = db.query(AuthorizationRequest).order_by(AuthorizationRequest.case_number).all()
        decisions = []
        for c in cases:
            ctx = c.policy_context or {}
            re  = ctx.get("ruleEvaluation") or {}
            dec = re.get("decision", "NO EVAL")
            decisions.append(dec)
            log.info("  %s  %s", c.case_number, dec)
        log.info("Summary: %s", dict(Counter(decisions)))
    finally:
        db.close()


if __name__ == "__main__":
    run()
