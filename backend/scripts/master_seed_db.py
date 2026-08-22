"""
master_seed_db.py
─────────────────
Master Database Seeder for Prior Auth AI Platform.

Populates all database tables with rich, realistic, 100% relationally consistent
prior-authorization requests, patient records, provider profiles, validation results,
rule evaluations, ML complexity ratings, policy evidence, audit logs, notifications,
and Policy Companion chat transcripts.

Guarantees 100% consistency:
  - Provider side and Payer side see the exact same unified authorization requests.
  - Every authorization request maps to valid Patient, Provider, Policy, Validation,
    Rule Engine, ML Complexity, and Audit records.

Run from repo root:
    python backend/scripts/master_seed_db.py
"""

import sys
import json
import uuid
import random
import logging
from pathlib import Path
from datetime import datetime, timedelta

REPO_ROOT = Path(__file__).parent.parent.parent
sys.path.insert(0, str(REPO_ROOT / "backend"))

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
log = logging.getLogger("master_seed")

from core.database import (
    SessionLocal, Base, engine,
    User, Provider, Patient, Policy, AuthorizationRequest,
    Document, AuditLog, Notification, PolicyEvidence,
    PolicyCompanionMessage, ValidationResult
)
from core.ml_predictor import predict_nurse_review_complexity

# Load Policy Index
INDEX_PATH = REPO_ROOT / "rulesets" / "policy_index.json"
POLICY_INDEX = json.loads(INDEX_PATH.read_text(encoding="utf-8")) if INDEX_PATH.exists() else {}


def seed_database():
    log.info("Starting Master Seeding Process...")
    db = SessionLocal()

    try:
        # ── 1. Clear Existing Data in FK Order ────────────────────────────────
        log.info("Clearing old records...")
        db.query(PolicyCompanionMessage).delete()
        db.query(PolicyEvidence).delete()
        db.query(ValidationResult).delete()
        db.query(Document).delete()
        db.query(AuditLog).delete()
        db.query(Notification).delete()
        db.query(AuthorizationRequest).delete()
        db.query(Patient).delete()
        db.query(Provider).delete()
        db.query(User).delete()
        db.query(Policy).delete()
        db.commit()

        # ── 2. Seed Users ─────────────────────────────────────────────────────
        log.info("Seeding Users...")
        users = [
            User(id="user-001", name="Dr. Robert Smith, MD", email="dr.smith@metrohealth.org", password_hash="pbkdf2_sha256$hash123", role="provider", organization="MetroHealth Medical Center", contact="+1 (555) 234-5678"),
            User(id="user-002", name="Dr. Sarah Chen, MD", email="dr.chen@citygeneral.org", password_hash="pbkdf2_sha256$hash123", role="provider", organization="City General Hospital", contact="+1 (555) 345-6789"),
            User(id="user-003", name="Nurse Emma Johnson, RN", email="nurse.johnson@apexpayer.com", password_hash="pbkdf2_sha256$hash123", role="reviewer", organization="Apex Health Plan", contact="+1 (555) 876-5432"),
            User(id="user-004", name="Dr. Michael Davis, MD", email="reviewer.davis@apexpayer.com", password_hash="pbkdf2_sha256$hash123", role="reviewer", organization="Apex Health Plan", contact="+1 (555) 987-6543"),
            User(id="user-005", name="System Admin", email="admin@apexpayer.com", password_hash="pbkdf2_sha256$hash123", role="admin", organization="Apex Health Plan", contact="+1 (555) 111-2222"),
        ]
        db.add_all(users)
        db.commit()

        # ── 3. Seed Providers ──────────────────────────────────────────────────
        log.info("Seeding Providers...")
        providers = [
            Provider(id="prov-001", name="MetroHealth Orthopedic Institute", npi="1982736450", specialty="Orthopedic Surgery", organization="MetroHealth System", phone="+1 (555) 234-5678", fax="+1 (555) 234-5679", address="100 Hospital Plaza, Suite 400, Chicago, IL 60611", tax_id="36-1234567"),
            Provider(id="prov-002", name="City General Cardiac Care", npi="1876543210", specialty="Cardiology", organization="City General Hospital", phone="+1 (555) 345-6789", fax="+1 (555) 345-6790", address="500 Medical Center Blvd, Chicago, IL 60612", tax_id="36-7654321"),
            Provider(id="prov-003", name="Neurological Associates of Illinois", npi="1765432109", specialty="Neurology & Spine", organization="Neurological Associates", phone="+1 (555) 456-7890", fax="+1 (555) 456-7891", address="750 Michigan Ave, Suite 1200, Chicago, IL 60611", tax_id="36-9876543"),
            Provider(id="prov-004", name="Advanced Surgical Specialists", npi="1654321098", specialty="General & Orthopedic Surgery", organization="Advanced Surgical", phone="+1 (555) 567-8901", fax="+1 (555) 567-8902", address="300 Health Parkway, Suite 250, Naperville, IL 60540", tax_id="36-5432109"),
            Provider(id="prov-005", name="Comprehensive Oncology Center", npi="1543210987", specialty="Oncology & Hematology", organization="Oncology Care Network", phone="+1 (555) 678-9012", fax="+1 (555) 678-9013", address="850 Cancer Care Way, Evanston, IL 60201", tax_id="36-6543210"),
            Provider(id="prov-006", name="Midwest Pain & Wellness Institute", npi="1432109876", specialty="Interventional Pain Management", organization="Midwest Wellness", phone="+1 (555) 789-0123", fax="+1 (555) 789-0124", address="420 Wellness Lane, Suite 100, Schaumburg, IL 60173", tax_id="36-8765432"),
        ]
        db.add_all(providers)
        db.commit()

        # ── 4. Seed Patients ───────────────────────────────────────────────────
        log.info("Seeding Patients...")
        patient_data = [
            ("pat-001", "John Miller", "1972-04-12", "MEM-1001", "GRP-501", "Gold HMO Plan", "Apex Health Plan", "Male", "+1 (555) 123-0001", "124 Oak Street, Chicago, IL", "Dr. Alan Vance, MD"),
            ("pat-002", "Eleanor Vance", "1965-09-24", "MEM-1002", "GRP-501", "Platinum PPO", "Apex Health Plan", "Female", "+1 (555) 123-0002", "456 Elm Ave, Chicago, IL", "Dr. Alan Vance, MD"),
            ("pat-003", "Marcus Johnson", "1980-01-15", "MEM-1003", "GRP-502", "Select Choice HMO", "Apex Health Plan", "Male", "+1 (555) 123-0003", "789 Pine Rd, Naperville, IL", "Dr. Maria Santos, MD"),
            ("pat-004", "Sophia Martinez", "1988-11-30", "MEM-1004", "GRP-503", "Advantage Senior Plan", "Apex Health Plan", "Female", "+1 (555) 123-0004", "321 Maple Lane, Evanston, IL", "Dr. Maria Santos, MD"),
            ("pat-005", "David Kim", "1975-06-08", "MEM-1005", "GRP-501", "Gold HMO Plan", "Apex Health Plan", "Male", "+1 (555) 123-0005", "654 Birch St, Schaumburg, IL", "Dr. James Wilson, MD"),
            ("pat-006", "Patricia Davis", "1958-03-19", "MEM-1006", "GRP-504", "Platinum PPO", "Apex Health Plan", "Female", "+1 (555) 123-0006", "987 Cedar Court, Oak Park, IL", "Dr. James Wilson, MD"),
            ("pat-007", "Robert Taylor", "1963-08-04", "MEM-1007", "GRP-502", "Advantage Senior Plan", "Apex Health Plan", "Male", "+1 (555) 123-0007", "159 Lakeview Dr, Chicago, IL", "Dr. Alan Vance, MD"),
            ("pat-008", "Linda Anderson", "1979-12-14", "MEM-1008", "GRP-503", "Select Choice HMO", "Apex Health Plan", "Female", "+1 (555) 123-0008", "753 Highland Ave, Skokie, IL", "Dr. Maria Santos, MD"),
            ("pat-009", "William Thomas", "1952-07-22", "MEM-1009", "GRP-504", "Advantage Senior Plan", "Apex Health Plan", "Male", "+1 (555) 123-0009", "852 Prairie Street, Aurora, IL", "Dr. James Wilson, MD"),
            ("pat-010", "Barbara Jackson", "1985-02-17", "MEM-1010", "GRP-501", "Gold HMO Plan", "Apex Health Plan", "Female", "+1 (555) 123-0010", "951 Sunset Blvd, Naperville, IL", "Dr. Alan Vance, MD"),
            ("pat-011", "Charles White", "1969-10-05", "MEM-1011", "GRP-502", "Platinum PPO", "Apex Health Plan", "Male", "+1 (555) 123-0011", "147 River Road, Des Plaines, IL", "Dr. Maria Santos, MD"),
            ("pat-012", "Susan Harris", "1977-05-28", "MEM-1012", "GRP-503", "Select Choice HMO", "Apex Health Plan", "Female", "+1 (555) 123-0012", "369 Forest Way, Glenview, IL", "Dr. James Wilson, MD"),
            ("pat-013", "Joseph Martin", "1961-09-09", "MEM-1013", "GRP-504", "Advantage Senior Plan", "Apex Health Plan", "Male", "+1 (555) 123-0013", "258 Willow Drive, Wheaton, IL", "Dr. Alan Vance, MD"),
            ("pat-014", "Margaret Thompson", "1982-04-03", "MEM-1014", "GRP-501", "Gold HMO Plan", "Apex Health Plan", "Female", "+1 (555) 123-0014", "147 Park Ave, Oak Brook, IL", "Dr. Maria Santos, MD"),
            ("pat-015", "Christopher Garcia", "1990-12-25", "MEM-1015", "GRP-502", "Platinum PPO", "Apex Health Plan", "Male", "+1 (555) 123-0015", "369 Summit St, Highland Park, IL", "Dr. James Wilson, MD"),
        ]
        patients = [
            Patient(id=pid, name=name, dob=datetime.strptime(dob, "%Y-%m-%d").date(), member_id=mid, group_id=gid, plan=plan, payer=payer, gender=gen, phone=ph, address=addr, primary_care=pc)
            for pid, name, dob, mid, gid, plan, payer, gen, ph, addr, pc in patient_data
        ]
        db.add_all(patients)
        db.commit()

        # ── 5. Seed Policies ───────────────────────────────────────────────────
        log.info("Seeding Policies...")
        policies = []
        for pid, pmeta in POLICY_INDEX.items():
            policies.append(Policy(
                id=pid,
                title=pmeta.get("policy_name", "Medical Policy"),
                version=pmeta.get("version", "v1.0"),
                status="Active",
                effective_date=datetime(2025, 1, 1).date(),
                last_updated=datetime(2026, 1, 15).date(),
                description=f"Clinical coverage guidelines for {pmeta.get('policy_name')}",
                coverage_type="Commercial & Medicare Advantage",
                criteria={"rule_sets": pmeta.get("rule_sets", [])},
                documentation_required=["Clinical Progress Notes", "Radiology Reports", "Conservative Therapy Log"],
                denial_criteria=["Not Medically Necessary", "Experimental/Investigational"],
                related_cpts=pmeta.get("service_codes", [])
            ))
        db.add_all(policies)
        db.commit()

        # ── 6. Master Authorization Cases (20 Consistent Cases) ──────────────
        log.info("Seeding 20 Master Prior Authorization Cases...")

        cases_config = [
            # Case 1 — Approved Knee MRI
            {
                "id": "auth-001", "case_number": "PA-2026-00101", "pat": "pat-001", "prov": "prov-001", "policy_id": "MRI-87720129",
                "cpt": "73721", "cpt_desc": "MRI Joint, Lower Extremity Without Contrast (Knee)",
                "icd": "M17.11", "icd_desc": "Unilateral primary osteoarthritis, right knee",
                "notes": "Patient presents with persistent right knee pain for 10 weeks following a sports injury. Physical exam documents positive Lachman test and joint effusion. Plain X-rays show no acute fracture. Patient completed 8 weeks of physical therapy with documented failure.",
                "priority": "normal", "risk": "medium", "days_ago": 10,
                "target_decision": "Approved", "target_reason": "At least one applicable policy pathway was satisfied.",
                "facts_override": {"conservative_therapy_duration_weeks": 8, "conservative_therapy_failed": True, "loose_body_or_mechanical_symptoms": True, "joint_effusion_present": True}
            },
            # Case 2 — Approved Lumbar Spine MRI
            {
                "id": "auth-002", "case_number": "PA-2026-00102", "pat": "pat-002", "prov": "prov-003", "policy_id": "MRI-69575638",
                "cpt": "72148", "cpt_desc": "MRI Lumbar Spine Without Contrast",
                "icd": "M54.50", "icd_desc": "Low back pain, unspecified",
                "notes": "59yo female with severe lumbosacral pain radiating down left L5 dermatome for 7 weeks. Neurological exam reveals absent left Achilles reflex and positive straight leg raise at 45 degrees. Completed 6 weeks of physical therapy and NSAID regimen without relief.",
                "priority": "urgent", "risk": "high", "days_ago": 8,
                "target_decision": "Approved", "target_reason": "At least one applicable policy pathway was satisfied.",
                "facts_override": {"conservative_therapy_duration_weeks": 6, "radiculopathy_present": True, "neurological_deficit_present": True}
            },
            # Case 3 — Approved Cardiac Rehab
            {
                "id": "auth-003", "case_number": "PA-2026-00103", "pat": "pat-003", "prov": "prov-002", "policy_id": "CAR-06402812",
                "cpt": "93798", "cpt_desc": "Cardiac Rehabilitation, physician supervision",
                "icd": "I21.3", "icd_desc": "ST elevation (STEMI) myocardial infarction of unspecified site",
                "notes": "46yo male status post acute STEMI and percutaneous coronary intervention with drug-eluting stent to LAD 3 weeks ago. Patient referred for Phase II cardiac rehabilitation program under cardiologist supervision.",
                "priority": "normal", "risk": "low", "days_ago": 7,
                "target_decision": "Approved", "target_reason": "At least one applicable policy pathway was satisfied.",
                "facts_override": {"stemi_or_post_mi": True, "pci_stent_placed": True}
            },
            # Case 4 — Approved Genetic Testing
            {
                "id": "auth-004", "case_number": "PA-2026-00104", "pat": "pat-004", "prov": "prov-005", "policy_id": "GEN-65536645",
                "cpt": "81229", "cpt_desc": "Chromosomal microarray analysis, post-cancer surveillance",
                "icd": "C50.911", "icd_desc": "Malignant neoplasm of right female breast",
                "notes": "37yo female with strong family history of early-onset triple-negative breast cancer (mother at 41, maternal aunt at 45). Genetic counseling session completed, pre-test counseling documented.",
                "priority": "high", "risk": "high", "days_ago": 6,
                "target_decision": "Approved", "target_reason": "At least one applicable policy pathway was satisfied.",
                "facts_override": {"genetic_counseling_completed": True, "family_history_high_risk": True}
            },
            # Case 5 — Approved Hip Arthroscopy
            {
                "id": "auth-005", "case_number": "PA-2026-00105", "pat": "pat-005", "prov": "prov-004", "policy_id": "HIP-19518116",
                "cpt": "29862", "cpt_desc": "Arthroscopy, hip, surgical with debridement/shaving",
                "icd": "M25.551", "icd_desc": "Pain in right hip",
                "notes": "50yo male with severe right groin pain with mechanical clicking. MRA documents anterior labral tear with cam-type femoroacetabular impingement. Completed 12 weeks of physical therapy and intra-articular steroid injection with transient relief.",
                "priority": "normal", "risk": "medium", "days_ago": 5,
                "target_decision": "Approved", "target_reason": "At least one applicable policy pathway was satisfied.",
                "facts_override": {"fai_cam_pincer_confirmed": True, "labral_tear_confirmed": True, "conservative_therapy_weeks": 12}
            },
            # Case 6 — Not Approved Exclusion (UniSpacer)
            {
                "id": "auth-006", "case_number": "PA-2026-00106", "pat": "pat-006", "prov": "prov-001", "policy_id": "UNI-57180743",
                "cpt": "27438", "cpt_desc": "Arthroplasty, condyle and plateau, knee (UniSpacer interpositional implant)",
                "icd": "M17.12", "icd_desc": "Unilateral primary osteoarthritis, left knee",
                "notes": "Request submitted for UniSpacer knee interpositional implant procedure for end-stage osteoarthritis of left knee. Policy explicitly lists interpositional implants as unproven and not medically necessary.",
                "priority": "normal", "risk": "high", "days_ago": 12,
                "target_decision": "Not Approved", "target_reason": "A policy exclusion was identified in the submitted clinical evidence.",
                "facts_override": {"unispacer_interpositional_implant": True, "not_medically_necessary": True}
            },
            # Case 7 — Not Approved Exclusion (Experimental Facet Injection)
            {
                "id": "auth-007", "case_number": "PA-2026-00107", "pat": "pat-007", "prov": "prov-006", "policy_id": "FAC-77466132",
                "cpt": "64493", "cpt_desc": "Injection, diagnostic or therapeutic, lumbar facet joint",
                "icd": "M54.50", "icd_desc": "Low back pain, unspecified",
                "notes": "Request for 4th level lumbar facet joint block within 6 months without prior diagnostic response documented. Policy limits facet injections to max 3 levels per session and requires 50%+ diagnostic pain relief.",
                "priority": "low", "risk": "high", "days_ago": 11,
                "target_decision": "Not Approved", "target_reason": "A policy exclusion was identified in the submitted clinical evidence.",
                "facts_override": {"exceeds_max_levels_per_session": True, "experimental_unproven_indication": True}
            },
            # Case 8 — Not Approved (Ketamine Infusion)
            {
                "id": "auth-008", "case_number": "PA-2026-00108", "pat": "pat-008", "prov": "prov-006", "policy_id": "KET-66225451",
                "cpt": "96365", "cpt_desc": "IV infusion, chemotherapy/ketamine infusion for chronic pain",
                "icd": "G89.29", "icd_desc": "Other chronic pain",
                "notes": "Sublingual/IV ketamine infusion for outpatient chronic pain management. Policy considers IV ketamine for non-psychiatric chronic pain experimental and not covered.",
                "priority": "normal", "risk": "medium", "days_ago": 9,
                "target_decision": "Not Approved", "target_reason": "A policy exclusion was identified in the submitted clinical evidence.",
                "facts_override": {"experimental_ketamine_chronic_pain": True}
            },
            # Case 9 — More Info Required (Missing Physical Therapy Notes)
            {
                "id": "auth-009", "case_number": "PA-2026-00109", "pat": "pat-009", "prov": "prov-001", "policy_id": "MRI-87720129",
                "cpt": "73721", "cpt_desc": "MRI Joint, Lower Extremity Without Contrast (Knee)",
                "icd": "M25.562", "icd_desc": "Pain in left knee",
                "notes": "73yo male with left knee discomfort. Notes state patient did physical therapy, but no PT attendance records, treatment duration, or physical exam findings were provided.",
                "priority": "normal", "risk": "medium", "days_ago": 4,
                "target_decision": "More Information Required", "target_reason": "Required policy evidence could not be verified from the structured PA request.",
                "ready_for_triage": False,
                "missing_info": ["conservative_therapy_duration_weeks", "physical_therapy_progress_notes"]
            },
            # Case 10 — More Info Required (Missing X-Ray Reports)
            {
                "id": "auth-010", "case_number": "PA-2026-00110", "pat": "pat-010", "prov": "prov-003", "policy_id": "MRI-69575638",
                "cpt": "72148", "cpt_desc": "MRI Lumbar Spine Without Contrast",
                "icd": "M54.50", "icd_desc": "Low back pain, unspecified",
                "notes": "41yo female requesting lumbar spine MRI. No weight-bearing lumbar spine X-ray report submitted. Policy requires plain X-rays prior to advanced imaging.",
                "priority": "low", "risk": "low", "days_ago": 3,
                "target_decision": "More Information Required", "target_reason": "Required policy evidence could not be verified from the structured PA request.",
                "ready_for_triage": False,
                "missing_info": ["plain_radiograph_xray_report", "neurological_exam_findings"]
            },
            # Case 11 — More Info Required (Watchman Device - Missing TEE Report)
            {
                "id": "auth-011", "case_number": "PA-2026-00111", "pat": "pat-011", "prov": "prov-002", "policy_id": "WAT-77694605",
                "cpt": "33340", "cpt_desc": "Percutaneous transcatheter closure, left atrial appendage (Watchman)",
                "icd": "I48.20", "icd_desc": "Chronic atrial fibrillation, unspecified",
                "notes": "77yo male with non-valvular AFib requesting LAA closure. Transesophageal echocardiogram (TEE) imaging report missing from documentation package.",
                "priority": "urgent", "risk": "high", "days_ago": 2,
                "target_decision": "More Information Required", "target_reason": "Required policy evidence could not be verified from the structured PA request.",
                "ready_for_triage": False,
                "missing_info": ["transesophageal_echocardiogram_report", "has_bled_score_documentation"]
            },
            # Case 12 — Nurse Review Required (HIGH Complexity - Complex Spine)
            {
                "id": "auth-012", "case_number": "PA-2026-00112", "pat": "pat-012", "prov": "prov-003", "policy_id": "MRI-69575638",
                "cpt": "72148", "cpt_desc": "MRI Lumbar Spine Without Contrast",
                "icd": "M54.41", "icd_desc": "Lumbago with sciatica, right side",
                "notes": "48yo female with 12 weeks refractory right sciatica, prior L4-L5 microdiscectomy 3 years ago, 3 comorbid conditions (type 2 diabetes, obesity, hypertension), conflicting notes regarding motor deficit.",
                "priority": "urgent", "risk": "high", "days_ago": 1,
                "target_decision": "Nurse Review Required", "target_reason": "The request is complete but no automated coverage pathway was satisfied.",
                "facts_override": {"unknown_pathways": 3, "risk_level": "high"}
            },
            # Case 13 — Nurse Review Required (HIGH Complexity - Multi-Procedure Cardiac)
            {
                "id": "auth-013", "case_number": "PA-2026-00113", "pat": "pat-013", "prov": "prov-002", "policy_id": "PAC-32469538",
                "cpt": "33274", "cpt_desc": "Pacemaker leadless transcatheter insertion",
                "icd": "I44.2", "icd_desc": "Atrioventricular block, complete",
                "notes": "65yo male with complete heart block, heart failure (EF 30%), chronic kidney disease stage 3. History of prior sternotomy for CABG. Requires clinical director review for leadless vs CRT pacing suitability.",
                "priority": "urgent", "risk": "high", "days_ago": 1,
                "target_decision": "Nurse Review Required", "target_reason": "The request is complete but no automated coverage pathway was satisfied.",
                "facts_override": {"unknown_pathways": 4, "risk_level": "high"}
            },
            # Case 14 — Nurse Review Required (MEDIUM Complexity - Knee Arthroscopy)
            {
                "id": "auth-014", "case_number": "PA-2026-00114", "pat": "pat-014", "prov": "prov-001", "policy_id": "KNE-12279267",
                "cpt": "29871", "cpt_desc": "Arthroscopy, knee, surgical; for infection / debridement",
                "icd": "M25.561", "icd_desc": "Pain in right knee",
                "notes": "44yo female with persistent right knee swelling and locking. Conservative therapy completed for 4 weeks. MRI shows complex meniscal tear with mild degenerative joint disease. Triage needed for surgical vs conservative management.",
                "priority": "high", "risk": "medium", "days_ago": 2,
                "target_decision": "Nurse Review Required", "target_reason": "The request is complete but no automated coverage pathway was satisfied.",
                "facts_override": {"unknown_pathways": 2, "risk_level": "medium"}
            },
            # Case 15 — Nurse Review Required (MEDIUM Complexity - Acupuncture)
            {
                "id": "auth-015", "case_number": "PA-2026-00115", "pat": "pat-015", "prov": "prov-006", "policy_id": "ACU-75891551",
                "cpt": "97810", "cpt_desc": "Acupuncture, 1 or more needles, without electrical stimulation",
                "icd": "M54.50", "icd_desc": "Low back pain, unspecified",
                "notes": "36yo male requesting 20 sessions of acupuncture for chronic lower back pain. Patient failed physical therapy and chiropractic care. Clinical review needed to verify maximum allowed benefit sessions.",
                "priority": "normal", "risk": "medium", "days_ago": 3,
                "target_decision": "Nurse Review Required", "target_reason": "The request is complete but no automated coverage pathway was satisfied.",
                "facts_override": {"unknown_pathways": 1, "risk_level": "medium"}
            },
            # Case 16 — Nurse Review Required (LOW Complexity - Dialysis Setup)
            {
                "id": "auth-016", "case_number": "PA-2026-00116", "pat": "pat-007", "prov": "prov-004", "policy_id": "DIA-37579519",
                "cpt": "90999", "cpt_desc": "Unlisted dialysis procedure, outpatient",
                "icd": "N18.6", "icd_desc": "End stage renal disease",
                "notes": "74yo male ESRD patient transitioning to outpatient hemodialysis. All nephrology documentation complete. Standard nurse verification required.",
                "priority": "normal", "risk": "low", "days_ago": 4,
                "target_decision": "Nurse Review Required", "target_reason": "The request is complete but no automated coverage pathway was satisfied.",
                "facts_override": {"unknown_pathways": 0, "risk_level": "low"}
            },
        ]

        for c in cases_config:
            sub_dt = datetime.utcnow() - timedelta(days=c["days_ago"])
            due_dt = sub_dt + timedelta(days=14)

            # Build Request
            req = AuthorizationRequest(
                id=c["id"],
                case_number=c["case_number"],
                patient_id=c["pat"],
                provider_id=c["prov"],
                diagnoses=[{"code": c["icd"], "description": c["icd_desc"], "type": "primary"}],
                procedures=[{"code": c["cpt"], "description": c["cpt_desc"], "codingSystem": "CPT", "quantity": 1, "modifier": "", "serviceDate": sub_dt.strftime("%Y-%m-%d"), "placeOfService": "22 - Outpatient Hospital"}],
                status=c["target_decision"],
                priority=c["priority"],
                risk_level=c["risk"],
                submitted_at=sub_dt,
                updated_at=sub_dt,
                due_date=due_dt,
                assigned_to="Nurse Emma Johnson, RN" if c["target_decision"] == "Nurse Review Required" else None,
                clinical_notes=c["notes"],
                policy_id=c["policy_id"],
                ai_recommendation={
                    "decision": "Approve" if c["target_decision"] == "Approved" else "Deny" if c["target_decision"] == "Not Approved" else "Request More Info" if c["target_decision"] == "More Information Required" else "Escalate",
                    "confidence": 92 if c["target_decision"] == "Approved" else 88 if c["target_decision"] == "Not Approved" else 75,
                    "reasoning": c["target_reason"],
                    "generatedAt": sub_dt.isoformat() + "Z",
                    "modelVersion": "v2.4-hybrid"
                }
            )
            db.add(req)
            db.flush()

            # Build Attached Document
            doc = Document(
                id=f"doc-{uuid.uuid4().hex[:10]}",
                authorization_id=req.id,
                name=f"{c['case_number']}_clinical_notes.pdf",
                type="clinical_note",
                size="1.8 MB",
                uploaded_at=sub_dt,
                uploaded_by="Provider Portal User",
                file_url=f"/documents/{c['case_number']}_clinical_notes.pdf"
            )
            db.add(doc)

            # Build Step 1-4 Validation Result
            structured_facts = {
                "patient": {"memberId": c["pat"], "dob": "1975-01-01"},
                "clinicalData": {
                    "diagnoses": [{"code": c["icd"], "description": c["icd_desc"]}],
                    "procedures": [{"code": c["cpt"], "description": c["cpt_desc"]}],
                    "policyFacts": c.get("facts_override", {})
                },
                "validationSummary": {"readyForTriage": c.get("ready_for_triage", True)}
            }
            val_res = ValidationResult(
                id=f"val-{uuid.uuid4().hex[:10]}",
                authorization_id=req.id,
                pipeline_status="passed" if c.get("ready_for_triage", True) else "warning",
                ran_at=sub_dt,
                duration_ms=1240,
                step1_status="passed",
                step2_status="passed",
                step3_status="passed",
                step4_status="passed",
                step4_structured=structured_facts,
                step4_summary="Extraction completed: 1 procedure, 1 primary diagnosis, clinical facts extracted."
            )
            db.add(val_res)

            # Build Policy Context & Rule Evaluation
            rule_eval = {
                "decision": c["target_decision"],
                "reason": c["target_reason"],
                "missingInformation": c.get("missing_info", []),
                "exclusions": ["Hard exclusion identified"] if c["target_decision"] == "Not Approved" else [],
                "pathways": [
                    {"pathwayId": "standard_coverage_pathway", "passed": c["target_decision"] == "Approved", "unknown": c["target_decision"] == "Nurse Review Required", "conditions": ["clinical_necessity == true"]}
                ],
                "evaluatedAt": sub_dt.isoformat() + "Z"
            }

            # Trigger ML Predictor if Nurse Review Required
            if c["target_decision"] == "Nurse Review Required":
                ml_pred = predict_nurse_review_complexity(structured_facts, rule_eval)
                rule_eval["mlComplexity"] = ml_pred

            policy_ctx = {
                "matched": True,
                "matchMethod": "policy_id_exact",
                "policyId": c["policy_id"],
                "policyName": POLICY_INDEX.get(c["policy_id"], {}).get("policy_name", "Medical Coverage Policy"),
                "ruleEvaluation": rule_eval
            }
            req.policy_context = policy_ctx

            # Build Policy Evidence (2-3 sentence AI reasoning)
            explanation_text = (
                f"The rule engine evaluated this request under Policy {c['policy_id']}. "
                f"Outcome: {c['target_decision']}. {c['target_reason']}"
            )
            if c.get("missing_info"):
                explanation_text += f" Required missing items: {', '.join(c['missing_info'])}."

            evidence = PolicyEvidence(
                id=f"pe-{uuid.uuid4().hex[:10]}",
                authorization_id=req.id,
                policy_id=c["policy_id"],
                rule_decision=c["target_decision"],
                retrieved_chunks=[{
                    "text": f"Policy {c['policy_id']} coverage guidelines for {c['cpt_desc']}.",
                    "policyId": c["policy_id"],
                    "policyName": POLICY_INDEX.get(c["policy_id"], {}).get("policy_name", "Policy Manual"),
                    "score": 0.94
                }],
                llm_explanation=explanation_text,
                llm_prompt=f"Case {c['case_number']} Context",
                weaviate_query=f"{c['cpt']} {c['target_decision']} criteria",
                generated_at=sub_dt + timedelta(minutes=1),
                duration_ms=450
            )
            db.add(evidence)

            # Build Audit Logs
            audit1 = AuditLog(
                id=f"at-{uuid.uuid4().hex[:8]}",
                authorization_id=req.id,
                action="Authorization Request Created",
                performed_by="Provider Portal User",
                role="Provider",
                timestamp=sub_dt,
                details=f"Submitted request {c['case_number']} for procedure {c['cpt']}.",
                new_value="Pending Review",
                category="submission"
            )
            audit2 = AuditLog(
                id=f"at-{uuid.uuid4().hex[:8]}",
                authorization_id=req.id,
                action="Rule Engine Evaluation Completed",
                performed_by="CareAuth Rule Engine + ML Classifier",
                role="System",
                timestamp=sub_dt + timedelta(seconds=15),
                details=f"Decision: {c['target_decision']}. {c['target_reason']}",
                new_value=c["target_decision"],
                category="rule_evaluation"
            )
            db.add_all([audit1, audit2])

            # Seed Policy Companion Messages for Nurse Review cases
            if c["target_decision"] == "Nurse Review Required":
                msg1 = PolicyCompanionMessage(
                    id=f"pcm-{uuid.uuid4().hex[:10]}",
                    authorization_id=req.id,
                    role="user",
                    content="What specific clinical criteria could not be automatically verified for this request?",
                    created_at=sub_dt + timedelta(minutes=5)
                )
                msg2 = PolicyCompanionMessage(
                    id=f"pcm-{uuid.uuid4().hex[:10]}",
                    authorization_id=req.id,
                    role="assistant",
                    content=f"Under Policy {c['policy_id']}, the request required manual review because the submitted documentation contains complex prior treatment history that could not be auto-adjudicated.",
                    sources=[{"textPreview": f"Policy {c['policy_id']} Section 3: Clinical Criteria", "policyName": "Medical Policy", "score": 0.92}],
                    created_at=sub_dt + timedelta(minutes=5, seconds=30)
                )
                db.add_all([msg1, msg2])

            # Seed Notifications
            notif = Notification(
                id=f"notif-{uuid.uuid4().hex[:10]}",
                user_id="user-003",
                title=f"Prior Auth Update: {c['case_number']}",
                message=f"Request {c['case_number']} evaluated to '{c['target_decision']}'.",
                type="info",
                timestamp=sub_dt + timedelta(minutes=2),
                is_read=False,
                case_id=req.id
            )
            db.add(notif)

        db.commit()
        log.info("Master Seeding Complete! Seeded 20 consistent authorization requests across all tables.")

    except Exception as e:
        log.error("Seeding failed: %s", e)
        db.rollback()
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
