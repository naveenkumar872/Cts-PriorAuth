"""
backfill_pipeline.py
--------------------
Runs Module 4 (Context Mapping) + Module 5 (Rule Evaluation) +
Module 6A (RAG Explanation) on all existing authorization requests
that are missing policy_context or policy evidence.

Since seeded cases have no policy_id, the context mapper falls back
to service-code lookup (procedures[0].code).

Run from the backend/ directory:
    python -m scripts.backfill_pipeline
"""

import sys
import logging
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(name)s  %(message)s")
log = logging.getLogger("backfill")

from core.database import SessionLocal, AuthorizationRequest, PolicyEvidence
from api.routes.context import map_policy, MapPolicyRequest
from api.routes.evaluation import _evaluate_and_store
from api.routes.explanation import generate_explanation
from sqlalchemy import text
import uuid
from datetime import datetime


def backfill() -> None:
    # Collect IDs first with a short-lived session
    with SessionLocal() as id_db:
        ids = [r.id for r in id_db.query(AuthorizationRequest.id).all()]
    log.info("Found %d authorization request(s) to process.", len(ids))

    for auth_id in ids:
        # Fresh session per case — a failure in one case won't poison the next
        db = SessionLocal()
        try:
            req = db.query(AuthorizationRequest).filter(AuthorizationRequest.id == auth_id).first()
            if not req:
                log.warning("Not found: %s", auth_id)
                continue

            log.info("─── Processing %s (%s) ───", req.case_number, req.id)

            # ── Module 4 ──────────────────────────────────────────────────
            if not req.policy_context:
                procs         = req.procedures or []
                service_code  = procs[0].get("code", "") if procs else ""
                coding_system = procs[0].get("codingSystem", "CPT") if procs else "CPT"
                policy_id     = req.policy_id or ""

                if not policy_id and not service_code:
                    log.warning("  Skipping — no policyId and no serviceCode")
                    continue

                try:
                    result = map_policy(MapPolicyRequest(
                        policyId=policy_id or None,
                        serviceCode=service_code or None,
                        codingSystem=coding_system or None,
                        caseId=req.id,
                    ))
                    req.policy_context = result
                    req.updated_at     = datetime.utcnow()
                    db.flush()
                    log.info("  Module 4: matched=%s policy=%s method=%s",
                             result.get("matched"), result.get("policyName","none"),
                             result.get("matchMethod","none"))
                except Exception as e:
                    log.warning("  Module 4 failed: %s", e)
                    db.rollback()
                    continue
            else:
                log.info("  Module 4: already done")

            # ── Module 5 ──────────────────────────────────────────────────
            existing_eval = (req.policy_context or {}).get("ruleEvaluation")
            if not existing_eval:
                try:
                    result = _evaluate_and_store(req, db)
                    log.info("  Module 5: decision=%s", result.get("decision"))
                except Exception as e:
                    log.warning("  Module 5 failed: %s", e)
                    db.rollback()
                    continue
            else:
                log.info("  Module 5: already done (decision=%s)", existing_eval.get("decision"))

            # ── Module 6A ─────────────────────────────────────────────────
            existing_ev = db.query(PolicyEvidence).filter_by(authorization_id=req.id).first()
            if not existing_ev:
                try:
                    ev = generate_explanation(req.id, db)
                    if ev:
                        log.info("  Module 6A: explanation generated (%d chunk(s))",
                                 len(ev.get("retrievedChunks", [])))
                    else:
                        log.warning("  Module 6A: returned None (Gemini/Weaviate not available?)")
                except Exception as e:
                    log.warning("  Module 6A failed: %s", e)
                    try:
                        db.rollback()
                    except Exception:
                        pass
            else:
                log.info("  Module 6A: already done")

        finally:
            db.close()

    log.info("Backfill complete.")


if __name__ == "__main__":
    backfill()
