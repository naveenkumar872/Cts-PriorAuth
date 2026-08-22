// User types
export enum UserRole {
  ADMIN = 'admin',
  NURSE = 'nurse',
  PHYSICIAN = 'physician',
  AUDITOR = 'auditor',
}

export interface User {
  id: number
  name: string
  email: string
  role: UserRole
  created_at: string
}

// Insurance & Patient types
export interface InsurancePlan {
  id: number
  name: string
  provider: string
  plan_type: string
  active: boolean
  created_at: string
  updated_at: string
}

export interface Patient {
  id: number
  name: string
  date_of_birth: string
  gender?: string
  member_id: string
  insurance_plan_id?: number
  insurance_plan?: InsurancePlan
  created_at: string
  updated_at: string
}

// Provider & Service types
export interface Provider {
  id: number
  name: string
  organization?: string
  license_number: string
  created_at: string
  updated_at: string
}

export interface Service {
  id: number
  name: string
  code: string
  description?: string
  created_at: string
  updated_at: string
}

// Authorization types
export enum AuthStatus {
  PENDING = 'pending',
  IN_REVIEW = 'in_review',
  APPROVED = 'approved',
  DENIED = 'denied',
}

export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export interface AuthorizationRequest {
  id: number
  patient_id: number
  provider_id: number
  service_id: number
  diagnosis: string
  clinical_notes?: string
  status: AuthStatus
  priority: Priority
  submitted_at: string
  patient?: Patient
  provider?: Provider
  service?: Service
  documents?: Document[]
  ai_decisions?: AIDecision[]
  nurse_reviews?: NurseReview[]
  authorization_decisions?: AuthorizationDecision[]
  denial_reason?: string
  policy_reference?: string
  appeal_instructions?: string
}

// Document types
export interface Document {
  id: number
  authorization_id: number
  document_type: string
  file_url: string
  uploaded_by: number
  uploaded_at: string
  uploader?: User
}

// Policy types
export interface Policy {
  id: number
  insurance_plan_id: number
  name: string
  version: string
  content: string
  active: boolean
  created_at: string
  updated_at: string
  rules?: PolicyRule[]
  insurance_plan?: InsurancePlan
}

export interface PolicyRule {
  id: number
  policy_id: number
  rule: string
  requirement: string
  source_reference?: string
}

// AI Decision types
export enum AIRecommendation {
  APPROVE = 'approve',
  DENY = 'deny',
  ESCALATE = 'escalate',
}

export interface AIDecision {
  id: number
  authorization_id: number
  recommendation: AIRecommendation
  confidence_score: number
  reasoning?: string
  created_at: string
}

// Nurse Review types
export enum NurseDecision {
  APPROVE = 'approve',
  DENY = 'deny',
  ESCALATE = 'escalate',
  REQUEST_INFO = 'request_info',
}

export interface NurseReview {
  id: number
  authorization_id: number
  nurse_id: number
  decision: NurseDecision
  notes?: string
  reviewed_at: string
  nurse?: User
}

// Final Decision types
export enum FinalDecision {
  APPROVED = 'approved',
  DENIED = 'denied',
  APPEALED = 'appealed',
  CANCELLED = 'cancelled',
}

export interface AuthorizationDecision {
  id: number
  authorization_id: number
  decided_by: number
  decision: FinalDecision
  reason?: string
  decided_at: string
  decider?: User
}

// Dashboard stats type
export interface DashboardStats {
  total_requests: number
  pending_requests: number
  approved: number
  nurse_review: number
  approval_rate: number
  denial_rate: number
  avg_processing_time: number
}

// Chart data types
export interface TrendData {
  date: string
  total: number
  approved: number
  denied: number
}

export interface ActivityItem {
  id: string
  type: 'authorization' | 'review' | 'policy' | 'request'
  title: string
  description: string
  timestamp: string
  user?: string
}
