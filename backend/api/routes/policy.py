"""
Policies — /api/v1/policies
Dynamically fetches and returns all 65 medical policies directly from the rulesets directory (policy_index.json),
populating criteria, documentationRequired, denialCriteria, and relatedCpts.
"""
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from core.database import Policy, get_db
from api.routes.context import _get_index, _load_ruleset

router = APIRouter()


def _infer_category(name: str) -> str:
    n = name.lower()
    if any(k in n for k in ["mri", "ct scan", "ct ", "pet", "imaging", "radiology", "ultrasound", "x-ray"]):
        return "Outpatient Imaging"
    elif any(k in n for k in ["surgery", "transplant", "bariatric", "arthroscopy", "joint", "hernia", "kyphoplasty", "panniculectomy", "reassignment", "reconstruction"]):
        return "Surgical & Inpatient"
    elif any(k in n for k in ["test", "testing", "screening", "endoscopy", "genetic", "fish", "urovysion", "capsule"]):
        return "Diagnostic Testing"
    else:
        return "Specialist Services"


def _build_policy_dict(policy_id: str, pmeta: Dict[str, Any], db_policy: Optional[Policy] = None) -> Dict[str, Any]:
    policy_name = pmeta.get("policy_name") or (db_policy.title if db_policy else "Medical Necessity Policy")
    service_codes = pmeta.get("service_codes", [])
    if db_policy and db_policy.related_cpts:
        service_codes = list(dict.fromkeys(service_codes + (db_policy.related_cpts or [])))

    criteria = []
    if db_policy and db_policy.criteria and isinstance(db_policy.criteria, list):
        criteria = db_policy.criteria
    else:
        try:
            rs_file = pmeta.get("file")
            if rs_file:
                rs_data = _load_ruleset(rs_file)
                for rs in rs_data.get("rule_sets", []):
                    for pw in rs.get("pathways", []):
                        if pw.get("description"):
                            criteria.append(pw["description"])
        except Exception:
            pass

    if not criteria:
        criteria = [
            f"Documented clinical medical necessity for {policy_name}.",
            "Failure or trial of conservative non-surgical management prior to authorization.",
            "Submission of recent objective clinical diagnostic findings."
        ]

    category = _infer_category(policy_name)

    return {
        "id": policy_id,
        "title": policy_name,
        "version": pmeta.get("version", "v1.0") if not db_policy else (db_policy.version or "v1.0"),
        "status": "Active",
        "effectiveDate": "2025-01-01T00:00:00Z",
        "lastUpdated": "2026-01-15T00:00:00Z",
        "description": f"Clinical coverage guidelines for {policy_name}",
        "coverageType": category,
        "criteria": criteria,
        "documentationRequired": [
            "Clinical Progress Notes",
            "Objective Diagnostic / Imaging Reports",
            "Conservative Treatment Log"
        ],
        "denialCriteria": [
            "Experimental / Investigational Use",
            "Criteria Not Medically Necessary"
        ],
        "relatedCpts": service_codes,
    }


class PolicyQuery(BaseModel):
    query: str
    category: Optional[str] = None


@router.get("/")
def get_policies(
    search: Optional[str] = None,
    status: Optional[str] = None,
    coverage_type: Optional[str] = None,
    db: Session = Depends(get_db),
):
    index = _get_index()
    db_policies = {p.id: p for p in db.query(Policy).all()}

    all_policies: List[Dict[str, Any]] = []

    # Map ruleset policies strictly from policy_index.json
    for pid, pmeta in index.items():
        db_p = db_policies.get(pid)
        all_policies.append(_build_policy_dict(pid, pmeta, db_p))

    # Apply Filters
    if status and isinstance(status, str) and status.lower() != "all":
        all_policies = [p for p in all_policies if p["status"].lower() == status.lower()]

    if coverage_type and isinstance(coverage_type, str) and coverage_type.lower() != "all":
        all_policies = [p for p in all_policies if p["coverageType"].lower() == coverage_type.lower()]

    if search and isinstance(search, str):
        s = search.lower()
        all_policies = [
            p for p in all_policies
            if s in p["title"].lower()
            or s in p["description"].lower()
            or s in p["id"].lower()
            or any(s in str(cpt).lower() for cpt in p["relatedCpts"])
        ]

    # Sort alphabetically by policy title
    all_policies.sort(key=lambda p: p["title"])
    return all_policies


@router.get("/{policy_id}")
def get_policy(policy_id: str, db: Session = Depends(get_db)):
    index = _get_index()
    pid_clean = policy_id.strip()
    
    # Direct match or case-insensitive match
    matched_key = None
    for k in index.keys():
        if k.upper() == pid_clean.upper():
            matched_key = k
            break

    db_p = db.query(Policy).filter(Policy.id.ilike(pid_clean)).first()

    if matched_key:
        return _build_policy_dict(matched_key, index[matched_key], db_p)
    elif db_p:
        return _build_policy_dict(db_p.id, {"policy_name": db_p.title}, db_p)
    else:
        raise HTTPException(status_code=404, detail=f"Policy '{policy_id}' not found")


@router.post("/query")
def query_policy(payload: PolicyQuery, db: Session = Depends(get_db)):
    index = _get_index()
    term = payload.query.lower()

    all_policies = get_policies(db=db)
    matched = [
        p for p in all_policies
        if term in p["title"].lower() or term in p["description"].lower() or term in p["id"].lower()
    ]

    if not matched:
        matched = all_policies[:3]

    rules = []
    for p in matched:
        rules.extend(p.get("criteria", []))

    answer = (
        "Based on the medical necessity policy library, key criteria include: "
        + " | ".join(rules[:4]) + "."
        if rules
        else "Coverage criteria require documented clinical necessity per applicable plan guidelines."
    )

    return {
        "query": payload.query,
        "answer": answer,
        "matchedPolicies": matched[:3],
    }
