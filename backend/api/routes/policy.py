"""
Policies — /api/v1/policies
Returns the exact Policy shape used by Policies.tsx and PolicyDetails.tsx,
including criteria, documentationRequired, denialCriteria, relatedCpts arrays.
"""
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from core.database import Policy, get_db

router = APIRouter()


def _ser(p: Policy) -> Dict[str, Any]:
    return {
        "id": p.id,
        "title": p.title,
        "version": p.version,
        "status": p.status,
        "effectiveDate": p.effective_date.isoformat() if p.effective_date else None,
        "lastUpdated": p.last_updated.isoformat() if p.last_updated else None,
        "description": p.description or "",
        "coverageType": p.coverage_type or "",
        # Detail arrays (PolicyDetails.tsx reads these)
        "criteria": p.criteria or [],
        "documentationRequired": p.documentation_required or [],
        "denialCriteria": p.denial_criteria or [],
        "relatedCpts": p.related_cpts or [],
    }


class PolicyQuery(BaseModel):
    query: str
    category: Optional[str] = None


@router.get("/")
def get_policies(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    coverage_type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(Policy)
    if status:
        q = q.filter(Policy.status == status)
    if coverage_type and coverage_type.lower() != "all":
        q = q.filter(Policy.coverage_type == coverage_type)
    if search:
        term = f"%{search}%"
        q = q.filter(Policy.title.ilike(term) | Policy.description.ilike(term))
    return [_ser(p) for p in q.order_by(Policy.title).all()]


@router.get("/{policy_id}")
def get_policy(policy_id: str, db: Session = Depends(get_db)):
    p = db.query(Policy).filter(Policy.id == policy_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Policy not found")
    return _ser(p)


@router.post("/query")
def query_policy(payload: PolicyQuery, db: Session = Depends(get_db)):
    term = f"%{payload.query}%"
    matched = db.query(Policy).filter(
        Policy.title.ilike(term) | Policy.description.ilike(term)
    ).all()

    if not matched:
        matched = db.query(Policy).filter(Policy.status == "Active").limit(3).all()

    rules = []
    for p in matched:
        for c in (p.criteria or []):
            rules.append(c)

    answer = (
        "Based on the policy database, the relevant criteria include: "
        + " | ".join(rules[:4]) + "."
        if rules
        else "Coverage criteria require documented clinical necessity per applicable plan policies."
    )

    return {
        "query": payload.query,
        "answer": answer,
        "matchedPolicies": [_ser(p) for p in matched[:3]],
    }
