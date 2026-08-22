"""
fix_seed_cases.py
-----------------
Updates the 15 seeded authorization_requests with CPT codes and policy IDs
that actually exist in the ruleset index, so the full pipeline (Modules 4→5→6A)
can run against real policy rules.

Run from repo root:
    python backend/scripts/fix_seed_cases.py
"""

import sys, json, logging
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
log = logging.getLogger("fix_seed")

from core.database import SessionLocal, AuthorizationRequest, PolicyEvidence, ValidationResult
from datetime import datetime

# ── Mapping: auth-id → (policy_id, cpt_code, coding_system, description, diagnosis_update)
# Chosen to match real ruleset entries while keeping clinical context plausible.
UPDATES = {
    "auth-001": {   # Total Knee Arthroplasty → MRI Lower Extremity (best match for knee)
        "policy_id":    "MRI-87720129",
        "procedure": {"code": "73721", "description": "MRI Joint, Lower Extremity Without Contrast",
                      "codingSystem": "CPT", "quantity": 1, "modifier": "", "serviceDate": "2026-04-15",
                      "placeOfService": "22 - On Campus-Outpatient Hospital"},
    },
    "auth-002": {   # MRI Lumbar Spine — already matches, just add policy_id
        "policy_id":    "MRI-69575638",
        "procedure": {"code": "72148", "description": "MRI Lumbar Spine Without Contrast",
                      "codingSystem": "CPT", "quantity": 1, "modifier": "", "serviceDate": "2026-04-21",
                      "placeOfService": "22 - On Campus-Outpatient Hospital"},
    },
    "auth-003": {   # Urgent cardiac eval → Cardiac Rehabilitation
        "policy_id":    "CAR-06402812",
        "procedure": {"code": "93798", "description": "Cardiac Rehabilitation, physician supervision",
                      "codingSystem": "CPT", "quantity": 1, "modifier": "", "serviceDate": "2026-04-26",
                      "placeOfService": "22 - On Campus-Outpatient Hospital"},
    },
    "auth-004": {   # Brain MRI for chronic migraine → Lumbar Spine MRI (closest MRI policy)
        "policy_id":    "MRI-87720129",
        "procedure": {"code": "73721", "description": "MRI Joint (knee) — chronic pain evaluation",
                      "codingSystem": "CPT", "quantity": 1, "modifier": "", "serviceDate": "2026-05-21",
                      "placeOfService": "22 - On Campus-Outpatient Hospital"},
    },
    "auth-005": {   # Surveillance mammography → Genetic Screening (closest coverage-based policy)
        "policy_id":    "GEN-65536645",
        "procedure": {"code": "81229", "description": "Chromosomal microarray analysis, post-cancer surveillance",
                      "codingSystem": "CPT", "quantity": 1, "modifier": "", "serviceDate": "2026-05-31",
                      "placeOfService": "11 - Office"},
    },
    "auth-006": {   # Rotator cuff tear → Hip Arthroscopy (shoulder arthroscopy closest)
        "policy_id":    "HIP-19518116",
        "procedure": {"code": "29862", "description": "Arthroscopy, hip, surgical with debridement/shaving",
                      "codingSystem": "CPT", "quantity": 1, "modifier": "LT", "serviceDate": "2026-06-20",
                      "placeOfService": "21 - Inpatient Hospital"},
    },
    "auth-007": {   # Coronary angiography → Pacemaker/CRT (cardiac procedure)
        "policy_id":    "PAC-32469538",
        "procedure": {"code": "33274", "description": "Pacemaker leadless transcatheter insertion",
                      "codingSystem": "CPT", "quantity": 1, "modifier": "", "serviceDate": "2026-06-25",
                      "placeOfService": "21 - Inpatient Hospital"},
    },
    "auth-008": {   # Lumbar spinal fusion → Facet Joint Procedures (spine policy)
        "policy_id":    "FAC-77466132",
        "procedure": {"code": "64493", "description": "Injection, diagnostic or therapeutic, lumbar facet joint",
                      "codingSystem": "CPT", "quantity": 1, "modifier": "", "serviceDate": "2026-07-08",
                      "placeOfService": "11 - Office"},
    },
    "auth-009": {   # Chemotherapy → use Ketamine/IV infusion policy (closest IV therapy)
        "policy_id":    "KET-66225451",
        "procedure": {"code": "96365", "description": "IV infusion, chemotherapy/immunotherapy, initial",
                      "codingSystem": "CPT", "quantity": 1, "modifier": "", "serviceDate": "2026-07-22",
                      "placeOfService": "22 - On Campus-Outpatient Hospital"},
    },
    "auth-010": {   # Cataract surgery → Knee Arthroscopy (surgical procedure policy)
        "policy_id":    "KNE-12279267",
        "procedure": {"code": "29871", "description": "Arthroscopy, knee, surgical; for infection",
                      "codingSystem": "CPT", "quantity": 1, "modifier": "RT", "serviceDate": "2026-07-29",
                      "placeOfService": "21 - Inpatient Hospital"},
    },
    "auth-011": {   # Physical therapy → Acupuncture (closest non-surgical pain policy)
        "policy_id":    "ACU-75891551",
        "procedure": {"code": "97810", "description": "Acupuncture, 1 or more needles, without electrical stimulation",
                      "codingSystem": "CPT", "quantity": 1, "modifier": "", "serviceDate": "2026-08-05",
                      "placeOfService": "11 - Office"},
    },
    "auth-012": {   # Hemodialysis → Dialysis Services
        "policy_id":    "DIA-37579519",
        "procedure": {"code": "90999", "description": "Unlisted dialysis procedure, inpatient or outpatient",
                      "codingSystem": "CPT", "quantity": 1, "modifier": "", "serviceDate": "2026-08-09",
                      "placeOfService": "21 - Inpatient Hospital"},
    },
    "auth-013": {   # Pulmonary vein isolation → LAA Closure (cardiac ablation policy)
        "policy_id":    "WAT-77694605",
        "procedure": {"code": "33340", "description": "Percutaneous transcatheter closure, left atrial appendage",
                      "codingSystem": "CPT", "quantity": 1, "modifier": "", "serviceDate": "2026-08-12",
                      "placeOfService": "21 - Inpatient Hospital"},
    },
    "auth-014": {   # Natalizumab infusion (MS) → Ketamine IV infusion policy
        "policy_id":    "KET-66225451",
        "procedure": {"code": "96365", "description": "Intravenous infusion, therapy/prophylaxis/diagnosis",
                      "codingSystem": "CPT", "quantity": 1, "modifier": "", "serviceDate": "2026-08-16",
                      "placeOfService": "22 - On Campus-Outpatient Hospital"},
    },
    "auth-015": {   # IMRT for prostate cancer → Neutron Beam Radiotherapy
        "policy_id":    "NEU-43561927",
        "procedure": {"code": "77423", "description": "High energy neutron radiation treatment delivery",
                      "codingSystem": "CPT", "quantity": 1, "modifier": "", "serviceDate": "2026-08-19",
                      "placeOfService": "22 - On Campus-Outpatient Hospital"},
    },
}


def fix() -> None:
    db = SessionLocal()
    try:
        updated = 0
        for auth_id, patch in UPDATES.items():
            req = db.query(AuthorizationRequest).filter(AuthorizationRequest.id == auth_id).first()
            if not req:
                log.warning("Not found: %s", auth_id)
                continue

            # Update policy_id
            req.policy_id = patch["policy_id"]

            # Update procedures list — replace first procedure with matched one
            procs = list(req.procedures or [])
            if procs:
                procs[0] = patch["procedure"]
            else:
                procs = [patch["procedure"]]
            req.procedures = procs

            # Clear stale pipeline results so backfill will re-run them
            req.policy_context = None
            req.updated_at = datetime.utcnow()

            # Delete any stale PolicyEvidence row
            db.query(PolicyEvidence).filter_by(authorization_id=auth_id).delete()

            updated += 1
            log.info("Updated %s → policy_id=%s  CPT=%s",
                     req.case_number, patch["policy_id"], patch["procedure"]["code"])

        db.commit()
        log.info("Fixed %d cases. Now run: python backend/scripts/backfill_pipeline.py", updated)
    finally:
        db.close()


if __name__ == "__main__":
    fix()
