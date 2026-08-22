import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Brain, UserCheck, BookOpen, FileText, User, Stethoscope, AlertCircle, CheckCircle, XCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { mockAuthRequests } from '@/lib/mockData'
import { formatDate, formatDateTime, formatConfidence, getInitials } from '@/lib/utils'
import { AuthStatus, Priority, AIRecommendation } from '@/types'

const statusVariant: Record<AuthStatus, 'pending' | 'primary' | 'success' | 'danger'> = {
  [AuthStatus.PENDING]: 'pending',
  [AuthStatus.IN_REVIEW]: 'primary',
  [AuthStatus.APPROVED]: 'success',
  [AuthStatus.DENIED]: 'danger',
}
const priorityVariant: Record<Priority, 'slate' | 'blue' | 'pending' | 'danger'> = {
  [Priority.LOW]: 'slate',
  [Priority.MEDIUM]: 'blue',
  [Priority.HIGH]: 'pending',
  [Priority.URGENT]: 'danger',
}

export default function AuthDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const req = mockAuthRequests.find((r) => r.id === Number(id))

  if (!req) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-500">
        <AlertCircle className="w-10 h-10 mb-3 opacity-40" />
        <p className="font-medium">Authorization request not found</p>
        <button onClick={() => navigate('/auth-requests')} className="mt-3 text-sm text-[#2563eb] hover:underline">
          Back to requests
        </button>
      </div>
    )
  }

  const aiDecision = req.ai_decisions?.[0]

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/auth-requests')} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-[#232833] transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
                PA-{String(req.id).padStart(3, '0')}
              </h1>
              <Badge variant={statusVariant[req.status]}>{req.status.replace('_', ' ')}</Badge>
              <Badge variant={priorityVariant[req.priority]}>{req.priority}</Badge>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">Submitted {formatDateTime(req.submitted_at)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => navigate('/policy-companion')} className="gap-1.5">
            <BookOpen className="w-3.5 h-3.5" /> View Policy
          </Button>
          <Button variant="secondary" size="sm" onClick={() => navigate('/nurse-review')} className="gap-1.5">
            <UserCheck className="w-3.5 h-3.5" /> Send to Nurse
          </Button>
          <Button size="sm" onClick={() => navigate(`/auth-requests/${req.id}/triage`)} className="gap-1.5">
            <Brain className="w-3.5 h-3.5" /> Run AI Triage
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* Left column */}
        <div className="col-span-2 space-y-4">
          {/* Patient info */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><User className="w-4 h-4 text-[#2563eb]" />Patient Information</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-[#2563eb]/10 flex items-center justify-center text-[#2563eb] font-semibold">
                  {getInitials(req.patient?.name || '')}
                </div>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{req.patient?.name}</p>
                  <p className="text-xs text-slate-500">{req.patient?.member_id}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div><p className="text-xs text-slate-500 mb-0.5 uppercase font-bold tracking-wide">Date of Birth</p><p className="text-slate-800 dark:text-slate-200">{formatDate(req.patient?.date_of_birth || '')}</p></div>
                <div><p className="text-xs text-slate-500 mb-0.5 uppercase font-bold tracking-wide">Gender</p><p className="text-slate-800 dark:text-slate-200 capitalize">{req.patient?.gender || '—'}</p></div>
                <div><p className="text-xs text-slate-500 mb-0.5 uppercase font-bold tracking-wide">Insurance Plan</p><p className="text-slate-800 dark:text-slate-200">{req.patient?.insurance_plan?.name || '—'}</p></div>
              </div>
            </CardContent>
          </Card>

          {/* Request info */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="w-4 h-4 text-[#2563eb]" />Request Information</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                <div><p className="text-xs text-slate-500 mb-0.5 uppercase font-bold tracking-wide">Service</p><p className="text-slate-800 dark:text-slate-200">{req.service?.name}</p><p className="text-xs text-slate-400 font-mono">{req.service?.code}</p></div>
                <div><p className="text-xs text-slate-500 mb-0.5 uppercase font-bold tracking-wide">Provider</p><p className="text-slate-800 dark:text-slate-200">{req.provider?.name}</p><p className="text-xs text-slate-400">{req.provider?.organization}</p></div>
                <div><p className="text-xs text-slate-500 mb-0.5 uppercase font-bold tracking-wide">Diagnosis</p><p className="text-slate-800 dark:text-slate-200">{req.diagnosis}</p></div>
                <div><p className="text-xs text-slate-500 mb-0.5 uppercase font-bold tracking-wide">Submitted</p><p className="text-slate-800 dark:text-slate-200">{formatDateTime(req.submitted_at)}</p></div>
              </div>
            </CardContent>
          </Card>

          {/* Clinical notes */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Stethoscope className="w-4 h-4 text-[#2563eb]" />Clinical Notes</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-[#f9fafb] dark:bg-[#12151c] rounded-lg p-4">
                {req.clinical_notes || 'No clinical notes provided.'}
              </p>
            </CardContent>
          </Card>

          {/* Documents */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="w-4 h-4 text-[#2563eb]" />Supporting Documents</CardTitle></CardHeader>
            <CardContent>
              {req.documents && req.documents.length > 0 ? (
                <ul className="space-y-2">
                  {req.documents.map(doc => (
                    <li key={doc.id} className="flex items-center gap-3 p-3 rounded-lg border border-[#e5e7eb] dark:border-[#232833]">
                      <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 capitalize">{doc.document_type.replace('_', ' ')}</p>
                        <p className="text-xs text-slate-400 truncate">{doc.file_url}</p>
                      </div>
                      <span className="text-xs text-slate-400">{formatDate(doc.uploaded_at)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-400 text-center py-6">No documents uploaded</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column — AI Summary */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Brain className="w-4 h-4 text-[#7c3aed]" />AI Summary</CardTitle></CardHeader>
            <CardContent>
              {aiDecision ? (
                <div className="space-y-4">
                  <div className="text-center py-4 rounded-lg bg-[#f9fafb] dark:bg-[#12151c]">
                    {aiDecision.recommendation === AIRecommendation.APPROVE && <CheckCircle className="w-8 h-8 text-[#16a34a] mx-auto mb-2" />}
                    {aiDecision.recommendation === AIRecommendation.DENY && <XCircle className="w-8 h-8 text-[#dc2626] mx-auto mb-2" />}
                    {aiDecision.recommendation === AIRecommendation.ESCALATE && <AlertCircle className="w-8 h-8 text-[#f59e0b] mx-auto mb-2" />}
                    <p className="text-lg font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide">{aiDecision.recommendation}</p>
                    <p className="text-2xl font-bold mt-1" style={{ color: aiDecision.recommendation === 'approve' ? '#16a34a' : aiDecision.recommendation === 'deny' ? '#dc2626' : '#f59e0b' }}>
                      {formatConfidence(aiDecision.confidence_score)}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">confidence</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Confidence</p>
                    <div className="w-full h-2 bg-slate-100 dark:bg-[#232833] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${aiDecision.confidence_score * 100}%`, backgroundColor: aiDecision.recommendation === 'approve' ? '#16a34a' : aiDecision.recommendation === 'deny' ? '#dc2626' : '#f59e0b' }} />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1.5">Reasoning</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{aiDecision.reasoning}</p>
                  </div>
                  <button onClick={() => navigate(`/auth-requests/${req.id}/triage`)} className="w-full py-2 text-sm font-medium text-[#2563eb] border border-[#2563eb]/30 rounded-lg hover:bg-[#2563eb]/5 transition-colors">
                    View Full Triage →
                  </button>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <Brain className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No AI triage yet</p>
                  <button onClick={() => navigate(`/auth-requests/${req.id}/triage`)} className="mt-3 text-sm font-medium text-[#2563eb] hover:underline">
                    Run Triage →
                  </button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Final decision */}
          {req.authorization_decisions && req.authorization_decisions.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Final Decision</CardTitle></CardHeader>
              <CardContent>
                {req.authorization_decisions.map(d => (
                  <div key={d.id}>
                    <Badge variant={d.decision === 'approved' ? 'success' : d.decision === 'denied' ? 'danger' : 'pending'} className="mb-3">{d.decision}</Badge>
                    <p className="text-xs text-slate-600 dark:text-slate-400">{d.reason}</p>
                    <p className="text-xs text-slate-400 mt-2">by {d.decider?.name} · {formatDate(d.decided_at)}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
