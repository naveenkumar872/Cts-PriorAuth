/**
 * COMPREHENSIVE MOCK DATA - MASTER PROMPT SPECIFICATION
 * All data is demonstration/test data. Never uses real patient information.
 *
 * Section 29: MOCK DATA ARCHITECTURE
 * Provides complete datasets for:
 * - Patients (test data)
 * - Authorization requests
 * - Policies
 * - Notifications
 * - Audit logs
 * - Analytics
 */

import type {
  Patient,
  Provider,
  AuthorizationRequest,
  AuthorizationStatus,
  ClinicalDocument,
  AuditEntry,
  AIRecommendation,
  AIFactor,
  PolicyReference,
  Notification,
} from "@/types";

// ============================================================================
// DEMO PATIENTS - Test Data Only
// ============================================================================
export const DEMO_PATIENTS: Patient[] = [
  {
    id: "p-001",
    name: "John Anderson",
    dob: "1965-03-22",
    memberId: "BCB-4821-001",
    groupId: "GRP-77821",
    plan: "BlueCross PPO Gold",
    payer: "BlueCross BlueShield",
    gender: "Male",
    phone: "(312) 555-0147",
    address: "4821 Lakeview Dr, Chicago, IL 60657",
    primaryCare: "Dr. James Collins",
  },
  {
    id: "p-002",
    name: "Sarah Martinez",
    dob: "1978-07-15",
    memberId: "AET-2231-002",
    groupId: "GRP-43301",
    plan: "Aetna HMO Silver",
    payer: "Aetna",
    gender: "Female",
    phone: "(415) 555-0299",
    address: "1090 Market St, San Francisco, CA 94102",
    primaryCare: "Dr. Susan Park",
  },
  {
    id: "p-003",
    name: "Michael Johnson",
    dob: "1952-11-08",
    memberId: "UHC-9910-003",
    groupId: "GRP-19284",
    plan: "UnitedHealth Choice Plus",
    payer: "UnitedHealthcare",
    gender: "Male",
    phone: "(713) 555-0871",
    address: "3311 Westheimer Rd, Houston, TX 77098",
    primaryCare: "Dr. David Kim",
  },
  {
    id: "p-004",
    name: "Emily Rodriguez",
    dob: "1995-01-30",
    memberId: "HUM-5555-004",
    groupId: "GRP-55555",
    plan: "Humana Gold Plus",
    payer: "Humana",
    gender: "Female",
    phone: "(404) 555-0234",
    address: "789 Peachtree St, Atlanta, GA 30308",
    primaryCare: "Dr. Michelle Brown",
  },
  {
    id: "p-005",
    name: "Robert Wilson",
    dob: "1970-05-12",
    memberId: "CVS-3333-005",
    groupId: "GRP-33333",
    plan: "CVS Health Select",
    payer: "CVS Health",
    gender: "Male",
    phone: "(617) 555-0456",
    address: "100 Federal St, Boston, MA 02110",
    primaryCare: "Dr. Richard Thompson",
  },
];

// ============================================================================
// DEMO PROVIDERS - Healthcare Providers
// ============================================================================
export const DEMO_PROVIDERS: Provider[] = [
  {
    id: "prov-001",
    name: "Dr. James Collins, MD",
    npi: "1234567890",
    specialty: "Orthopedic Surgery",
    organization: "Northwestern Memorial Hospital",
    phone: "(312) 926-2000",
    fax: "(312) 926-2001",
    address: "251 E Huron St, Chicago, IL 60611",
    taxId: "36-1234567",
  },
  {
    id: "prov-002",
    name: "Dr. Susan Park, MD",
    npi: "0987654321",
    specialty: "Radiology",
    organization: "UCSF Medical Center",
    phone: "(415) 476-1000",
    fax: "(415) 476-1001",
    address: "505 Parnassus Ave, San Francisco, CA 94143",
    taxId: "94-0987654",
  },
  {
    id: "prov-003",
    name: "Dr. David Kim, MD",
    npi: "1122334455",
    specialty: "Cardiology",
    organization: "Houston Methodist Hospital",
    phone: "(713) 790-3333",
    fax: "(713) 790-3334",
    address: "6565 Fannin St, Houston, TX 77030",
    taxId: "74-1122334",
  },
];

// ============================================================================
// DEMO POLICIES - Insurance Coverage Policies
// ============================================================================
export const DEMO_POLICIES = [
  {
    id: "pol-001",
    title: "MRI Authorization Policy",
    version: "2.1",
    status: "Active",
    effectiveDate: "2024-01-15",
    lastUpdated: "2026-08-10",
    description:
      "Prior authorization requirements for MRI imaging procedures. Covers diagnostic and therapeutic MRIs across covered plans.",
    coverageType: "Diagnostic Imaging",
  },
  {
    id: "pol-002",
    title: "Physical Therapy Policy",
    version: "3.0",
    status: "Active",
    effectiveDate: "2024-06-01",
    lastUpdated: "2026-07-15",
    description:
      "Coverage guidelines for physical therapy services including visit limits, provider credentialing, and medical necessity criteria.",
    coverageType: "Rehabilitation Services",
  },
  {
    id: "pol-003",
    title: "Orthopedic Surgery Policy",
    version: "1.8",
    status: "Active",
    effectiveDate: "2024-03-01",
    lastUpdated: "2026-08-05",
    description:
      "Prior authorization for elective orthopedic surgical procedures including joint replacement, arthroscopy, and spinal fusion.",
    coverageType: "Surgical Procedures",
  },
  {
    id: "pol-004",
    title: "Specialist Referral Policy",
    version: "2.5",
    status: "Active",
    effectiveDate: "2024-02-01",
    lastUpdated: "2026-08-01",
    description: "Requirements for specialist consultation and referral authorization within HMO plans.",
    coverageType: "Specialist Services",
  },
  {
    id: "pol-005",
    title: "CT Scan Policy",
    version: "2.0",
    status: "Active",
    effectiveDate: "2024-04-15",
    lastUpdated: "2026-07-20",
    description: "Prior authorization criteria for computed tomography imaging across all body regions.",
    coverageType: "Diagnostic Imaging",
  },
];

// ============================================================================
// DEMO AUTHORIZATION REQUESTS
// ============================================================================

// Helper function to generate mock AI recommendations
function createAIRecommendation(status: string): AIRecommendation {
  const recommendations: Record<string, AIRecommendation> = {
    approved: {
      decision: "Approve",
      confidence: 94,
      reasoning:
        "Request meets all clinical criteria. Documentation is complete and diagnosis aligns with treatment necessity.",
      keyFactors: [
        {
          name: "Diagnosis Match",
          impact: "positive",
          weight: 0.35,
          description: "Primary diagnosis aligns with clinical guidelines for requested treatment",
        },
        {
          name: "Complete Documentation",
          impact: "positive",
          weight: 0.30,
          description: "All required supporting documents present",
        },
        {
          name: "Provider Credentialing",
          impact: "positive",
          weight: 0.20,
          description: "Requesting provider is in-network and properly credentialed",
        },
        {
          name: "Medical Necessity",
          impact: "positive",
          weight: 0.15,
          description: "Clinical evidence supports medical necessity",
        },
      ],
      missingInfo: [],
      policyReferences: [
        {
          id: "ref-1",
          title: "MRI Authorization Policy v2.1",
          section: "Section 3.1 - Medical Necessity",
          relevanceScore: 0.98,
          excerpt: "Prior MRI imaging is approved when clinically indicated by persistent pain unresponsive to conservative treatment.",
        },
      ],
      generatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      modelVersion: "2.1.0",
    },
    pending: {
      decision: "Request More Info",
      confidence: 72,
      reasoning:
        "Additional clinical documentation required to establish medical necessity. Previous conservative treatment records are incomplete.",
      keyFactors: [
        {
          name: "Documentation Incomplete",
          impact: "negative",
          weight: 0.40,
          description: "Previous treatment records missing",
        },
        {
          name: "Clinical Justification",
          impact: "neutral",
          weight: 0.35,
          description: "Moderate clinical evidence provided",
        },
        {
          name: "Timeline Alignment",
          impact: "positive",
          weight: 0.25,
          description: "Request timing aligns with clinical guidelines",
        },
      ],
      missingInfo: [
        "Previous MRI imaging results (within 12 months)",
        "Physical therapy treatment records and outcomes",
        "Specialist consultation notes",
      ],
      policyReferences: [
        {
          id: "ref-2",
          title: "MRI Authorization Policy v2.1",
          section: "Section 2 - Documentation Requirements",
          relevanceScore: 0.96,
          excerpt: "Documentation of previous conservative treatment attempts (minimum 6 weeks) required before authorization.",
        },
      ],
      generatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      modelVersion: "2.1.0",
    },
    rejected: {
      decision: "Deny",
      confidence: 88,
      reasoning:
        "Request does not meet medical necessity criteria. Insufficient evidence of conservative treatment failure and inadequate clinical documentation.",
      keyFactors: [
        {
          name: "Insufficient Conservative Treatment",
          impact: "negative",
          weight: 0.45,
          description: "No documented conservative treatment attempts",
        },
        {
          name: "Limited Clinical Evidence",
          impact: "negative",
          weight: 0.35,
          description: "Insufficient clinical justification",
        },
        {
          name: "Non-Urgent Timeline",
          impact: "neutral",
          weight: 0.20,
          description: "Elective procedure timing does not support urgent approval",
        },
      ],
      missingInfo: [
        "Documentation of failed conservative treatment",
        "Specialist evaluation and recommendation",
        "Patient history and symptom progression",
      ],
      policyReferences: [
        {
          id: "ref-3",
          title: "MRI Authorization Policy v2.1",
          section: "Section 3.2 - Denial Criteria",
          relevanceScore: 0.94,
          excerpt:
            "Requests denied when evidence of conservative treatment failure is absent or when clinical indication is not supported by documented findings.",
        },
      ],
      generatedAt: new Date().toISOString(),
      modelVersion: "2.1.0",
    },
  };

  return recommendations[status] || recommendations.pending;
}

// Demo Authorization Requests
export const DEMO_AUTHORIZATION_REQUESTS: AuthorizationRequest[] = [
  {
    id: "auth-001",
    caseNumber: "PA-2026-00124",
    patient: DEMO_PATIENTS[0],
    provider: DEMO_PROVIDERS[0],
    diagnoses: [
      { code: "M17.11", description: "Primary osteoarthritis, right knee", type: "primary" },
      { code: "E11.9", description: "Type 2 diabetes mellitus without complications", type: "secondary" },
    ],
    procedures: [
      {
        code: "27447",
        description: "Arthroplasty, knee, condyle and plateau",
        modifier: "RT",
        quantity: 1,
        serviceDate: "2026-09-15",
        placeOfService: "21 - Inpatient Hospital",
      },
    ],
    status: "Approved",
    priority: "high",
    riskLevel: "high",
    submittedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    assignedTo: "Sarah Henderson",
    clinicalNotes: "Patient with progressive knee osteoarthritis and significant functional impairment.",
    documents: [
      {
        id: "doc-001",
        name: "Radiology_Report_MRI_Knee.pdf",
        type: "imaging",
        uploadedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
        uploadedBy: "Dr. James Collins",
        size: "2.4 MB",
      },
      {
        id: "doc-002",
        name: "Clinical_Notes_Physical_Exam.pdf",
        type: "clinical_note",
        uploadedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
        uploadedBy: "Dr. James Collins",
        size: "1.1 MB",
      },
    ],
    aiRecommendation: createAIRecommendation("approved"),
    auditLog: [
      {
        id: "audit-001",
        action: "Request Submitted",
        performedBy: "Dr. James Collins",
        role: "Provider",
        timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
        details: "Prior authorization request submitted",
      },
      {
        id: "audit-002",
        action: "Data Validation Completed",
        performedBy: "System",
        role: "System",
        timestamp: new Date(Date.now() - 47 * 60 * 60 * 1000).toISOString(),
        details: "All required information validated",
      },
      {
        id: "audit-003",
        action: "AI Analysis Generated",
        performedBy: "System",
        role: "System",
        timestamp: new Date(Date.now() - 46 * 60 * 60 * 1000).toISOString(),
        details: "AI recommendation generated",
      },
      {
        id: "audit-004",
        action: "Request Approved",
        performedBy: "Sarah Henderson",
        role: "Insurance Reviewer",
        timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        details: "Request approved by reviewer",
        newValue: "Approved",
      },
    ],
  },
  {
    id: "auth-002",
    caseNumber: "PA-2026-00125",
    patient: DEMO_PATIENTS[1],
    provider: DEMO_PROVIDERS[1],
    diagnoses: [
      { code: "M54.5", description: "Low back pain", type: "primary" },
      { code: "M99.9", description: "Unspecified musculoskeletal disorder", type: "secondary" },
    ],
    procedures: [
      {
        code: "70553",
        description: "MRI, brain (including brainstem); without contrast material",
        quantity: 1,
        serviceDate: "2026-09-20",
        placeOfService: "24 - Ambulatory Surgical Center",
      },
    ],
    status: "Pending Review",
    priority: "normal",
    riskLevel: "medium",
    submittedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    assignedTo: "Sarah Henderson",
    clinicalNotes: "Patient with chronic back pain. Previous conservative management attempted.",
    documents: [
      {
        id: "doc-003",
        name: "Patient_History.pdf",
        type: "clinical_note",
        uploadedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        uploadedBy: "Dr. Susan Park",
        size: "0.9 MB",
      },
    ],
    aiRecommendation: createAIRecommendation("pending"),
    auditLog: [
      {
        id: "audit-005",
        action: "Request Submitted",
        performedBy: "Dr. Susan Park",
        role: "Provider",
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        details: "Prior authorization request submitted",
      },
      {
        id: "audit-006",
        action: "Data Validation Completed",
        performedBy: "System",
        role: "System",
        timestamp: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString(),
        details: "All required information validated",
      },
    ],
  },
  {
    id: "auth-003",
    caseNumber: "PA-2026-00123",
    patient: DEMO_PATIENTS[2],
    provider: DEMO_PROVIDERS[2],
    diagnoses: [
      { code: "I50.9", description: "Heart failure, unspecified", type: "primary" },
      { code: "E78.5", description: "Hyperlipidemia, unspecified", type: "secondary" },
    ],
    procedures: [
      {
        code: "93040",
        description: "Electrocardiogram; routine ECG with 15 leads; interpretation and report",
        quantity: 1,
        serviceDate: "2026-09-05",
        placeOfService: "11 - Office",
      },
    ],
    status: "Rejected",
    priority: "normal",
    riskLevel: "medium",
    submittedAt: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    dueDate: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    assignedTo: "Sarah Henderson",
    clinicalNotes: "Routine cardiac workup for heart failure management.",
    documents: [],
    aiRecommendation: createAIRecommendation("rejected"),
    auditLog: [
      {
        id: "audit-007",
        action: "Request Submitted",
        performedBy: "Dr. David Kim",
        role: "Provider",
        timestamp: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
        details: "Prior authorization request submitted",
      },
      {
        id: "audit-008",
        action: "Request Rejected",
        performedBy: "Sarah Henderson",
        role: "Insurance Reviewer",
        timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
        details: "Request rejected due to insufficient documentation",
        newValue: "Rejected",
      },
    ],
  },
  {
    id: "auth-004",
    caseNumber: "PA-2026-00126",
    patient: DEMO_PATIENTS[3],
    provider: DEMO_PROVIDERS[0],
    diagnoses: [
      { code: "E10.65", description: "Type 1 diabetes with hypoglycemia", type: "primary" },
    ],
    procedures: [
      {
        code: "99492",
        description: "Chronic care management services, complex, 60 minutes per month",
        quantity: 1,
        serviceDate: "2026-09-10",
        placeOfService: "11 - Office",
      },
    ],
    status: "Under Review",
    priority: "urgent",
    riskLevel: "high",
    submittedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    dueDate: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
    assignedTo: "Sarah Henderson",
    clinicalNotes: "Complex chronic care management for Type 1 diabetes patient with complications.",
    documents: [
      {
        id: "doc-004",
        name: "Diabetes_Management_Plan.pdf",
        type: "clinical_note",
        uploadedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        uploadedBy: "Dr. James Collins",
        size: "1.3 MB",
      },
    ],
    aiRecommendation: createAIRecommendation("approved"),
    auditLog: [
      {
        id: "audit-009",
        action: "Request Submitted",
        performedBy: "Dr. James Collins",
        role: "Provider",
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        details: "Prior authorization request submitted - URGENT priority",
      },
    ],
  },
  // ─── Additional demo cases ───────────────────────────────────────────────
  {
    id: "auth-005",
    caseNumber: "PA-2026-00127",
    patient: DEMO_PATIENTS[4],
    provider: DEMO_PROVIDERS[0],
    diagnoses: [
      { code: "M17.11", description: "Primary osteoarthritis, right knee", type: "primary" as const },
      { code: "Z96.651", description: "Presence of right artificial knee joint", type: "secondary" as const },
    ],
    procedures: [
      {
        code: "27447",
        description: "Arthroplasty, knee, condyle and plateau; medial and lateral compartments",
        quantity: 1,
        serviceDate: "2026-09-25",
        placeOfService: "21 - Inpatient Hospital",
      },
    ],
    status: "Pending Review" as const,
    priority: "high" as const,
    riskLevel: "high" as const,
    submittedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    assignedTo: "Sarah Henderson",
    clinicalNotes: "Patient has severe osteoarthritis with failed conservative management. Functional scoring indicates total knee replacement needed.",
    documents: [
      { id: "doc-005", name: "Knee_Xray_Report.pdf", type: "imaging" as const, uploadedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), uploadedBy: "Dr. James Collins", size: "3.2 MB" },
      { id: "doc-006", name: "PT_Trial_Records.pdf", type: "clinical_note" as const, uploadedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), uploadedBy: "Dr. James Collins", size: "1.1 MB" },
    ],
    aiRecommendation: createAIRecommendation("approved"),
    auditLog: [
      { id: "audit-010", action: "Request Submitted", performedBy: "Dr. James Collins", role: "Provider", timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), details: "PA request submitted for knee arthroplasty" },
    ],
  },
  {
    id: "auth-006",
    caseNumber: "PA-2026-00128",
    patient: DEMO_PATIENTS[0],
    provider: DEMO_PROVIDERS[1],
    diagnoses: [
      { code: "G43.909", description: "Migraine, unspecified, not intractable", type: "primary" as const },
    ],
    procedures: [
      {
        code: "64615",
        description: "Chemodenervation of muscle(s); muscle(s) innervated by facial, trigeminal, cervical spinal and accessory nerves",
        quantity: 1,
        serviceDate: "2026-09-18",
        placeOfService: "11 - Office",
      },
    ],
    status: "More Information Required" as const,
    priority: "normal" as const,
    riskLevel: "low" as const,
    submittedAt: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    assignedTo: "Sarah Henderson",
    clinicalNotes: "Botox injection for chronic migraine. Missing documentation of prior preventive medication trials.",
    documents: [
      { id: "doc-007", name: "Migraine_Diary.pdf", type: "clinical_note" as const, uploadedAt: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString(), uploadedBy: "Dr. Susan Park", size: "0.7 MB" },
    ],
    aiRecommendation: createAIRecommendation("pending"),
    auditLog: [
      { id: "audit-011", action: "Request Submitted", performedBy: "Dr. Susan Park", role: "Provider", timestamp: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString(), details: "PA request submitted" },
      { id: "audit-012", action: "More Info Requested", performedBy: "Sarah Henderson", role: "Insurance Reviewer", timestamp: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(), details: "Requested prior preventive medication trial records" },
    ],
  },
  {
    id: "auth-007",
    caseNumber: "PA-2026-00129",
    patient: DEMO_PATIENTS[2],
    provider: DEMO_PROVIDERS[0],
    diagnoses: [
      { code: "C50.919", description: "Malignant neoplasm of unspecified site of breast", type: "primary" as const },
    ],
    procedures: [
      {
        code: "77067",
        description: "Screening mammography, bilateral (2-view study of each breast)",
        quantity: 1,
        serviceDate: "2026-09-12",
        placeOfService: "19 - Off Campus-Outpatient Hospital",
      },
    ],
    status: "Under Review" as const,
    priority: "urgent" as const,
    riskLevel: "high" as const,
    submittedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    assignedTo: "Sarah Henderson",
    clinicalNotes: "Urgent mammography screening for high-risk oncology patient. Family history of bilateral breast cancer.",
    documents: [
      { id: "doc-008", name: "Oncology_Referral.pdf", type: "referral" as const, uploadedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), uploadedBy: "Dr. James Collins", size: "1.8 MB" },
      { id: "doc-009", name: "Family_History.pdf", type: "clinical_note" as const, uploadedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), uploadedBy: "Dr. James Collins", size: "0.5 MB" },
    ],
    aiRecommendation: createAIRecommendation("approved"),
    auditLog: [
      { id: "audit-013", action: "Request Submitted", performedBy: "Dr. James Collins", role: "Provider", timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), details: "Urgent PA submitted for oncology screening" },
      { id: "audit-014", action: "AI Triage Completed", performedBy: "System", role: "System", timestamp: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString(), details: "AI recommended approval with 96% confidence" },
    ],
  },
  {
    id: "auth-008",
    caseNumber: "PA-2026-00130",
    patient: DEMO_PATIENTS[1],
    provider: DEMO_PROVIDERS[2],
    diagnoses: [
      { code: "J44.1", description: "Chronic obstructive pulmonary disease with acute exacerbation", type: "primary" as const },
    ],
    procedures: [
      {
        code: "94060",
        description: "Bronchodilation responsiveness, spirometry as in 94010, pre and post bronchodilator administration",
        quantity: 1,
        serviceDate: "2026-09-08",
        placeOfService: "11 - Office",
      },
    ],
    status: "Pending Review" as const,
    priority: "high" as const,
    riskLevel: "medium" as const,
    submittedAt: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 9 * 60 * 60 * 1000).toISOString(),
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    assignedTo: "Sarah Henderson",
    clinicalNotes: "COPD patient with recent acute exacerbation. Pulmonary function testing required.",
    documents: [
      { id: "doc-010", name: "Pulmonary_Consult.pdf", type: "referral" as const, uploadedAt: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(), uploadedBy: "Dr. David Kim", size: "2.1 MB" },
    ],
    aiRecommendation: createAIRecommendation("approved"),
    auditLog: [
      { id: "audit-015", action: "Request Submitted", performedBy: "Dr. David Kim", role: "Provider", timestamp: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(), details: "PA submitted for pulmonary function testing" },
    ],
  },
  {
    id: "auth-009",
    caseNumber: "PA-2026-00131",
    patient: DEMO_PATIENTS[3],
    provider: DEMO_PROVIDERS[1],
    diagnoses: [
      { code: "F32.1", description: "Major depressive disorder, single episode, moderate", type: "primary" as const },
    ],
    procedures: [
      {
        code: "90837",
        description: "Psychotherapy, 60 minutes with patient",
        quantity: 12,
        serviceDate: "2026-10-01",
        placeOfService: "11 - Office",
      },
    ],
    status: "Approved" as const,
    priority: "normal" as const,
    riskLevel: "low" as const,
    submittedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    assignedTo: "Sarah Henderson",
    clinicalNotes: "Psychotherapy sessions for MDD. Patient meets criteria for extended therapy sessions.",
    documents: [
      { id: "doc-011", name: "Psych_Eval.pdf", type: "clinical_note" as const, uploadedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), uploadedBy: "Dr. Susan Park", size: "1.4 MB" },
    ],
    aiRecommendation: createAIRecommendation("approved"),
    auditLog: [
      { id: "audit-016", action: "Request Submitted", performedBy: "Dr. Susan Park", role: "Provider", timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), details: "PA submitted for behavioral health" },
      { id: "audit-017", action: "Request Approved", performedBy: "Sarah Henderson", role: "Insurance Reviewer", timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), details: "Approved — meets BH criteria", newValue: "Approved" },
    ],
  },
  {
    id: "auth-010",
    caseNumber: "PA-2026-00132",
    patient: DEMO_PATIENTS[0],
    provider: DEMO_PROVIDERS[2],
    diagnoses: [
      { code: "Z23", description: "Encounter for immunization", type: "primary" as const },
      { code: "Z87.39", description: "Personal history of other musculoskeletal disorders", type: "secondary" as const },
    ],
    procedures: [
      {
        code: "71250",
        description: "CT thorax; without contrast material",
        quantity: 1,
        serviceDate: "2026-09-22",
        placeOfService: "22 - On Campus-Outpatient Hospital",
      },
    ],
    status: "Pending Review" as const,
    priority: "normal" as const,
    riskLevel: "medium" as const,
    submittedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    dueDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
    assignedTo: "Sarah Henderson",
    clinicalNotes: "Low-dose CT for lung cancer screening. Patient is 55-year-old former smoker (30 pack-years).",
    documents: [
      { id: "doc-012", name: "Smoking_History.pdf", type: "clinical_note" as const, uploadedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), uploadedBy: "Dr. David Kim", size: "0.6 MB" },
    ],
    aiRecommendation: createAIRecommendation("approved"),
    auditLog: [
      { id: "audit-018", action: "Request Submitted", performedBy: "Dr. David Kim", role: "Provider", timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), details: "PA submitted for lung CT screening" },
    ],
  },
];

// ============================================================================
// DEMO NOTIFICATIONS
// ============================================================================
export const DEMO_NOTIFICATIONS: Notification[] = [
  {
    id: "notif-001",
    title: "Request Approved",
    message: "Prior authorization PA-2026-00124 has been approved.",
    type: "success",
    timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    read: false,
    caseId: "auth-001",
  },
  {
    id: "notif-002",
    title: "Additional Information Required",
    message: "Request PA-2026-00125 requires additional clinical documentation. Please upload within 3 days.",
    type: "warning",
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    read: false,
    caseId: "auth-002",
  },
  {
    id: "notif-003",
    title: "Request Rejected",
    message: "Prior authorization PA-2026-00123 has been rejected. Please resubmit with updated documentation.",
    type: "error",
    timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    read: true,
    caseId: "auth-003",
  },
  {
    id: "notif-004",
    title: "New Request Received",
    message: "New authorization request PA-2026-00126 from Dr. James Collins requires review.",
    type: "info",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    read: false,
    caseId: "auth-004",
  },
  {
    id: "notif-005",
    title: "Policy Update",
    message: "MRI Authorization Policy has been updated to version 2.2. Review new requirements.",
    type: "info",
    timestamp: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
    read: true,
  },
];

// ============================================================================
// DASHBOARD METRICS - KPI Data
// ============================================================================
export const DEMO_KPI_METRICS = {
  provider: [
    {
      label: "Total Requests",
      value: 24,
      change: 2,
      changeLabel: "vs last month",
      trend: "up" as const,
      icon: "FileText",
    },
    {
      label: "Pending",
      value: 3,
      change: -1,
      changeLabel: "decreased",
      trend: "down" as const,
      icon: "Clock",
    },
    {
      label: "Approved",
      value: 18,
      change: 3,
      changeLabel: "approved this month",
      trend: "up" as const,
      icon: "CheckCircle",
    },
    {
      label: "Rejection Rate",
      value: "8%",
      change: -2,
      changeLabel: "lower than average",
      trend: "down" as const,
      icon: "AlertCircle",
    },
  ],
  reviewer: [
    {
      label: "New Requests",
      value: 12,
      change: 2,
      changeLabel: "awaiting review",
      trend: "up" as const,
      icon: "Inbox",
    },
    {
      label: "Under Review",
      value: 8,
      change: 1,
      changeLabel: "in progress",
      trend: "up" as const,
      icon: "Eye",
    },
    {
      label: "Pending Info",
      value: 5,
      change: -1,
      changeLabel: "awaiting provider response",
      trend: "down" as const,
      icon: "AlertCircle",
    },
    {
      label: "Avg Review Time",
      value: "4.2h",
      change: -0.5,
      changeLabel: "faster than last week",
      trend: "down" as const,
      icon: "Zap",
    },
  ],
};

// ============================================================================
// CHART DATA - Analytics
// ============================================================================
export const DEMO_CHART_DATA = {
  requestsByStatus: [
    { status: "Approved", value: 156, fill: "#10b981" },
    { status: "Pending", value: 42, fill: "#f59e0b" },
    { status: "Rejected", value: 28, fill: "#ef4444" },
    { status: "More Info", value: 19, fill: "#3b82f6" },
  ],
  monthlyRequests: [
    { month: "Jan", requests: 45, approvals: 38 },
    { month: "Feb", requests: 52, approvals: 44 },
    { month: "Mar", requests: 48, approvals: 41 },
    { month: "Apr", requests: 61, approvals: 52 },
    { month: "May", requests: 55, approvals: 47 },
    { month: "Jun", requests: 67, approvals: 58 },
    { month: "Jul", requests: 72, approvals: 62 },
    { month: "Aug", requests: 58, approvals: 50 },
  ],
  requestsByService: [
    { service: "MRI", requests: 34, fill: "#3b82f6" },
    { service: "Physical Therapy", requests: 28, fill: "#8b5cf6" },
    { service: "Surgery", requests: 24, fill: "#ec4899" },
    { service: "Specialist Referral", requests: 19, fill: "#14b8a6" },
    { service: "CT Scan", requests: 16, fill: "#f59e0b" },
  ],
};

// ============================================================================
// ANALYTICS DATA - Time-based metrics
// ============================================================================
export const DEMO_ANALYTICS = {
  averageApprovalRate: 84.2,
  averageRejectionRate: 12.5,
  averagePendingRate: 3.3,
  averageReviewTime: 4.2, // hours
  totalRequestsProcessed: 245,
  totalRequestsPending: 12,
  aiAccuracy: 91.7,
  humanAIAgreement: 87.3,
  overrideRate: 8.2,
};
