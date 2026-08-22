"""
Seed script — inserts realistic sample data for local development and testing.

Run with:
    python -m backend.core.seed

Data is inserted in dependency order (parents before children).
All foreign key references use in-memory objects from the same session.
"""

import asyncio
import sys
from datetime import date

# asyncmy + SSL requires SelectorEventLoop on Windows
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.database import AsyncSessionLocal
from backend.models.ai_decision import AIDecision, AIRecommendation
from backend.models.auth_decision import AuthorizationDecision, FinalDecision
from backend.models.authorization import AuthorizationRequest, AuthStatus, Priority
from backend.models.document import Document
from backend.models.insurance_plan import InsurancePlan
from backend.models.nurse_review import NurseDecision, NurseReview
from backend.models.patient import Patient
from backend.models.policy import Policy, PolicyRule
from backend.models.provider import Provider
from backend.models.service import Service
from backend.models.user import User, UserRole


async def seed_db() -> None:
    async with AsyncSessionLocal() as session:
        await _seed(session)
        await session.commit()
    print("✅ Seed data inserted successfully.")


async def _seed(session: AsyncSession) -> None:
    # ------------------------------------------------------------------
    # 1. Insurance Plans
    # ------------------------------------------------------------------
    plan_blue = InsurancePlan(
        name="BlueCross Premier",
        provider="BlueCross BlueShield",
        plan_type="PPO",
        active=True,
    )
    plan_aetna = InsurancePlan(
        name="Aetna Essential",
        provider="Aetna",
        plan_type="HMO",
        active=True,
    )
    session.add_all([plan_blue, plan_aetna])
    await session.flush()  # populate IDs without committing

    # ------------------------------------------------------------------
    # 2. Users (one per relevant role)
    # ------------------------------------------------------------------
    admin = User(
        name="Alice Admin",
        email="alice@priorauth.com",
        password_hash="$2b$12$placeholder_admin_hash",
        role=UserRole.admin,
    )
    nurse = User(
        name="Bob Nurse",
        email="bob@priorauth.com",
        password_hash="$2b$12$placeholder_nurse_hash",
        role=UserRole.nurse,
    )
    physician = User(
        name="Carol Physician",
        email="carol@priorauth.com",
        password_hash="$2b$12$placeholder_physician_hash",
        role=UserRole.physician,
    )
    session.add_all([admin, nurse, physician])
    await session.flush()

    # ------------------------------------------------------------------
    # 3. Patients
    # ------------------------------------------------------------------
    patients = [
        Patient(
            name="David Lee",
            date_of_birth=date(1980, 5, 15),
            gender="male",
            member_id="MBR-0001",
            insurance_plan_id=plan_blue.id,
        ),
        Patient(
            name="Emma Torres",
            date_of_birth=date(1975, 11, 22),
            gender="female",
            member_id="MBR-0002",
            insurance_plan_id=plan_blue.id,
        ),
        Patient(
            name="Frank Chen",
            date_of_birth=date(1990, 3, 8),
            gender="male",
            member_id="MBR-0003",
            insurance_plan_id=plan_aetna.id,
        ),
        Patient(
            name="Grace Kim",
            date_of_birth=date(1965, 9, 1),
            gender="female",
            member_id="MBR-0004",
            insurance_plan_id=plan_aetna.id,
        ),
        Patient(
            name="Henry Patel",
            date_of_birth=date(2001, 7, 19),
            gender="male",
            member_id="MBR-0005",
            insurance_plan_id=plan_blue.id,
        ),
    ]
    session.add_all(patients)
    await session.flush()

    # ------------------------------------------------------------------
    # 4. Providers
    # ------------------------------------------------------------------
    provider_city = Provider(
        name="Dr. James Carter",
        organization="City Medical Center",
        license_number="LIC-TX-10001",
    )
    provider_metro = Provider(
        name="Dr. Lisa Wong",
        organization="Metro Health Group",
        license_number="LIC-TX-10002",
    )
    session.add_all([provider_city, provider_metro])
    await session.flush()

    # ------------------------------------------------------------------
    # 5. Services
    # ------------------------------------------------------------------
    svc_mri = Service(
        name="MRI Brain",
        code="SVC-MRI-001",
        description="Magnetic resonance imaging of the brain with and without contrast.",
    )
    svc_pt = Service(
        name="Physical Therapy",
        code="SVC-PT-002",
        description="Outpatient physical therapy sessions for musculoskeletal rehabilitation.",
    )
    svc_surgery = Service(
        name="Knee Replacement Surgery",
        code="SVC-SURG-003",
        description="Total knee arthroplasty procedure.",
    )
    session.add_all([svc_mri, svc_pt, svc_surgery])
    await session.flush()

    # ------------------------------------------------------------------
    # 6. Policies (3 policies with 2 rules each)
    # ------------------------------------------------------------------
    policy1 = Policy(
        insurance_plan_id=plan_blue.id,
        name="Imaging Prior Auth Policy",
        version="2024.1",
        content="All advanced imaging procedures require prior authorization. Clinical necessity must be documented.",
        active=True,
    )
    policy2 = Policy(
        insurance_plan_id=plan_blue.id,
        name="Surgical Procedures Policy",
        version="2024.1",
        content="Elective surgical procedures require pre-certification at least 5 business days before the procedure.",
        active=True,
    )
    policy3 = Policy(
        insurance_plan_id=plan_aetna.id,
        name="Rehabilitation Services Policy",
        version="2023.3",
        content="Physical therapy requires authorization after the 6th visit in a calendar year.",
        active=True,
    )
    session.add_all([policy1, policy2, policy3])
    await session.flush()

    rules = [
        PolicyRule(
            policy_id=policy1.id,
            rule="Advanced imaging requires documented conservative treatment failure.",
            requirement="Physician must submit clinical notes showing prior treatment attempts.",
            source_reference="CMS LCD L33518",
        ),
        PolicyRule(
            policy_id=policy1.id,
            rule="Brain MRI limited to 2 per year unless oncology diagnosis.",
            requirement="Diagnosis code required; ICD-10 must match approved indications list.",
            source_reference="BlueCross Policy BP-IMG-2024",
        ),
        PolicyRule(
            policy_id=policy2.id,
            rule="Knee replacement requires documented 6-month conservative therapy.",
            requirement="Physical therapy records and X-ray results must be submitted.",
            source_reference="CMS NCD 150.9",
        ),
        PolicyRule(
            policy_id=policy2.id,
            rule="Surgical site infection risk assessment required pre-authorization.",
            requirement="ASA score and BMI must be documented in clinical notes.",
            source_reference="BlueCross Policy BP-SURG-2024",
        ),
        PolicyRule(
            policy_id=policy3.id,
            rule="Physical therapy authorization required after 6 visits per year.",
            requirement="Functional assessment and treatment plan must be submitted.",
            source_reference="Aetna Clinical Policy Bulletin 0564",
        ),
        PolicyRule(
            policy_id=policy3.id,
            rule="Therapy must be provided by a licensed physical therapist.",
            requirement="Provider NPI and license number must be on file.",
            source_reference="Aetna Provider Requirements 2023",
        ),
    ]
    session.add_all(rules)
    await session.flush()

    # ------------------------------------------------------------------
    # 7. Authorization Requests (5, spanning all statuses and priorities)
    # ------------------------------------------------------------------
    auth_requests = [
        AuthorizationRequest(
            patient_id=patients[0].id,
            provider_id=provider_city.id,
            service_id=svc_mri.id,
            diagnosis="Persistent headaches with neurological symptoms",
            clinical_notes="Patient reports 3-month history of migraines unresponsive to OTC medication.",
            status=AuthStatus.pending,
            priority=Priority.high,
        ),
        AuthorizationRequest(
            patient_id=patients[1].id,
            provider_id=provider_city.id,
            service_id=svc_surgery.id,
            diagnosis="Severe osteoarthritis right knee",
            clinical_notes="X-rays confirm grade IV osteoarthritis. Six months of PT completed.",
            status=AuthStatus.in_review,
            priority=Priority.urgent,
        ),
        AuthorizationRequest(
            patient_id=patients[2].id,
            provider_id=provider_metro.id,
            service_id=svc_pt.id,
            diagnosis="Lumbar disc herniation L4-L5",
            clinical_notes="MRI confirmed herniation. Conservative management recommended.",
            status=AuthStatus.approved,
            priority=Priority.medium,
        ),
        AuthorizationRequest(
            patient_id=patients[3].id,
            provider_id=provider_metro.id,
            service_id=svc_mri.id,
            diagnosis="Suspected acoustic neuroma",
            clinical_notes="Hearing loss and tinnitus for 6 months. ENT referral completed.",
            status=AuthStatus.denied,
            priority=Priority.medium,
        ),
        AuthorizationRequest(
            patient_id=patients[4].id,
            provider_id=provider_city.id,
            service_id=svc_pt.id,
            diagnosis="Post-operative shoulder rehabilitation",
            clinical_notes="Status post rotator cuff repair. PT initiated for functional recovery.",
            status=AuthStatus.pending,
            priority=Priority.low,
        ),
    ]
    session.add_all(auth_requests)
    await session.flush()

    # ------------------------------------------------------------------
    # 8. Documents (5, linked to requests and users)
    # ------------------------------------------------------------------
    documents = [
        Document(
            authorization_id=auth_requests[0].id,
            document_type="clinical_notes",
            file_url="https://storage.priorauth.com/docs/auth-1-clinical-notes.pdf",
            uploaded_by=physician.id,
        ),
        Document(
            authorization_id=auth_requests[1].id,
            document_type="imaging_report",
            file_url="https://storage.priorauth.com/docs/auth-2-xray-report.pdf",
            uploaded_by=physician.id,
        ),
        Document(
            authorization_id=auth_requests[1].id,
            document_type="clinical_notes",
            file_url="https://storage.priorauth.com/docs/auth-2-clinical-notes.pdf",
            uploaded_by=nurse.id,
        ),
        Document(
            authorization_id=auth_requests[2].id,
            document_type="mri_report",
            file_url="https://storage.priorauth.com/docs/auth-3-mri.pdf",
            uploaded_by=physician.id,
        ),
        Document(
            authorization_id=auth_requests[4].id,
            document_type="referral_letter",
            file_url="https://storage.priorauth.com/docs/auth-5-referral.pdf",
            uploaded_by=nurse.id,
        ),
    ]
    session.add_all(documents)
    await session.flush()

    # ------------------------------------------------------------------
    # 9. AI Decisions (5 decisions with varied recommendations/confidence)
    # ------------------------------------------------------------------
    ai_decisions = [
        AIDecision(
            authorization_id=auth_requests[0].id,
            recommendation=AIRecommendation.approve,
            confidence_score=0.82,
            reasoning="Clinical notes support medical necessity for brain MRI. Diagnosis aligns with approved indications.",
        ),
        AIDecision(
            authorization_id=auth_requests[1].id,
            recommendation=AIRecommendation.escalate,
            confidence_score=0.65,
            reasoning="Complex case with high-cost surgical procedure. Recommend nurse review for additional clinical judgment.",
        ),
        AIDecision(
            authorization_id=auth_requests[2].id,
            recommendation=AIRecommendation.approve,
            confidence_score=0.91,
            reasoning="Physical therapy for lumbar disc herniation is strongly supported by policy criteria.",
        ),
        AIDecision(
            authorization_id=auth_requests[3].id,
            recommendation=AIRecommendation.deny,
            confidence_score=0.78,
            reasoning="Second MRI within 12 months without documented oncology diagnosis. Policy criteria not met.",
        ),
        AIDecision(
            authorization_id=auth_requests[4].id,
            recommendation=AIRecommendation.approve,
            confidence_score=0.88,
            reasoning="Post-operative PT is standard of care following rotator cuff repair.",
        ),
    ]
    session.add_all(ai_decisions)
    await session.flush()

    # ------------------------------------------------------------------
    # 10. Nurse Reviews (3 reviews)
    # ------------------------------------------------------------------
    nurse_reviews = [
        NurseReview(
            authorization_id=auth_requests[1].id,
            nurse_id=nurse.id,
            decision=NurseDecision.escalate,
            notes="High-risk surgical case. Recommend physician peer review before final decision.",
        ),
        NurseReview(
            authorization_id=auth_requests[3].id,
            nurse_id=nurse.id,
            decision=NurseDecision.deny,
            notes="Confirmed policy criteria not met. No new indication for second MRI this year.",
        ),
        NurseReview(
            authorization_id=auth_requests[4].id,
            nurse_id=nurse.id,
            decision=NurseDecision.approve,
            notes="Post-surgical PT clearly indicated. Approved per standard protocol.",
        ),
    ]
    session.add_all(nurse_reviews)
    await session.flush()

    # ------------------------------------------------------------------
    # 11. Final Authorization Decisions (3 decisions)
    # ------------------------------------------------------------------
    final_decisions = [
        AuthorizationDecision(
            authorization_id=auth_requests[2].id,
            decided_by=admin.id,
            decision=FinalDecision.approved,
            reason="AI recommendation and clinical documentation support approval. Policy criteria fully met.",
        ),
        AuthorizationDecision(
            authorization_id=auth_requests[3].id,
            decided_by=admin.id,
            decision=FinalDecision.denied,
            reason="Policy requires 12-month gap between non-oncology brain MRIs. Request does not qualify.",
        ),
        AuthorizationDecision(
            authorization_id=auth_requests[4].id,
            decided_by=physician.id,
            decision=FinalDecision.approved,
            reason="Post-operative physical therapy approved per standard surgical recovery protocol.",
        ),
    ]
    session.add_all(final_decisions)
    await session.flush()


if __name__ == "__main__":
    asyncio.run(seed_db())
