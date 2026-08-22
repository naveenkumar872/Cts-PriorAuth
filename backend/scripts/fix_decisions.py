"""
fix_decisions.py
----------------
Updates clinical notes on specific seeded cases so the rule engine produces
all 4 decision types: Approved, Not Approved, More Information Required,
Nurse Review Required.

Then re-runs Modules 5 + 6A on only those cases.

Run from repo root:
    python backend/scripts/fix_decisions.py
"""
import sys, logging
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))
logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
log = logging.getLogger("fix_decisions")

from datetime import datetime
from core.database import SessionLocal, AuthorizationRequest, PolicyEvidence

# ── Targeted clinical note updates ───────────────────────────────────────────
#
# NOT APPROVED (auth-007): PAC-32469538 Pacemaker policy
#   Exclusion "non_medicare_leadless" triggers when:
#   - description contains "leadless pacemaker" AND "non-Medicare"
#
# NOT APPROVED (auth-008): FAC-77466132 Facet Joint policy
#   Exclusion "not_medically_necessary_ultrasound_guidance" triggers when:
#   - description contains "ultrasound guidance" in the procedure context
#
# APPROVED (auth-006): HIP-19518116 Hip Arthroscopy policy
#   Pathway "hip_labral_tear_with_fai" conditions need:
#   - hip pain, labral tear, femoroacetabular impingement (FAI)
#   - failed conservative treatment documented
#
# APPROVED (auth-003): CAR-06402812 Cardiac Rehabilitation policy
#   Pathway conditions: recent MI, coronary artery bypass, stable angina
#
# MORE INFO (auth-011): keep ACU-75891551 but strip notes to below threshold
#   readyForTriage = false when completenessScore < 70

UPDATES = {
    # ── NOT APPROVED ──────────────────────────────────────────────────────────
    "auth-007": {
        "clinical_notes": (
            "Non-Medicare member with symptomatic bradycardia. Cardiologist recommends "
            "leadless pacemaker implantation (transcatheter leadless device). "
            "Standard transvenous pacemaker previously attempted but failed due to venous access issues. "
            "No infection. Hemodynamically stable. LVEF 55%."
        ),
        "clear_stale": True,
    },
    "auth-008": {
        "clinical_notes": (
            "Chronic lumbar facet joint pain L4-L5 and L5-S1 with 6 months conservative management. "
            "Requesting facet joint injection with ultrasound guidance for needle placement. "
            "Physical therapy completed 8 weeks. NSAIDs failed. No nerve root compression on MRI."
        ),
        "clear_stale": True,
    },

    # ── APPROVED ──────────────────────────────────────────────────────────────
    "auth-006": {
        "clinical_notes": (
            "Patient presents with right hip pain and labral tear with femoroacetabular impingement (FAI) "
            "confirmed on MRI arthrogram. Non-Medicare member. 3 months of conservative treatment including "
            "physical therapy and NSAIDs with no improvement. Functional limitations: unable to perform "
            "activities of daily living. Orthopedic surgeon recommends hip arthroscopy with labral repair "
            "and FAI correction. Diagnosis: M24.851 Hip labral tear, cam-type FAI confirmed on imaging. "
            "Conservative treatment documented and failed. Provider is board-certified orthopedic surgeon "
            "with valid license in state of practice."
        ),
        "clear_stale": True,
    },
    "auth-003": {
        "clinical_notes": (
            "Patient with recent acute myocardial infarction (STEMI) 3 weeks ago, now hemodynamically stable. "
            "Cardiologist recommends cardiac rehabilitation program (Phase II). "
            "Non-Medicare member. ICD-10: I21.3 ST elevation MI of unspecified site. "
            "Patient is medically stable, no contraindications to exercise. "
            "Physician supervised cardiac rehab meets all coverage criteria per plan policy. "
            "Documentation of acute MI event included. EF 45% on echo post-MI."
        ),
        "clear_stale": True,
    },

    # ── MORE INFORMATION REQUIRED ─────────────────────────────────────────────
    "auth-011": {
        "clinical_notes": "Requesting acupuncture.",   # intentionally minimal — forces low completeness
        "clear_stale": True,
    },
}


def fix() -> None:
    db = SessionLocal()
    try:
        for auth_id, patch in UPDATES.items():
            req = db.query(AuthorizationRequest).filter_by(id=auth_id).first()
            if not req:
                log.warning("Not found: %s", auth_id)
                continue

            req.clinical_notes = patch["clinical_notes"]
            req.updated_at     = datetime.utcnow()

            if patch.get("clear_stale"):
                # Clear rule evaluation so Module 5 re-runs
                if req.policy_context:
                    ctx = dict(req.policy_context)
                    ctx.pop("ruleEvaluation", None)
                    req.policy_context = ctx
                # Clear stale policy evidence
                db.query(PolicyEvidence).filter_by(authorization_id=auth_id).delete()

            log.info("Updated notes for %s (%s)", auth_id, req.case_number)

        db.commit()
        log.info("Notes updated. Running pipeline on affected cases...")

    finally:
        db.close()

    # Re-run Module 5 + 6A for updated cases
    from api.routes.evaluation import _evaluate_and_store
    from api.routes.explanation import generate_explanation

    for auth_id in UPDATES:
        db = SessionLocal()
        try:
            req = db.query(AuthorizationRequest).filter_by(id=auth_id).first()
            if not req:
                continue

            # Module 5 — rule evaluation
            try:
                result = _evaluate_and_store(req, db)
                log.info("  Module 5 [%s]: %s", auth_id, result.get("decision"))
            except Exception as e:
                log.warning("  Module 5 failed [%s]: %s", auth_id, e)
                db.rollback()
                continue

            # Module 6A — explanation
            try:
                ev = generate_explanation(auth_id, db)
                chunks = len(ev.get("retrievedChunks", [])) if ev else 0
                log.info("  Module 6A [%s]: %d chunks", auth_id, chunks)
            except Exception as e:
                log.warning("  Module 6A failed [%s]: %s", auth_id, e)
                try:
                    db.rollback()
                except Exception:
                    pass

        finally:
            db.close()

    log.info("Done.")


if __name__ == "__main__":
    fix()
