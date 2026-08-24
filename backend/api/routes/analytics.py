"""
Analytics — /api/v1/analytics
Returns live metrics computed from the DB.
Shapes match what Analytics.tsx and the Dashboard pages consume.
"""
from datetime import datetime, timedelta
from typing import Any, Dict

from fastapi import APIRouter, Depends
from sqlalchemy import func, case
from sqlalchemy.orm import Session

from core.database import AuditLog, AuthorizationRequest, Document, get_db

router = APIRouter()

_MONTH = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]


@router.get("/kpis")
def get_kpis(db: Session = Depends(get_db)) -> Dict[str, Any]:
    total = db.query(func.count(AuthorizationRequest.id)).scalar() or 0

    status_rows = (
        db.query(AuthorizationRequest.status, func.count(AuthorizationRequest.id))
        .group_by(AuthorizationRequest.status)
        .all()
    )
    sc: Dict[str, int] = {r[0]: r[1] for r in status_rows}

    approved  = sc.get("Approved", 0)
    rejected  = sc.get("Rejected", 0) + sc.get("Denied", 0) + sc.get("Not Approved", 0)
    pending   = sc.get("Pending Review", 0) + sc.get("Nurse Review Required", 0)
    review    = sc.get("Under Review", 0)
    more_info = sc.get("More Information Required", 0)

    approval_rate = round(approved / total * 100, 1) if total else 0.0
    denial_rate   = round(rejected / total * 100, 1) if total else 0.0
    pending_rate  = round((pending + review + more_info) / total * 100, 1) if total else 0.0

    # Calculate AI accuracy from requests with decision submitted
    decided_reqs = db.query(AuthorizationRequest).filter(
        AuthorizationRequest.ai_recommendation.isnot(None),
        AuthorizationRequest.status.in_(["Approved", "Denied", "Rejected", "Not Approved", "More Information Required"])
    ).all()

    ai_total = len(decided_reqs)
    ai_correct = 0
    overrides = 0

    for r in decided_reqs:
        ai_dec = (r.ai_recommendation or {}).get("decision", "")
        status_map = {"Approve": "Approved", "Deny": "Not Approved", "Request More Info": "More Information Required"}
        expected_status = status_map.get(ai_dec, ai_dec)
        if expected_status == r.status or (r.status in ["Denied", "Rejected", "Not Approved"] and expected_status in ["Denied", "Rejected", "Not Approved"]):
            ai_correct += 1
        else:
            overrides += 1

    ai_accuracy = round(ai_correct / ai_total * 100, 1) if ai_total else 0.0
    human_agreement = round(ai_correct / ai_total * 100, 1) if ai_total else 0.0
    override_rate = round(overrides / ai_total * 100, 1) if ai_total else 0.0

    # Confidence calculation
    all_reqs_with_ai = db.query(AuthorizationRequest).filter(
        AuthorizationRequest.ai_recommendation.isnot(None)
    ).all()
    avg_conf = 0.0
    conf_count = 0
    for r in all_reqs_with_ai:
        c_val = (r.ai_recommendation or {}).get("confidence")
        if c_val is not None:
            avg_conf += float(c_val)
            conf_count += 1
    avg_confidence = round(avg_conf / conf_count, 1) if conf_count else 0.0

    # Calculate actual average review time in hours from AuditLog
    decision_logs = db.query(AuditLog).filter(
        AuditLog.action.ilike("%Decision%")
    ).all()

    total_review_hours = 0.0
    reviewed_cases_count = 0

    for log in decision_logs:
        if log.authorization_id and log.timestamp:
            req = db.query(AuthorizationRequest).filter(AuthorizationRequest.id == log.authorization_id).first()
            if req and req.submitted_at and log.timestamp > req.submitted_at:
                diff_hours = (log.timestamp - req.submitted_at).total_seconds() / 3600.0
                total_review_hours += diff_hours
                reviewed_cases_count += 1

    avg_review_time = round(total_review_hours / reviewed_cases_count, 1) if reviewed_cases_count else 0.0

    now = datetime.utcnow()
    first_this = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    first_last = (first_this - timedelta(days=1)).replace(day=1)
    this_month = db.query(func.count(AuthorizationRequest.id)).filter(
        AuthorizationRequest.submitted_at >= first_this
    ).scalar() or 0
    last_month = db.query(func.count(AuthorizationRequest.id)).filter(
        AuthorizationRequest.submitted_at >= first_last,
        AuthorizationRequest.submitted_at < first_this,
    ).scalar() or 0

    return {
        "totalCasesYTD": total,
        "approvalRate": approval_rate,
        "denialRate": denial_rate,
        "pendingRate": pending_rate,
        "approvedCount": approved,
        "deniedCount": rejected,
        "pendingCount": pending + review + more_info,
        "moreInfoCount": more_info,
        "casesThisMonth": this_month,
        "casesLastMonth": last_month,
        "aiAccuracy": ai_accuracy,
        "avgConfidence": avg_confidence,
        "humanAIAgreement": human_agreement,
        "overrideRate": override_rate,
        "averageReviewTime": avg_review_time,
    }


@router.get("/trends")
def get_trends(db: Session = Depends(get_db)):
    now = datetime.utcnow()
    monthly = []
    for i in range(5, -1, -1):
        d = (now.replace(day=1) - timedelta(days=i * 28)).replace(day=1)
        year, month = d.year, d.month
        if month == 12:
            end = datetime(year + 1, 1, 1)
        else:
            end = datetime(year, month + 1, 1)

        submitted = db.query(func.count(AuthorizationRequest.id)).filter(
            AuthorizationRequest.submitted_at >= d,
            AuthorizationRequest.submitted_at < end,
        ).scalar() or 0

        status_rows = (
            db.query(AuthorizationRequest.status, func.count(AuthorizationRequest.id))
            .filter(
                AuthorizationRequest.submitted_at >= d,
                AuthorizationRequest.submitted_at < end,
            )
            .group_by(AuthorizationRequest.status)
            .all()
        )
        sm = {r[0]: r[1] for r in status_rows}
        approved = sm.get("Approved", 0)
        denied   = sm.get("Rejected", 0) + sm.get("Denied", 0) + sm.get("Not Approved", 0)

        monthly.append({
            "month": _MONTH[month - 1],
            "submitted": submitted,
            "approved": approved,
            "denied": denied,
            "pending": max(submitted - approved - denied, 0),
            "requests": submitted,
            "approvals": approved,
        })

    return {"monthlyData": monthly, "monthlyRequests": monthly}


@router.get("/by-service")
def get_by_service(db: Session = Depends(get_db)):
    """Group requests by first procedure description (used as service label)."""
    all_reqs = db.query(AuthorizationRequest).all()

    service_map: Dict[str, Dict] = {}
    for r in all_reqs:
        procs = r.procedures or []
        svc = procs[0].get("description", "Other") if procs else "Other"
        label = " ".join(svc.split()[:3]) if svc else "Other"
        if label not in service_map:
            service_map[label] = {"count": 0, "approved": 0}
        service_map[label]["count"] += 1
        if r.status == "Approved":
            service_map[label]["approved"] += 1

    result = []
    for svc, data in sorted(service_map.items(), key=lambda x: -x[1]["count"]):
        total = data["count"]
        approved = data["approved"]
        result.append({
            "service": svc,
            "count": total,
            "requests": total,
            "rate": round(approved / total * 100, 1) if total else 0.0,
            "approvalRate": round(approved / total * 100, 1) if total else 0.0,
        })

    return result


@router.get("/ai-performance")
def get_ai_performance(db: Session = Depends(get_db)):
    decided_reqs = db.query(AuthorizationRequest).filter(
        AuthorizationRequest.ai_recommendation.isnot(None),
        AuthorizationRequest.status.in_(["Approved", "Denied", "Rejected", "Not Approved", "More Information Required"])
    ).all()

    total = len(decided_reqs)
    correct = 0
    overrides = 0
    total_conf = 0.0
    conf_n = 0

    all_ai = db.query(AuthorizationRequest).filter(
        AuthorizationRequest.ai_recommendation.isnot(None)
    ).all()

    for r in all_ai:
        ai = r.ai_recommendation or {}
        conf = ai.get("confidence")
        if conf is not None:
            total_conf += float(conf)
            conf_n += 1

    for r in decided_reqs:
        ai = r.ai_recommendation or {}
        ai_dec = ai.get("decision", "")
        status_map = {"Approve": "Approved", "Deny": "Not Approved", "Request More Info": "More Information Required"}
        expected_status = status_map.get(ai_dec, ai_dec)
        if expected_status == r.status or (r.status in ["Denied", "Rejected", "Not Approved"] and expected_status in ["Denied", "Rejected", "Not Approved"]):
            correct += 1
        else:
            overrides += 1

    accuracy   = round(correct / total * 100, 1) if total else 0.0
    avg_conf   = round(total_conf / conf_n, 1) if conf_n else 0.0
    agreement  = round(correct / total * 100, 1) if total else 0.0
    override   = round(overrides / total * 100, 1) if total else 0.0

    return {
        "accuracy": accuracy,
        "agreementRate": agreement,
        "overrideRate": override,
        "avgConfidence": avg_conf,
        "totalAiDecisions": total,
        "aiAccuracy": accuracy,
        "humanAIAgreement": agreement,
    }
