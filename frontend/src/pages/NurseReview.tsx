import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserCheck, CheckCircle, XCircle, AlertCircle, MessageSquare, Eye } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { mockAuthRequests } from '@/lib/mockData'
import { formatDate, formatConfidence, getInitials } from '@/lib/utils'
import { AuthStatus, AIRecommendation } from '@/types'

const aiVariant = {
  [AIRecommendation.APPROVE]: 'success',
  [AIRecommendation.DENY]: 'danger',
  [AIRecommendation.ESCALATE]: 'pending',
} as const

export default function NurseReview() {
  const navigate = useNavigate()
  const [selected, setSelected] = useState<number | null>(null)
  const [notes, setNotes] = useState('')
  const [decision, setDecision] = useState<string | null>(null)

  const queue = mockAuthRequests.filter(r => r.status === AuthStatus.PENDING || r.status === AuthStatus.IN_REVIEW)
  const selectedReq = queue.find(r => r.id === selected)

  if (decision && selectedReq) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${decision === 'approve' ? 'bg-[#f0fdf4]' : decision === 'deny' ? 'bg-[#fef2f2]' : 'bg-[#fffbeb]'}`}>
          {decision === 'approve' && <CheckCircle className="w-8 h-8 text-[#16a34a]" />}
          {decision === 'deny' && <XCircle className="w-8 h-8 text-[#dc2626]" />}
          {decision === 'escalate' && <AlertCircle className="w-8 h-8 text-[#f59e0b]" />}
        </div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-1 capitalize">Review {decision}d</h2>
        <p className="text-sm text-slate-500">PA-{String(selectedReq.id).padStart(3,'0')} has been {decision}d.</p>
        <button onClick={() => { setDecision(null); setSelected(null); setNotes('') }} className="mt-4 text-sm text-[#2563eb] hover:underline">Back to queue</button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">Nurse Review Queue</h1>
          <p className="text-sm text-slate-500 mt-0.5">{queue.length} requests awaiting review</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Queue */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><UserCheck className="w-4 h-4 text-[#2563eb]" />Review Queue</CardTitle></CardHeader>
          <div className="divide-y divide-[#f1f5f9] dark:divide-[#232833]">
            {queue.map(req => {
              const ai = req.ai_decisions?.[0]
              return (
                <div
                  key={req.id}
                  onClick={() => setSelected(req.id)}
                  className={`px-4 py-3.5 cursor-pointer transition-colors ${selected === req.id ? 'bg-[#eff6ff] dark:bg-[#1e2a44]' : 'hover:bg-[#f9fafb] dark:hover:bg-[#1a1e28]'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#2563eb]/10 flex items-center justify-center text-[#2563eb] text-xs font-semibold flex-shrink-0">
                        {getInitials(req.patient?.name || '')}
                      </div>
                      <div>
                        <p className="text-[13px] font-medium text-slate-900 dark:text-slate-100">{req.patient?.name}</p>
                        <p className="text-xs text-slate-500">{req.service?.name}</p>
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      {ai && <Badge variant={aiVariant[ai.recommendation]}>{ai.recommendation}</Badge>}
                      <p className="text-[10.5px] text-slate-400">{formatDate(req.submitted_at)}</p>
                    </div>
                  </div>
                </div>
              )
            })}
            {queue.length === 0 && (
              <div className="px-4 py-12 text-center text-slate-400">
                <UserCheck className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No requests in queue</p>
              </div>
            )}
          </div>
        </Card>

        {/* Review panel */}
        {selectedReq ? (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>PA-{String(selectedReq.id).padStart(3,'0')} Review</CardTitle>
                <button onClick={() => navigate(`/auth-requests/${selectedReq.id}`)} className="flex items-center gap-1 text-xs text-[#2563eb] hover:underline">
                  <Eye className="w-3 h-3" /> Full details
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Patient */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Patient</p>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{selectedReq.patient?.name}</p>
                <p className="text-xs text-slate-500">{selectedReq.patient?.member_id} · {selectedReq.patient?.insurance_plan?.name}</p>
              </div>
              {/* Clinical info */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Clinical Information</p>
                <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">{selectedReq.diagnosis}</p>
                <p className="text-xs text-slate-600 dark:text-slate-400 bg-[#f9fafb] dark:bg-[#12151c] rounded p-2 leading-relaxed">{selectedReq.clinical_notes || 'No clinical notes.'}</p>
              </div>
              {/* AI recommendation */}
              {selectedReq.ai_decisions?.[0] && (
                <div className="p-3 rounded-lg border border-[#e5e7eb] dark:border-[#232833]">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">AI Recommendation</p>
                  <div className="flex items-center gap-3">
                    <Badge variant={aiVariant[selectedReq.ai_decisions[0].recommendation]}>
                      {selectedReq.ai_decisions[0].recommendation}
                    </Badge>
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {formatConfidence(selectedReq.ai_decisions[0].confidence_score)} confidence
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed">{selectedReq.ai_decisions[0].reasoning}</p>
                </div>
              )}
              {/* Notes */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-400 mb-1.5">Review Notes</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Add review notes..."
                  className="w-full h-24 px-3 py-2 text-sm rounded-lg border border-[#e5e7eb] dark:border-[#232833] bg-white dark:bg-[#181c24] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563eb] resize-none"
                />
              </div>
              {/* Actions */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Button variant="success" className="gap-1.5" onClick={() => setDecision('approve')}>
                  <CheckCircle className="w-3.5 h-3.5" /> Approve
                </Button>
                <Button variant="danger" className="gap-1.5" onClick={() => setDecision('deny')}>
                  <XCircle className="w-3.5 h-3.5" /> Deny
                </Button>
                <Button variant="secondary" className="gap-1.5 text-[#f59e0b]" onClick={() => setDecision('escalate')}>
                  <AlertCircle className="w-3.5 h-3.5" /> Escalate
                </Button>
                <Button variant="secondary" className="gap-1.5" onClick={() => setDecision('info_requested')}>
                  <MessageSquare className="w-3.5 h-3.5" /> Request Info
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center h-64 text-slate-400">
              <UserCheck className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">Select a request from the queue to review</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
