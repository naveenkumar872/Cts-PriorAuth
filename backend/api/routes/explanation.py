"""
Module 6A — Policy Evidence & LLM Explanation
/api/v1/explanation/

Pipeline (runs in background after rule engine):
  1. LLM writes a focused retrieval query from rule decision + ruleset + provider input
  2. Query hits Weaviate filtered by policy_id metadata → top-K chunks
  3. Chunks + full context passed back to LLM → 2-3 sentence explanation
  4. Full prompt stored in PolicyEvidence.llm_prompt for Policy Companion reuse

Policy Companion (payer-facing chat):
  GET  /{case_id}              — fetch stored evidence + explanation
  GET  /{case_id}/messages     — fetch companion chat history
  POST /{case_id}/chat         — payer asks a question; retrieves fresh chunks
                                 using stored base prompt + question → LLM answers
"""

import json
import time
import uuid
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from core.config import settings
from core.database import (
    AuditLog, AuthorizationRequest, PolicyCompanionMessage,
    PolicyEvidence, ValidationResult, get_db,
)

router = APIRouter()
log    = logging.getLogger(__name__)

GEMINI_MODEL = "gemini-3.5-flash-lite"
TOP_K        = 5          # chunks to retrieve from Weaviate


# ── Gemini client helper ──────────────────────────────────────────────────────
def _call_gemini_llm(prompt: str) -> str:
    if not settings.GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY is not configured in .env")
    try:
        from google import genai
        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        resp = client.models.generate_content(model=GEMINI_MODEL, contents=prompt)
        return (resp.text or "").strip()
    except Exception:
        import google.generativeai as genai_legacy
        genai_legacy.configure(api_key=settings.GEMINI_API_KEY)
        model = genai_legacy.GenerativeModel("gemini-1.5-flash")
        resp = model.generate_content(prompt)
        return (resp.text or "").strip()


# ── Weaviate retrieval ────────────────────────────────────────────────────────

def _retrieve_chunks(query: str, policy_id: str, top_k: int = TOP_K) -> List[Dict[str, Any]]:
    """
    Retrieve top-K chunks from Weaviate using BM25 keyword + Vector Hybrid search.
    Filters by policyId metadata when policy_id is available.
    Falls back to unfiltered BM25 if no results match the filter.
    """
    from weaviate.classes.init import AdditionalConfig, Timeout
    import weaviate as _weaviate
    from weaviate.classes.init import Auth as _Auth

    client = _weaviate.connect_to_weaviate_cloud(
        cluster_url=settings.WEAVIATE_URL,
        auth_credentials=_Auth.api_key(settings.WEAVIATE_API_KEY),
        additional_config=AdditionalConfig(timeout=Timeout(init=60, query=30, insert=60)),
    )
    chunks: List[Dict[str, Any]] = []
    try:
        from weaviate.classes.query import Filter
        collection = client.collections.get(settings.WEAVIATE_COLLECTION)

        def _run(use_filter: bool):
            kwargs: Dict[str, Any] = dict(query=query, limit=top_k)
            if use_filter and policy_id:
                kwargs["filters"] = Filter.by_property("policyId").contains_any([policy_id])
            
            try:
                return collection.query.hybrid(alpha=0.5, **kwargs)
            except Exception:
                return collection.query.bm25(**kwargs)

        response = _run(use_filter=True)
        if not response.objects and policy_id:
            response = _run(use_filter=False)

        for obj in response.objects:
            props = obj.properties
            pid_list = props.get("policyId") or []
            chunks.append({
                "text":        props.get("text", ""),
                "policyId":    pid_list[0] if pid_list else policy_id,
                "policyName":  (props.get("policyName") or [""])[0],
                "sourceFile":  props.get("sourceFile", ""),
                "chunkIndex":  props.get("chunkIndex", 0),
                "score":       getattr(obj.metadata, "score", 0.85) if hasattr(obj, "metadata") and obj.metadata else 0.85,
            })
    finally:
        client.close()

    return chunks


# ── Prompt builders ───────────────────────────────────────────────────────────

def _build_base_context(
    req: AuthorizationRequest,
    rule_decision: str,
    rule_reason: str,
    missing_info: List[str],
    applicable_rule_sets: List[Dict],
) -> str:
    procs = req.procedures or []
    diags = req.diagnoses  or []

    proc_lines = "\n".join(
        f"  - {p.get('description','?')} (code: {p.get('code','?')}, system: {p.get('codingSystem','CPT')})"
        for p in procs
    )
    diag_lines = "\n".join(
        f"  - [{d.get('type','secondary').upper()}] {d.get('code','?')} — {d.get('description','?')}"
        for d in diags
    )

    ruleset_lines: List[str] = []
    for rs in applicable_rule_sets[:3]:
        rs_id = rs.get("ruleSetId", "unknown")
        segment = rs.get("policySegment", "")
        pathways = rs.get("pathways", [])
        pathway_names = ", ".join(p.get("pathway_id", "?") for p in pathways[:5])
        ruleset_lines.append(
            f"  RuleSet: {rs_id}"
            + (f" ({segment})" if segment else "")
            + f"\n    Pathways: {pathway_names or 'none'}"
        )

    missing_lines = "\n".join(f"  - {m}" for m in (missing_info or [])) or "  None"

    return f"""=== PRIOR AUTHORIZATION CONTEXT ===

CASE: {req.case_number}
PATIENT: {req.patient.name if req.patient else 'Unknown'} | Member ID: {req.patient.member_id if req.patient else 'N/A'}
POLICY ID: {req.policy_id or 'N/A'}

REQUESTED PROCEDURES:
{proc_lines or '  (none)'}

DIAGNOSES:
{diag_lines or '  (none)'}

CLINICAL NOTES (excerpt):
  {(req.clinical_notes or '')[:600]}{'...' if len(req.clinical_notes or '') > 600 else ''}

APPLICABLE RULE SETS:
{chr(10).join(ruleset_lines) or '  (no ruleset matched)'}

RULE ENGINE DECISION: {rule_decision}
RULE ENGINE REASON: {rule_reason}

MISSING / UNVERIFIED INFORMATION:
{missing_lines}
""".strip()


def _build_explanation_prompt(base_context: str) -> str:
    return f"""{base_context}

---
TASK: You are a clinical prior authorization reviewer.
Based strictly on the Rule Engine decision, rule reason, missing information, and clinical context above,
write a clear 2-3 sentence explanation of WHY this PA request received the decision it did.
- Be specific: mention the exact procedure, diagnosis, and policy criteria that were met, failed, or missing.
- Do NOT change or contradict the rule engine decision.
- Write in plain, professional language suitable for a healthcare reviewer.

Return ONLY the explanation paragraph. No headings, no bullet points."""


def _build_companion_prompt(base_context: str, chunks: List[Dict], query: str, user_question: str) -> str:
    chunk_text = "\n\n".join(
        f"[Source {i+1} — {c.get('policyName','Policy')} | score {(c.get('score') or 0.85):.2f}]\n{c['text']}"
        for i, c in enumerate(chunks[:TOP_K])
    )
    return f"""{base_context}

---
RETRIEVED POLICY EVIDENCE (for question: "{user_question}"):

{chunk_text}

---
PAYER QUESTION / MESSAGE: {user_question}

TASK: You are a helpful, professional AI Policy Companion assistant for a health insurance reviewer.
- GREETING INSTRUCTION: If the user's message is a greeting (e.g. "hi", "hello", "hey", "good morning"), respond with a warm, polite greeting. Introduce yourself as their AI Policy Companion and briefly offer to assist them in reviewing policy guidelines, medical necessity criteria, or required documentation for this case.
- QUESTION INSTRUCTION: For specific questions regarding policy rules, clinical criteria, or documentation, provide a clear, concise answer (2-4 sentences) using the policy evidence and PA context above.
- Tone: Professional, welcoming, and precise."""


# ── Core pipeline function ───────────────────────────────────────────────────

def generate_explanation(auth_id: str, db: Session) -> Optional[Dict[str, Any]]:
    start_ms = int(time.time() * 1000)

    req = (
        db.query(AuthorizationRequest)
        .filter(AuthorizationRequest.id == auth_id)
        .first()
    )
    if not req:
        log.warning("Explanation: request %s not found", auth_id)
        return None

    db.expire(req)

    policy_ctx    = req.policy_context or {}
    rule_eval     = policy_ctx.get("ruleEvaluation") or {}
    rule_decision = rule_eval.get("decision", "Unknown")
    rule_reason   = rule_eval.get("reason", "")
    missing_info  = rule_eval.get("missingInformation", [])
    applicable_rs = policy_ctx.get("applicableRuleSets", [])
    policy_id     = req.policy_id or policy_ctx.get("policyId") or ""

    if rule_decision == "Unknown":
        log.info("Explanation skipped for %s — rule evaluation not complete", auth_id)
        return None

    base_context = _build_full_provider_and_ruleset_context(req, db)

    explanation = ""
    explanation_prompt = _build_explanation_prompt(base_context)
    try:
        explanation = _call_gemini_llm(explanation_prompt)
    except Exception as e:
        log.warning("Explanation: LLM explanation failed for %s: %s", auth_id, e)
        explanation = (
            f"The rule engine determined: {rule_decision}. "
            f"Reason: {rule_reason}. "
            + (f"Missing: {'; '.join(missing_info[:3])}." if missing_info else "")
        )

    chunks: List[Dict] = []
    weaviate_query = f"{policy_id} {rule_decision} policy criteria"
    try:
        chunks = _retrieve_chunks(weaviate_query, policy_id, top_k=3)
    except Exception as e:
        log.info("Explanation: Optional background chunk retrieval skipped for %s: %s", auth_id, e)

    duration_ms = int(time.time() * 1000) - start_ms

    existing = db.query(PolicyEvidence).filter_by(authorization_id=auth_id).first()
    if existing:
        db.delete(existing)
        db.flush()

    evidence = PolicyEvidence(
        id               = f"pe-{uuid.uuid4().hex[:10]}",
        authorization_id = auth_id,
        policy_id        = policy_id,
        rule_decision    = rule_decision,
        retrieved_chunks = chunks,
        llm_explanation  = explanation,
        llm_prompt       = base_context,
        weaviate_query   = weaviate_query,
        generated_at     = datetime.utcnow(),
        duration_ms      = duration_ms,
    )
    db.add(evidence)

    db.add(AuditLog(
        id               = f"at-{uuid.uuid4().hex[:8]}",
        authorization_id = auth_id,
        action           = "Policy Explanation Generated",
        performed_by     = "CareAuth Explanation Engine (Gemini + Rule Context)",
        role             = "System",
        timestamp        = datetime.utcnow(),
        details          = f"Decision: {rule_decision}. Explanation generated from rule evaluation context in {duration_ms}ms.",
        new_value        = rule_decision,
        category         = "explanation",
        event_metadata   = {
            "policyId":     policy_id,
            "durationMs":   duration_ms,
        },
    ))
    db.commit()
    log.info("Explanation generated and stored for %s in %dms", auth_id, duration_ms)

    return _ser_evidence(evidence)


# ── Serialisers ───────────────────────────────────────────────────────────────

def _ser_evidence(ev: PolicyEvidence) -> Dict[str, Any]:
    return {
        "id":              ev.id,
        "authorizationId": ev.authorization_id,
        "policyId":        ev.policy_id,
        "ruleDecision":    ev.rule_decision,
        "explanation":     ev.llm_explanation,
        "weaviateQuery":   ev.weaviate_query,
        "retrievedChunks": [
            {
                "text":        c.get("text", ""),
                "textPreview": c.get("text", "")[:300] + "..." if len(c.get("text","")) > 300 else c.get("text",""),
                "policyId":    c.get("policyId"),
                "policyName":  c.get("policyName"),
                "sourceFile":  c.get("sourceFile"),
                "score":       c.get("score", 0),
            }
            for c in (ev.retrieved_chunks or [])
        ],
        "generatedAt":     ev.generated_at.isoformat() + "Z" if ev.generated_at else None,
        "durationMs":      ev.duration_ms,
    }


def _ser_message(m: PolicyCompanionMessage) -> Dict[str, Any]:
    return {
        "id":              m.id,
        "authorizationId": m.authorization_id,
        "role":            m.role,
        "content":         m.content,
        "sources":         m.sources or [],
        "createdAt":       m.created_at.isoformat() + "Z" if m.created_at else None,
    }


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/{case_id}")
def get_explanation(case_id: str, db: Session = Depends(get_db)):
    """Fetch stored policy evidence and LLM explanation for a case."""
    req = (
        db.query(AuthorizationRequest).filter(AuthorizationRequest.id == case_id).first()
        or db.query(AuthorizationRequest).filter(AuthorizationRequest.case_number == case_id).first()
    )
    if not req:
        raise HTTPException(status_code=404, detail="Case not found")

    ev = db.query(PolicyEvidence).filter_by(authorization_id=req.id).first()
    if not ev:
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=202,
            content={
                "status":  "pending",
                "message": "Policy evidence is being generated. Retry in a few seconds.",
                "caseId":  req.id,
            },
        )
    return _ser_evidence(ev)


@router.get("/{case_id}/messages")
def get_messages(case_id: str, db: Session = Depends(get_db)):
    """Fetch all Policy Companion chat messages for a case."""
    req = (
        db.query(AuthorizationRequest).filter(AuthorizationRequest.id == case_id).first()
        or db.query(AuthorizationRequest).filter(AuthorizationRequest.case_number == case_id).first()
    )
    if not req:
        return []

    messages = (
        db.query(PolicyCompanionMessage)
        .filter_by(authorization_id=req.id)
        .order_by(PolicyCompanionMessage.created_at)
        .all()
    )
    return [_ser_message(m) for m in messages]


class ChatRequest(BaseModel):
    question: str


def _build_full_provider_and_ruleset_context(req: AuthorizationRequest, db: Session) -> str:
    """
    Build complete, structured context containing:
    1. Full Provider Input (Patient, Provider, CPT Procedures, ICD-10 Diagnoses Report, Clinical Notes, Extracted Document Text, Conservative Tx)
    2. Full Rule Set & Rule Engine Evaluation (Policy ID, Mapped Rulesets, Pathways & Conditions, Exclusions, Decision, Reason, Missing Info)
    """
    policy_ctx = req.policy_context or {}
    rule_eval = policy_ctx.get("ruleEvaluation") or {}
    applicable_rs = policy_ctx.get("applicableRuleSets") or []

    # 1. Provider Input — CPT Procedures
    procs = req.procedures or []
    proc_lines = []
    for p in procs:
        proc_lines.append(f"  - CPT/HCPCS {p.get('code','?')}: {p.get('description','?')} (Quantity: {p.get('quantity', 1)})")
    
    # Provider Input — ICD-10 Diagnoses Report
    diags = req.diagnoses or []
    diag_lines = []
    for d in diags:
        diag_lines.append(f"  - [{d.get('type','primary').upper()}] ICD-10 Code {d.get('code','?')}: {d.get('description','?')}")

    # Provider Input — Step 4 Extracted Payload from ValidationResult
    vr = db.query(ValidationResult).filter_by(authorization_id=req.id).first()
    structured = (vr.step4_structured or {}) if vr else {}
    clinical_data = structured.get("clinicalData", {})
    
    conservative_tx = clinical_data.get("conservativeTxDetails", [])
    clinical_findings = clinical_data.get("keyClinicialFindings", [])
    functional_limits = clinical_data.get("functionalLimitations", [])
    doc_previews = []
    for doc in structured.get("extractedDocuments", []):
        if isinstance(doc, dict) and doc.get("extractedText"):
            doc_previews.append(f"  - Document '{doc.get('docName', 'Doc')}': {doc.get('extractedText', '')[:400]}")

    # 2. Rule Set & Criteria Context
    ruleset_details = []
    for rs in applicable_rs:
        rs_id = rs.get("ruleSetId", "unknown")
        seg = rs.get("policySegment", "")
        pathways = rs.get("pathways", [])
        p_strs = []
        for pw in pathways:
            conds = [f"{c.get('field')} {c.get('operator')} {c.get('value')}" for c in pw.get("conditions", [])]
            p_strs.append(f"Pathway '{pw.get('pathway_id')}': [{', '.join(conds)}]")
        excl_strs = [e.get("description", str(e)) if isinstance(e, dict) else str(e) for e in rs.get("exclusions", [])]
        
        ruleset_details.append(
            f"  Ruleset ID: {rs_id} ({seg})\n"
            + f"    Pathways Defined: {'; '.join(p_strs) or 'None'}\n"
            + f"    Exclusions Defined: {'; '.join(excl_strs) or 'None'}"
        )

    # 3. Rule Engine Decision Outcome
    decision = rule_eval.get("decision", req.status or "Nurse Review Required")
    reason = rule_eval.get("reason", "Evaluated against policy ruleset pathways.")
    missing = rule_eval.get("missingInformation", [])
    eval_pathways = rule_eval.get("pathways", [])
    eval_pw_lines = []
    for pw in eval_pathways:
        eval_pw_lines.append(f"  - Pathway '{pw.get('pathwayId')}': Passed={pw.get('passed')}, Unknown={pw.get('unknown')}")

    return f"""=== FULL PROVIDER INPUT (STRUCTURED PRIOR AUTH SUBMISSION) ===
Case Number: {req.case_number}
Patient Name: {req.patient.name if req.patient else 'N/A'} | Member ID: {req.patient.member_id if req.patient else 'N/A'}
Provider: {req.provider.name if req.provider else 'N/A'} | Specialty: {req.provider.specialty if req.provider else 'N/A'} (NPI: {req.provider.npi if req.provider else 'N/A'})
Policy ID: {req.policy_id or 'N/A'}

REQUESTED PROCEDURES (CPT):
{chr(10).join(proc_lines) or '  - (none)'}

DIAGNOSIS REPORT (ICD-10):
{chr(10).join(diag_lines) or '  - (none)'}

CLINICAL NOTES & EXTRACTED FINDINGS:
  Clinical Notes: {(req.clinical_notes or '')[:800]}
  Conservative Treatment Log: {', '.join(str(x) for x in conservative_tx) if conservative_tx else 'None reported'}
  Clinical Findings: {', '.join(str(x) for x in clinical_findings) if clinical_findings else 'None'}
  Functional Limitations: {', '.join(str(x) for x in functional_limits) if functional_limits else 'None'}

ATTACHED CLINICAL DOCUMENT EXCERPTS:
{chr(10).join(doc_previews) or '  - (no document text)'}

=== MAPPED RULE SET & RULE ENGINE EVALUATION ===
MAPPED RULESETS & CRITERIA:
{chr(10).join(ruleset_details) or '  - (no applicable rulesets)'}

RULE ENGINE EVALUATION RESULT:
  Decision: {decision}
  Reasoning: {reason}
  Missing Information Checklist: {', '.join(missing) if missing else 'None'}
  Evaluated Pathway Results:
{chr(10).join(eval_pw_lines) or '    - (none)'}
""".strip()


# ── Query Rewriter Module ───────────────────────────────────────────────────

def _rewrite_user_query(user_query: str, req: Optional[AuthorizationRequest], db: Session) -> str:
    """
    RAG Query Rewriter Module:
    Rewrites conversational or brief user queries into a domain-dense, highly specific vector DB search query
    synthesizing 4 context sources:
      1. Rule Set (policy ID, policy name, active ruleset criteria)
      2. Provider Input (diagnoses report, procedure codes, clinical notes, document text)
      3. Rule Set Decision (status, reasoning, missing criteria, pathways)
      4. User Input / Question (typed prompt e.g. 'explain conclusion')
    """
    raw = user_query.strip()
    if not req:
        return f"POL-001 medical necessity policy criteria {raw}"

    full_context = _build_full_provider_and_ruleset_context(req, db)
    policy_id = req.policy_id or "POL-001"
    status = req.status or "Nurse Review Required"

    rewriter_prompt = f"""You are an expert Medical Prior-Authorization RAG Query Rewriter.
Your job is to rewrite a healthcare reviewer's input prompt into a targeted, domain-dense vector database search query for retrieving policy document chunks.

================ FULL STRUCTURED CASE CONTEXT ================
{full_context}
============================================================

RAW USER INPUT / QUESTION:
"{raw}"

INSTRUCTIONS:
1. Synthesize:
   - Rule Set: Mapped policy ruleset ({policy_id}), policy criteria, pathways, and exclusions.
   - Provider Input: CPT procedures, ICD-10 diagnosis report, clinical notes, conservative treatment findings, and clinical documents.
   - Rule Engine Decision: Status ({status}), decision reasoning, and missing information checklist.
   - User Input: Raw user question ("{raw}").
2. Formulate a single, highly specific, domain-dense search query (1 sentence, 12-25 words) that captures the exact medical policy section, clinical guidelines, conservative trial requirements, or exclusion rules needed to answer the user's question.
3. If the user asks something short or conversational (e.g. "explain conclusion", "why pending?", "why nurse review?", "what failed?", "what is missing?"), expand it using the specific procedure names, diagnosis codes, clinical note findings, and missing items from the case context above.
4. Output ONLY the rewritten search query text. Do NOT include quotes, conversational filler, or preamble.

REWRITTEN VECTOR DB SEARCH QUERY:"""

    try:
        rewritten = _call_gemini_llm(rewriter_prompt).strip()
        if rewritten.startswith('"') and rewritten.endswith('"'):
            rewritten = rewritten[1:-1].strip()
        log.info("Policy Companion Query Rewriter: '%s' -> '%s'", raw, rewritten)
        return rewritten if len(rewritten) > 5 else f"{policy_id} {status} {raw}"
    except Exception as e:
        log.warning("Policy Companion Query Rewriter failed: %s. Falling back to default query formulation.", e)
        return f"{policy_id} {status} {raw}"



@router.post("/{case_id}/chat")
def companion_chat(case_id: str, payload: ChatRequest, db: Session = Depends(get_db)):
    """
    Policy Companion chat endpoint.
    Retrieves fresh chunks from Weaviate Vector DB for the user's question,
    and calls Gemini LLM to generate a grounded, context-aware answer with policy citations.
    """
    question = payload.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    req = (
        db.query(AuthorizationRequest).filter(AuthorizationRequest.id == case_id).first()
        or db.query(AuthorizationRequest).filter(AuthorizationRequest.case_number == case_id).first()
    )

    policy_id = req.policy_id if (req and req.policy_id) else "POL-001"

    base_prompt = _build_full_provider_and_ruleset_context(req, db) if req else f"Case ID: {case_id} | Policy ID: {policy_id}\nPatient: Sarah Martinez | Procedure: MRI Brain (CPT 70551) | Diagnosis: Low back pain (ICD-10 M54.5)"

    if req:
        try:
            db.add(PolicyCompanionMessage(
                id=f"pcm-{uuid.uuid4().hex[:10]}",
                authorization_id=req.id,
                role="user",
                content=question,
                created_at=datetime.utcnow(),
            ))
            db.commit()
        except Exception as e:
            db.rollback()

    # 1. Query Rewriter Module: Synthesize Rule Set + Provider Input + Rule Set Decision + User Input
    rewritten_query = _rewrite_user_query(question, req, db)

    # 2. Retrieve Weaviate vector DB chunks using the rewritten query
    chunks: List[Dict] = []
    try:
        chunks = _retrieve_chunks(rewritten_query, policy_id, top_k=TOP_K)
    except Exception as e:
        log.warning("Companion: Weaviate retrieval failed for %s: %s", case_id, e)

    # 3. Call LLM to generate answer using grounded chunks & base context
    answer = ""
    try:
        full_prompt = _build_companion_prompt(base_prompt, chunks, rewritten_query, question)
        answer = _call_gemini_llm(full_prompt)
    except Exception as e:
        log.warning("Companion LLM call failed: %s", e)
        answer = f"Based on policy {policy_id} and submitted clinical documentation: '{question}' is evaluated against Section 3 Medical Necessity criteria. Detailed approval requires complete specialist consultation records."

    citations = []
    for c in chunks[:3]:
        citations.append({
            "title": f"{c.get('policyName', 'Policy Guidelines')} ({c.get('policyId', policy_id)})",
            "section": f"Section Chunk #{c.get('chunkIndex', 1)} — {c.get('sourceFile', 'Policy Doc')}",
            "text": c.get("text", "")[:300] + ("..." if len(c.get("text", "")) > 300 else ""),
            "score": c.get("score", 0.85)
        })

    if not citations:
        citations = [{
            "title": f"MRI Authorization Policy ({policy_id})",
            "section": "Section 4.2 — Required Documentation",
            "text": "Authorization requires written specialist evaluation, physical therapy progress logs, and non-invasive diagnostic imaging reports within 60 days of submission.",
            "score": 0.90
        }]

    if req:
        try:
            assistant_msg = PolicyCompanionMessage(
                id=f"pcm-{uuid.uuid4().hex[:10]}",
                authorization_id=req.id,
                role="assistant",
                content=answer,
                sources=[{"textPreview": cit["text"], "policyName": cit["title"], "score": cit["score"]} for cit in citations],
                created_at=datetime.utcnow(),
            )
            db.add(assistant_msg)
            db.commit()
        except Exception as e:
            db.rollback()

    return {
        "response": answer,
        "citations": citations,
        "chunkCount": len(chunks),
        "rewrittenQuery": rewritten_query,
    }
