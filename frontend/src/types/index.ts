// Core data types for PriorAuth AI platform

export type AuthorizationStatus =
  | "Approved"
  | "Not Approved"
  | "More Information Required"
  | "Nurse Review Required"
  | "Pending Review"
  | "Under Review"
  | "Denied"
  | "Rejected";

export type RuleDecision = "Approved" | "Not Approved" | "More Information Required" | "Nurse Review Required";

export interface MLComplexityPrediction {
  predictedComplexity: "high" | "medium" | "low";
  complexityRank: number;
  confidenceScore: number;
  featuresUsed?: Record<string, any>;
  modelUsed?: string;
  predictedAt?: string;
}

export interface RuleEvaluation {
  decision: RuleDecision;
  reason: string;
  missingInformation: string[];
  exclusions?: string[];
  pathways: Array<{ pathwayId: string; passed: boolean; unknown: boolean; conditions: string[] }>;
  evaluatedAt?: string | null;
  mlComplexity?: MLComplexityPrediction;
}

export type RiskLevel = "high" | "medium" | "low";

export type Priority = "urgent" | "high" | "normal" | "low";

export interface Patient {
  id: string;
  name: string;
  dob: string;
  memberId: string;
  groupId: string;
  plan: string;
  payer: string;
  gender: "Male" | "Female" | "Other";
  phone: string;
  address: string;
  primaryCare: string;
}

export interface Provider {
  id: string;
  name: string;
  npi: string;
  specialty: string;
  organization: string;
  phone: string;
  fax: string;
  address: string;
  taxId: string;
}

export interface Diagnosis {
  code: string;
  description: string;
  type: "primary" | "secondary";
}

export interface Procedure {
  code: string;
  description: string;
  modifier?: string;
  quantity: number;
  serviceDate: string;
  placeOfService: string;
}

export interface AuthorizationRequest {
  id: string;
  caseNumber: string;
  patient: Patient;
  provider: Provider;
  diagnoses: Diagnosis[];
  procedures: Procedure[];
  status: AuthorizationStatus;
  priority: Priority;
  riskLevel: RiskLevel;
  submittedAt: string;
  updatedAt: string;
  dueDate: string;
  assignedTo?: string;
  clinicalNotes?: string;
  documents: ClinicalDocument[];
  aiRecommendation?: AIRecommendation;
  ruleEvaluation?: RuleEvaluation;
  // Module 4 & 5
  policyId?: string | null;
  policyContext?: Record<string, any> | null;
  auditLog: AuditEntry[];
}

export interface ClinicalDocument {
  id: string;
  name: string;
  type: "lab_result" | "imaging" | "clinical_note" | "referral" | "prior_auth" | "insurance_card";
  uploadedAt: string;
  uploadedBy: string;
  size: string;
  url?: string;
}

export interface AIRecommendation {
  decision: "Approve" | "Deny" | "Request More Info" | "Escalate";
  confidence: number;
  reasoning: string;
  keyFactors: AIFactor[];
  missingInfo: string[];
  policyReferences: PolicyReference[];
  generatedAt: string;
  modelVersion: string;
}

export interface AIFactor {
  name: string;
  impact: "positive" | "negative" | "neutral";
  weight: number;
  description: string;
}

export interface PolicyReference {
  id: string;
  title: string;
  section: string;
  relevanceScore: number;
  excerpt: string;
  url?: string;
}

export interface AuditEntry {
  id: string;
  action: string;
  performedBy: string;
  role: string;
  timestamp: string;
  details: string;
  previousValue?: string;
  newValue?: string;
}

export interface ValidationIssue {
  id: string;
  field: string;
  severity: "critical" | "warning" | "info";
  message: string;
  resolution?: string;
}

export interface WhatIfScenario {
  id: string;
  name: string;
  changes: Record<string, string | number | boolean>;
  predictedOutcome: "Approve" | "Deny" | "Request More Info";
  confidenceChange: number;
  rationale: string;
}

export interface KPIMetric {
  label: string;
  value: string | number;
  change: number;
  changeLabel: string;
  trend: "up" | "down" | "flat";
  icon: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  sources?: PolicyReference[];
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "success" | "error";
  timestamp: string;
  read: boolean;
  caseId?: string;
}
