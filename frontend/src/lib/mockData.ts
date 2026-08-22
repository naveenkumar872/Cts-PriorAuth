import {
  User, UserRole, InsurancePlan, Patient, Provider, Service,
  AuthorizationRequest, AuthStatus, Priority, AIDecision, AIRecommendation,
  NurseReview, NurseDecision, AuthorizationDecision, FinalDecision,
  Policy, PolicyRule, DashboardStats, TrendData, ActivityItem,
} from '@/types'

export const mockUsers: User[] = [
  { id: 1, name: 'Dr. Jane Doe', email: 'jane.doe@priorauth.com', role: UserRole.PHYSICIAN, created_at: '2024-01-01T00:00:00Z' },
  { id: 2, name: 'Bob Nurse', email: 'bob.nurse@priorauth.com', role: UserRole.NURSE, created_at: '2024-01-02T00:00:00Z' },
  { id: 3, name: 'Alice Admin', email: 'alice.admin@priorauth.com', role: UserRole.ADMIN, created_at: '2024-01-03T00:00:00Z' },
  { id: 4, name: 'Carlos Auditor', email: 'carlos@priorauth.com', role: UserRole.AUDITOR, created_at: '2024-01-04T00:00:00Z' },
]

export const mockInsurancePlans: InsurancePlan[] = [
  { id: 1, name: 'BlueCross Premier PPO', provider: 'BlueCross BlueShield', plan_type: 'PPO', active: true, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
  { id: 2, name: 'Aetna Essential HMO', provider: 'Aetna', plan_type: 'HMO', active: true, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
  { id: 3, name: 'UnitedHealth Gold', provider: 'UnitedHealthcare', plan_type: 'PPO', active: true, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
  { id: 4, name: 'Cigna Standard', provider: 'Cigna', plan_type: 'EPO', active: false, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
]

export const mockPatients: Patient[] = [
  { id: 1, name: 'David Lee', date_of_birth: '1980-05-15', gender: 'male', member_id: 'MBR-0001', insurance_plan_id: 1, insurance_plan: mockInsurancePlans[0], created_at: '2024-01-10T00:00:00Z', updated_at: '2024-01-10T00:00:00Z' },
  { id: 2, name: 'Emma Torres', date_of_birth: '1975-11-22', gender: 'female', member_id: 'MBR-0002', insurance_plan_id: 1, insurance_plan: mockInsurancePlans[0], created_at: '2024-01-11T00:00:00Z', updated_at: '2024-01-11T00:00:00Z' },
  { id: 3, name: 'Frank Chen', date_of_birth: '1990-03-08', gender: 'male', member_id: 'MBR-0003', insurance_plan_id: 2, insurance_plan: mockInsurancePlans[1], created_at: '2024-01-12T00:00:00Z', updated_at: '2024-01-12T00:00:00Z' },
  { id: 4, name: 'Grace Kim', date_of_birth: '1965-09-01', gender: 'female', member_id: 'MBR-0004', insurance_plan_id: 2, insurance_plan: mockInsurancePlans[1], created_at: '2024-01-13T00:00:00Z', updated_at: '2024-01-13T00:00:00Z' },
  { id: 5, name: 'Henry Patel', date_of_birth: '2001-07-19', gender: 'male', member_id: 'MBR-0005', insurance_plan_id: 1, insurance_plan: mockInsurancePlans[0], created_at: '2024-01-14T00:00:00Z', updated_at: '2024-01-14T00:00:00Z' },
  { id: 6, name: 'Sarah Johnson', date_of_birth: '1988-02-14', gender: 'female', member_id: 'MBR-0006', insurance_plan_id: 3, insurance_plan: mockInsurancePlans[2], created_at: '2024-01-15T00:00:00Z', updated_at: '2024-01-15T00:00:00Z' },
]

export const mockProviders: Provider[] = [
  { id: 1, name: 'Dr. James Carter', organization: 'City Medical Center', license_number: 'LIC-TX-10001', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
  { id: 2, name: 'Dr. Lisa Wong', organization: 'Metro Health Group', license_number: 'LIC-TX-10002', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
  { id: 3, name: 'Dr. Marcus Rivera', organization: 'Riverside Orthopedics', license_number: 'LIC-TX-10003', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
]

export const mockServices: Service[] = [
  { id: 1, name: 'MRI Brain', code: 'SVC-MRI-001', description: 'Magnetic resonance imaging of the brain with and without contrast.', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
  { id: 2, name: 'Physical Therapy', code: 'SVC-PT-002', description: 'Outpatient physical therapy for musculoskeletal rehabilitation.', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
  { id: 3, name: 'Knee Replacement Surgery', code: 'SVC-SURG-003', description: 'Total knee arthroplasty procedure.', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
  { id: 4, name: 'CT Scan Abdomen', code: 'SVC-CT-004', description: 'Computed tomography of the abdomen and pelvis with contrast.', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
  { id: 5, name: 'Cardiac Catheterization', code: 'SVC-CARD-005', description: 'Diagnostic cardiac catheterization procedure.', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
]

export const mockPolicyRules: PolicyRule[] = [
  { id: 1, policy_id: 1, rule: 'Advanced imaging requires documented conservative treatment failure.', requirement: 'Physician must submit clinical notes showing prior treatment attempts.', source_reference: 'CMS LCD L33518' },
  { id: 2, policy_id: 1, rule: 'Brain MRI limited to 2 per year unless oncology diagnosis.', requirement: 'Diagnosis code required; ICD-10 must match approved indications.', source_reference: 'BlueCross Policy BP-IMG-2024' },
  { id: 3, policy_id: 2, rule: 'Knee replacement requires documented 6-month conservative therapy.', requirement: 'Physical therapy records and X-ray results must be submitted.', source_reference: 'CMS NCD 150.9' },
  { id: 4, policy_id: 2, rule: 'Surgical site infection risk assessment required.', requirement: 'ASA score and BMI must be documented in clinical notes.', source_reference: 'BlueCross Policy BP-SURG-2024' },
  { id: 5, policy_id: 3, rule: 'Physical therapy authorization required after 6 visits per year.', requirement: 'Functional assessment and treatment plan must be submitted.', source_reference: 'Aetna CPB 0564' },
]

export const mockPolicies: Policy[] = [
  { id: 1, insurance_plan_id: 1, name: 'Imaging Prior Auth Policy', version: '2024.1', content: 'All advanced imaging procedures require prior authorization. Clinical necessity must be documented.', active: true, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z', rules: mockPolicyRules.filter(r => r.policy_id === 1), insurance_plan: mockInsurancePlans[0] },
  { id: 2, insurance_plan_id: 1, name: 'Surgical Procedures Policy', version: '2024.1', content: 'Elective surgical procedures require pre-certification at least 5 business days before procedure.', active: true, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z', rules: mockPolicyRules.filter(r => r.policy_id === 2), insurance_plan: mockInsurancePlans[0] },
  { id: 3, insurance_plan_id: 2, name: 'Rehabilitation Services Policy', version: '2023.3', content: 'Physical therapy requires authorization after the 6th visit in a calendar year.', active: true, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z', rules: mockPolicyRules.filter(r => r.policy_id === 3), insurance_plan: mockInsurancePlans[1] },
]

export const mockAIDecisions: AIDecision[] = [
  { id: 1, authorization_id: 1, recommendation: AIRecommendation.APPROVE, confidence_score: 0.82, reasoning: 'Clinical notes support medical necessity. Diagnosis aligns with approved indications. Conservative treatment documented.', created_at: '2024-06-15T10:30:00Z' },
  { id: 2, authorization_id: 2, recommendation: AIRecommendation.ESCALATE, confidence_score: 0.65, reasoning: 'Complex surgical case. Recommend nurse review for additional clinical judgment on high-cost procedure.', created_at: '2024-06-14T14:22:00Z' },
  { id: 3, authorization_id: 3, recommendation: AIRecommendation.APPROVE, confidence_score: 0.91, reasoning: 'Physical therapy strongly supported by policy criteria. MRI confirmed herniation. Standard of care.', created_at: '2024-06-13T09:15:00Z' },
  { id: 4, authorization_id: 4, recommendation: AIRecommendation.DENY, confidence_score: 0.78, reasoning: 'Second MRI within 12 months without documented oncology diagnosis. Policy criteria not met.', created_at: '2024-06-12T16:45:00Z' },
  { id: 5, authorization_id: 5, recommendation: AIRecommendation.APPROVE, confidence_score: 0.88, reasoning: 'Post-operative PT is standard of care following rotator cuff repair. Well-documented clinical necessity.', created_at: '2024-06-11T11:00:00Z' },
]

export const mockNurseReviews: NurseReview[] = [
  { id: 1, authorization_id: 2, nurse_id: 2, decision: NurseDecision.ESCALATE, notes: 'High-risk surgical case. Recommend physician peer review before final decision. Patient has comorbidities.', reviewed_at: '2024-06-14T16:30:00Z', nurse: mockUsers[1] },
  { id: 2, authorization_id: 4, nurse_id: 2, decision: NurseDecision.DENY, notes: 'Confirmed policy criteria not met. No new indication for second MRI this calendar year.', reviewed_at: '2024-06-12T18:00:00Z', nurse: mockUsers[1] },
  { id: 3, authorization_id: 5, nurse_id: 2, decision: NurseDecision.APPROVE, notes: 'Post-surgical PT clearly indicated. Approved per standard protocol. 8 sessions authorized.', reviewed_at: '2024-06-11T13:30:00Z', nurse: mockUsers[1] },
]

export const mockAuthDecisions: AuthorizationDecision[] = [
  { id: 1, authorization_id: 3, decided_by: 1, decision: FinalDecision.APPROVED, reason: 'AI and clinical documentation support approval. Policy criteria fully met.', decided_at: '2024-06-13T11:00:00Z', decider: mockUsers[0] },
  { id: 2, authorization_id: 4, decided_by: 3, decision: FinalDecision.DENIED, reason: 'Policy requires 12-month gap between non-oncology brain MRIs. Request does not qualify.', decided_at: '2024-06-12T19:00:00Z', decider: mockUsers[2] },
  { id: 3, authorization_id: 5, decided_by: 1, decision: FinalDecision.APPROVED, reason: 'Post-operative physical therapy approved per standard surgical recovery protocol.', decided_at: '2024-06-11T15:00:00Z', decider: mockUsers[0] },
]

export const mockAuthRequests: AuthorizationRequest[] = [
  {
    id: 1, patient_id: 1, provider_id: 1, service_id: 1,
    diagnosis: 'Persistent headaches with neurological symptoms',
    clinical_notes: 'Patient reports 3-month history of migraines unresponsive to OTC medication. Neurological exam normal. MRI warranted to rule out structural pathology.',
    status: AuthStatus.PENDING, priority: Priority.HIGH,
    submitted_at: '2024-06-15T09:00:00Z',
    patient: mockPatients[0], provider: mockProviders[0], service: mockServices[0],
    ai_decisions: [mockAIDecisions[0]],
  },
  {
    id: 2, patient_id: 2, provider_id: 1, service_id: 3,
    diagnosis: 'Severe osteoarthritis right knee — grade IV',
    clinical_notes: 'X-rays confirm grade IV OA. Six months of PT completed without significant improvement. Patient unable to perform ADLs.',
    status: AuthStatus.IN_REVIEW, priority: Priority.URGENT,
    submitted_at: '2024-06-14T11:30:00Z',
    patient: mockPatients[1], provider: mockProviders[0], service: mockServices[2],
    ai_decisions: [mockAIDecisions[1]], nurse_reviews: [mockNurseReviews[0]],
  },
  {
    id: 3, patient_id: 3, provider_id: 2, service_id: 2,
    diagnosis: 'Lumbar disc herniation L4-L5',
    clinical_notes: 'MRI confirmed herniation. Conservative management recommended. PT for core strengthening and pain management.',
    status: AuthStatus.APPROVED, priority: Priority.MEDIUM,
    submitted_at: '2024-06-13T08:00:00Z',
    patient: mockPatients[2], provider: mockProviders[1], service: mockServices[1],
    ai_decisions: [mockAIDecisions[2]], authorization_decisions: [mockAuthDecisions[0]],
  },
  {
    id: 4, patient_id: 4, provider_id: 2, service_id: 1,
    diagnosis: 'Suspected acoustic neuroma — follow-up imaging',
    clinical_notes: 'Hearing loss and tinnitus for 6 months. ENT referral completed. Second MRI requested for follow-up.',
    status: AuthStatus.DENIED, priority: Priority.MEDIUM,
    submitted_at: '2024-06-12T14:00:00Z',
    patient: mockPatients[3], provider: mockProviders[1], service: mockServices[0],
    ai_decisions: [mockAIDecisions[3]], nurse_reviews: [mockNurseReviews[1]], authorization_decisions: [mockAuthDecisions[1]],
  },
  {
    id: 5, patient_id: 5, provider_id: 1, service_id: 2,
    diagnosis: 'Post-operative shoulder rehabilitation',
    clinical_notes: 'Status post rotator cuff repair. PT initiated for functional recovery. 8 sessions requested.',
    status: AuthStatus.APPROVED, priority: Priority.LOW,
    submitted_at: '2024-06-11T10:00:00Z',
    patient: mockPatients[4], provider: mockProviders[0], service: mockServices[1],
    ai_decisions: [mockAIDecisions[4]], nurse_reviews: [mockNurseReviews[2]], authorization_decisions: [mockAuthDecisions[2]],
  },
  {
    id: 6, patient_id: 6, provider_id: 3, service_id: 5,
    diagnosis: 'Unstable angina — chest pain evaluation',
    clinical_notes: 'Patient presents with recurring chest pain and exertional dyspnea. ECG changes noted. Cardiac cath requested for definitive diagnosis.',
    status: AuthStatus.PENDING, priority: Priority.URGENT,
    submitted_at: '2024-06-16T07:30:00Z',
    patient: mockPatients[5], provider: mockProviders[2], service: mockServices[4],
  },
]

export const mockDashboardStats: DashboardStats = {
  total_requests: 124,
  pending_requests: 38,
  approved: 67,
  nurse_review: 19,
  approval_rate: 0.72,
  denial_rate: 0.18,
  avg_processing_time: 2.4,
}

export const mockTrendData: TrendData[] = [
  { date: 'Jan', total: 42, approved: 28, denied: 8 },
  { date: 'Feb', total: 55, approved: 38, denied: 10 },
  { date: 'Mar', total: 48, approved: 32, denied: 9 },
  { date: 'Apr', total: 63, approved: 44, denied: 12 },
  { date: 'May', total: 71, approved: 52, denied: 13 },
  { date: 'Jun', total: 58, approved: 41, denied: 11 },
  { date: 'Jul', total: 79, approved: 58, denied: 14 },
  { date: 'Aug', total: 85, approved: 62, denied: 15 },
  { date: 'Sep', total: 92, approved: 68, denied: 17 },
  { date: 'Oct', total: 88, approved: 64, denied: 16 },
  { date: 'Nov', total: 103, approved: 75, denied: 19 },
  { date: 'Dec', total: 124, approved: 90, denied: 22 },
]

export const mockActivityItems: ActivityItem[] = [
  { id: '1', type: 'authorization', title: 'Authorization Approved', description: 'PA-003 for David Lee — Lumbar disc herniation PT approved', timestamp: '2024-06-13T11:00:00Z', user: 'Dr. Jane Doe' },
  { id: '2', type: 'review', title: 'Nurse Review Completed', description: 'PA-005 — Bob Nurse approved post-op shoulder PT (8 sessions)', timestamp: '2024-06-11T13:30:00Z', user: 'Bob Nurse' },
  { id: '3', type: 'policy', title: 'Policy Updated', description: 'Imaging Prior Auth Policy v2024.1 activated for BlueCross Premier', timestamp: '2024-06-10T09:00:00Z', user: 'Alice Admin' },
  { id: '4', type: 'request', title: 'New Request Submitted', description: 'PA-006 for Sarah Johnson — Cardiac catheterization (URGENT)', timestamp: '2024-06-16T07:30:00Z', user: 'Dr. Marcus Rivera' },
  { id: '5', type: 'authorization', title: 'Authorization Denied', description: 'PA-004 for Grace Kim — Second brain MRI denied, policy criteria not met', timestamp: '2024-06-12T19:00:00Z', user: 'Alice Admin' },
]

export const currentUser = mockUsers[0]
