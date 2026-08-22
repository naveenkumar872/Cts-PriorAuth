import { useParams, useNavigate } from 'react-router-dom'
import { CheckCircle, XCircle, Download, ArrowLeft, LayoutDashboard, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { mockAuthRequests } from '@/lib/mockData'
import { formatDate, formatDateTime } from '@/lib/utils'
import { FinalDecision as FD } from '@/types'

export default function FinalDecision() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const req = mockAuthRequests.find(r => r.id === Number(id))
  const decision = req?.authorization_decisions?.[0]

  if (!req || !decision) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-500 space-y-3">
        <AlertCircle className="w-10 h-10 opacity-40" />
        <p className="font-medium">No final decision found for this request</p>
        <button onClick={() => navigate(`/auth-requests/${id}`)} className="text-sm text-[#2563eb] hover:underline">View Request Details</button>
      </div>
    )
  }

  const isApproved = decision.decision === FD.APPROVED
  const isDenied = decision.decision === FD.DENIED
  const decColor = isApproved ? '#16a34a' : isDenied ? '#dc2626' : '#f59e0b'
  const decBg = isApproved ? '#f0fdf4' : isDenied ? '#fef2f2' : '#fffbeb'
  const DecIcon = isApproved ? CheckCircle : isDenied ? XCircle : AlertCircle

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(`/auth-requests/${id}`)} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-[#232833] transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">Authorization Decision</h1>
      </div>

      {/* Hero decision card */}
      <Card>
        <CardContent className="py-8 text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: decBg }}>
            <DecIcon className="w-10 h-10" style={{ color: decColor }} />
          </div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Authorization Decision</p>
          <p className="text-4xl font-bold uppercase tracking-wide mb-2" style={{ color: decColor }}>{decision.decision}</p>
          <p className="text-sm text-slate-500">PA-{String(req.id).padStart(3,'0')} · {formatDateTime(decision.decided_at)}</p>
        </CardContent>
      </Card>

      {/* Details */}
      <Card>
        <CardHeader><CardTitle>Authorization Details</CardTitle></CardHeader>
        <CardContent className="divide-y divide-[#f1f5f9] dark:divide-[#232833]">
          {[
            { label: 'Authorization ID', value: `PA-${String(req.id).padStart(3,'0')}` },
            { label: 'Patient', value: req.patient?.name },
            { label: 'Member ID', value: req.patient?.member_id },
            { label: 'Service', value: req.service?.name },
            { label: 'Insurance Plan', value: req.patient?.insurance_plan?.name },
            { label: 'Provider', value: req.provider?.name },
            { label: 'Submitted', value: formatDate(req.submitted_at) },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between py-3">
              <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
              <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{value || '—'}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Decision reason */}
      <Card>
        <CardHeader><CardTitle>Decision Reason</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-[#f9fafb] dark:bg-[#12151c] rounded-lg p-4">
            {decision.reason || 'No reason provided.'}
          </p>
          <div className="flex items-center justify-between mt-4 text-xs text-slate-500">
            <span>Decided by <strong className="text-slate-700 dark:text-slate-300">{decision.decider?.name}</strong></span>
            <span>{formatDateTime(decision.decided_at)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2">
        <Button variant="secondary" className="gap-2">
          <Download className="w-4 h-4" /> Download Authorization
        </Button>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => navigate(`/auth-requests/${id}`)}>View Request</Button>
          <Button onClick={() => navigate('/dashboard')} className="gap-2">
            <LayoutDashboard className="w-4 h-4" /> Return to Dashboard
          </Button>
        </div>
      </div>
    </div>
  )
}
