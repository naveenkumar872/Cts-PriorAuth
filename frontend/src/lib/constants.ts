import { AuthStatus, Priority, AIRecommendation, NurseDecision, FinalDecision } from '@/types'

export const STATUS_COLORS = {
  [AuthStatus.PENDING]: 'pending',
  [AuthStatus.IN_REVIEW]: 'primary',
  [AuthStatus.APPROVED]: 'success',
  [AuthStatus.DENIED]: 'danger',
} as const

export const PRIORITY_COLORS = {
  [Priority.LOW]: 'slate',
  [Priority.MEDIUM]: 'blue',
  [Priority.HIGH]: 'pending',
  [Priority.URGENT]: 'danger',
} as const

export const AI_RECOMMENDATION_COLORS = {
  [AIRecommendation.APPROVE]: 'success',
  [AIRecommendation.DENY]: 'danger',
  [AIRecommendation.ESCALATE]: 'pending',
} as const

export const NURSE_DECISION_COLORS = {
  [NurseDecision.APPROVE]: 'success',
  [NurseDecision.DENY]: 'danger',
  [NurseDecision.ESCALATE]: 'pending',
  [NurseDecision.REQUEST_INFO]: 'primary',
} as const

export const FINAL_DECISION_COLORS = {
  [FinalDecision.APPROVED]: 'success',
  [FinalDecision.DENIED]: 'danger',
  [FinalDecision.APPEALED]: 'pending',
  [FinalDecision.CANCELLED]: 'slate',
} as const

export const STATUS_LABELS = {
  [AuthStatus.PENDING]: 'Pending',
  [AuthStatus.IN_REVIEW]: 'In Review',
  [AuthStatus.APPROVED]: 'Approved',
  [AuthStatus.DENIED]: 'Denied',
}

export const PRIORITY_LABELS = {
  [Priority.LOW]: 'Low',
  [Priority.MEDIUM]: 'Medium',
  [Priority.HIGH]: 'High',
  [Priority.URGENT]: 'Urgent',
}
