import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Brain, CheckCircle, XCircle, AlertCircle, ShieldCheck, FileText, Zap } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { mockAuthRequests, mockPolicies } from '@/lib/mockData'
import { formatConfidence, formatDateTime } from '@/lib/utils'
import { AIRecommendation } from '@/types'

const decisionFactors = [
  { label: 'Coverage requirement', met: true },
  { label: 'Medical necessity', met: true },
  { label: 'Patient eligibility', met: true },
  { label: 'Required documentation', met: true },
  { label: 'Policy match', met: true },
]

export default function AITriage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const req = mockAuthRequests.find((r) => r.id === Number(id))
  const aiDecision = req?.ai_decisions?.[0]
  const relatedPolicy = mockPolicies[0]

  if (!req) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-500">
        <AlertCircle className="w-10 h-10 mb-3 opacity-40" />
        <p>Authorization request not found</p>
        <button onClick={() => navigate('/auth-requests')} className="mt-3 text-sm text-[#2563eb] hover:underline">Back</button>
      </div>
    )
  }

  const rec = aiDecision?.recommendation ?? AIRecommendation.APPROVE
  const confidence = aiDecision?.confidence_score ?? 0.94
  const recColor = rec === AIRecommendation.APPROVE ? '#16a34a' : rec === AIRecommendation.DENY ? '#dc2626' : '#f59e0b'
  const recBg = rec === AIRecommendation.APPROVE ? '#f0fdf4' : rec === AIRecommendation.DENY ? '#fef2f2' : '#fffbeb'
  const RecIcon = rec === AIRecommendation.APPROVE ? CheckCircle : rec === AIRecommendation.DENY ? XCircle : AlertCircle

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(`/auth-requests/${id}`)} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-[#232833] transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-[#7c3aed]" />
              <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">AI Triage</h1>
              <span className="font-mono text-sm text-slate-500 bg-slate-100 dark:bg-[#232833] px-2 py-0.5 rounded">PA-{String(req.id).padStart(3, '0')}</span>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">{req.patient?.name} · {req.service?.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => navigate('/policy-companion')} className="gap-1.5">
            <FileText className="w-3.5 h-3.5" /> View Policy
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* Left — Main AI output */}
        <div className="col-span-2 space-y-4">
          {/* AI Recommendation hero */}
          <Card>
            <CardContent className="py-6">
              <div className="flex items-center gap-6">
                <div className="flex-shrink-0 w-28 h-28 rounded-2xl flex flex-col items-center justify-center" style={{ backgroundColor: recBg }}>
                  <RecIcon className="w-8 h-8 mb-1" style={{ color: recColor }} />
                  <p className="text-xs font-bold uppercase tracking-widest" style={{ color: recColor }}>{rec}</p>
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1">AI Recommendation</p>
                  <p className="text-3xl font-bold uppercase tracking-wide mb-3" style={{ color: recColor }}>{rec}</p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-3 bg-slate-100 dark:bg-[#232833] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${confidence * 100}%`, backgroundColor: recColor }} />
                    </div>
                    <span className="text-lg font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                      {formatConfidence(confidence)} confidence
                    </span>
                  </div>
                  {aiDecision && (
                    <p className="text-xs text-slate-400 mt-2">Processed {formatDateTime(aiDecision.created_at)}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Decision factors */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-[#16a34a]" />Decision Factors</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {decisionFactors.map((f) => (
                  <li key={f.label} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-[#f9fafb] dark:bg-[#12151c]">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${f.met ? 'bg-[#dcfce7]' : 'bg-[#fee2e2]'}`}>
                      {f.met
                        ? <CheckCircle className="w-3.5 h-3.5 text-[#16a34a]" />
                        : <XCircle className="w-3.5 h-3.5 text-[#dc2626]" />}
                    </div>
                    <span className="text-sm text-slate-700 dark:text-slate-300">{f.label}</span>
                    <Badge variant={f.met ? 'success' : 'danger'} className="ml-auto">{f.met ? 'Met' : 'Not met'}</Badge>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* AI Reasoning */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Zap className="w-4 h-4 text-[#f59e0b]" />AI Reasoning</CardTitle></CardHeader>
            <CardContent>
              <div className="bg-[#f9fafb] dark:bg-[#12151c] rounded-lg p-4 border-l-4" style={{ borderColor: recColor }}>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  {aiDecision?.reasoning || 'Clinical documentation reviewed against policy criteria. All major eligibility and coverage requirements have been evaluated based on the submitted diagnosis and clinical notes.'}
                </p>
              </div>
              <p className="text-xs text-slate-400 mt-3 italic">
                This recommendation is generated by AI and should be reviewed by a qualified clinician before final authorization.
              </p>
            </CardContent>
          </Card>

          {/* Policy match */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="w-4 h-4 text-[#2563eb]" />Policy Match</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{relatedPolicy.name}</p>
                  <p className="text-xs text-slate-500">Version {relatedPolicy.version} · {relatedPolicy.insurance_plan?.name}</p>
                </div>
                <Badge variant="success">Matched</Badge>
              </div>
              <div className="space-y-3">
                {relatedPolicy.rules?.map((rule) => (
                  <div key={rule.id} className="p-3 rounded-lg border border-[#e5e7eb] dark:border-[#232833]">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-3.5 h-3.5 text-[#16a34a] mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-slate-800 dark:text-slate-200">{rule.rule}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{rule.requirement}</p>
                        {rule.source_reference && (
                          <p className="text-[10.5px] text-[#2563eb] mt-1 font-mono">{rule.source_reference}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right — Actions */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Take Action</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Button variant="success" className="w-full gap-2 justify-center">
                <CheckCircle className="w-4 h-4" /> Approve
              </Button>
              <Button variant="danger" className="w-full gap-2 justify-center">
                <XCircle className="w-4 h-4" /> Deny
              </Button>
              <Button variant="secondary" className="w-full gap-2 justify-center text-[#f59e0b] border-[#f59e0b]/30 hover:bg-[#f59e0b]/5">
                <AlertCircle className="w-4 h-4" /> Escalate to Nurse
              </Button>
              <div className="border-t border-[#e5e7eb] dark:border-[#232833] pt-3">
                <button onClick={() => navigate(`/final-decision/${req.id}`)} className="w-full py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-[#2563eb] transition-colors">
                  View Final Decision →
                </button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Request Summary</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {[
                { label: 'Patient', value: req.patient?.name },
                { label: 'Service', value: req.service?.name },
                { label: 'Provider', value: req.provider?.name },
                { label: 'Insurance', value: req.patient?.insurance_plan?.name },
                { label: 'Priority', value: req.priority },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">{label}</span>
                  <span className="text-slate-800 dark:text-slate-200 font-medium text-right max-w-[150px] truncate capitalize">{value}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
