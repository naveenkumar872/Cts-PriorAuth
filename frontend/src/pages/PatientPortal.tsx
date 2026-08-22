import { useState } from 'react'
import { CheckCircle2, XCircle, Clock, FileText, AlertTriangle, ShieldCheck, ChevronRight, HelpCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { mockAuthRequests } from '@/lib/mockData'
import { formatDate } from '@/lib/utils'

export default function PatientPortal() {
  const [filter, setFilter] = useState<'all' | 'approved' | 'denied' | 'pending'>('all')

  const patientRequests = mockAuthRequests.map((r, i) => {
    // Add specific detailed rejection reasons for denied requests
    if (r.id === 4 || i === 3) {
      return {
        ...r,
        status: 'denied',
        denial_reason: 'Clinical notes lack documented 6 consecutive weeks of conservative physical therapy prior to authorizing advanced imaging as required by Policy Rule #PR-2024-88.',
        policy_reference: 'BlueCross Policy v2024.1 — Section 4.2: Advanced Imaging Criteria',
        appeal_instructions: 'Your doctor (Dr. Sarah Jenkins) can submit physical therapy attendance records or request a Peer-to-Peer physician review.',
      }
    }
    return r
  })

  const filteredRequests = patientRequests.filter((r) => {
    if (filter === 'approved') return r.status === 'approved'
    if (filter === 'denied') return r.status === 'denied'
    if (filter === 'pending') return r.status === 'pending' || r.status === 'in_review'
    return true
  })

  const approvedCount = patientRequests.filter(r => r.status === 'approved').length
  const deniedCount = patientRequests.filter(r => r.status === 'denied').length
  const pendingCount = patientRequests.filter(r => r.status === 'pending' || r.status === 'in_review').length

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[#0eadb9] to-[#00c4cc] rounded-3xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-white/20 backdrop-blur-md text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Patient Member Portal
              </span>
              <span className="text-white/80 text-xs font-mono">Member ID: MEM-884920</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold mt-2 tracking-tight">Welcome back, David Lee</h1>
            <p className="text-white/90 text-xs sm:text-sm mt-1 max-w-xl">
              Track your insurance authorization requests, view covered procedures, and review decision explanations.
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 text-left min-w-[200px]">
            <p className="text-white/70 text-[11px] font-bold uppercase tracking-wider">Insurance Plan</p>
            <p className="text-white font-bold text-sm mt-0.5">BlueCross Premier PPO</p>
            <p className="text-white/80 text-xs mt-0.5">Group #993021 • Active</p>
          </div>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div
          onClick={() => setFilter('all')}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${filter === 'all' ? 'bg-[#e0f7f8] border-[#0eadb9] ring-2 ring-[#0eadb9]' : 'bg-white border-slate-200 hover:border-slate-300'}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-500">Total Requests</span>
            <FileText className="w-4 h-4 text-[#0eadb9]" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-2">{patientRequests.length}</p>
        </div>

        <div
          onClick={() => setFilter('approved')}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${filter === 'approved' ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500' : 'bg-white border-slate-200 hover:border-slate-300'}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-emerald-700">Approved Coverages</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-extrabold text-emerald-700 mt-2">{approvedCount}</p>
        </div>

        <div
          onClick={() => setFilter('denied')}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${filter === 'denied' ? 'bg-rose-50 border-rose-500 ring-2 ring-rose-500' : 'bg-white border-slate-200 hover:border-slate-300'}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-rose-700">Denied & Rejections</span>
            <XCircle className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-2xl font-extrabold text-rose-700 mt-2">{deniedCount}</p>
        </div>

        <div
          onClick={() => setFilter('pending')}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${filter === 'pending' ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-500' : 'bg-white border-slate-200 hover:border-slate-300'}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-amber-700">Under Review</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-extrabold text-amber-700 mt-2">{pendingCount}</p>
        </div>
      </div>

      {/* Filter Tabs & Requests List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Your Authorization Requests</h2>
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${filter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'}`}
            >
              All ({patientRequests.length})
            </button>
            <button
              onClick={() => setFilter('approved')}
              className={`px-3 py-1.5 rounded-lg transition-all ${filter === 'approved' ? 'bg-white text-emerald-700 shadow-xs' : 'hover:text-slate-900'}`}
            >
              Approved ({approvedCount})
            </button>
            <button
              onClick={() => setFilter('denied')}
              className={`px-3 py-1.5 rounded-lg transition-all ${filter === 'denied' ? 'bg-white text-rose-700 shadow-xs' : 'hover:text-slate-900'}`}
            >
              Denied & Rejections ({deniedCount})
            </button>
          </div>
        </div>

        {/* List of Requests */}
        <div className="space-y-4">
          {filteredRequests.map((req) => {
            const isDenied = req.status === 'denied'
            const isApproved = req.status === 'approved'

            return (
              <Card key={req.id} className="overflow-hidden border border-slate-200 rounded-2xl shadow-2xs hover:border-[#0eadb9]/40 transition-all">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded font-semibold">
                          PA-{String(req.id).padStart(3, '0')}
                        </span>
                        <span className="text-xs text-slate-400">Submitted on {formatDate(req.submitted_at)}</span>
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 mt-1">{req.service?.name}</h3>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">Code: {req.service?.code} • Provider: {req.provider?.name}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      {isApproved && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Approved for Coverage</span>
                        </div>
                      )}
                      {isDenied && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
                          <XCircle className="w-4 h-4 text-rose-600" />
                          <span>Request Rejected / Denied</span>
                        </div>
                      )}
                      {!isApproved && !isDenied && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold">
                          <Clock className="w-4 h-4 text-amber-600" />
                          <span>Under Review by Insurance</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Diagnosis Details */}
                  <div className="py-3 text-xs text-slate-600">
                    <span className="font-semibold text-slate-700">Diagnosis / Condition: </span>
                    <span>{req.diagnosis}</span>
                  </div>

                  {/* REJECTION REASONS CARD FOR DENIED CLAIMS */}
                  {isDenied && (
                    <div className="mt-3 p-4 rounded-xl bg-rose-50/80 border border-rose-200/80 text-left space-y-3">
                      <div className="flex items-center gap-2 text-rose-800 font-bold text-xs">
                        <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                        <span>Why Was This Request Rejected? (Denial Rationale)</span>
                      </div>
                      <p className="text-xs text-slate-800 leading-relaxed font-medium bg-white/70 p-3 rounded-lg border border-rose-100">
                        "{req.denial_reason}"
                      </p>
                      
                      {req.policy_reference && (
                        <p className="text-[11px] text-slate-500 font-mono">
                          📋 <span className="font-semibold">Policy Citation:</span> {req.policy_reference}
                        </p>
                      )}

                      {req.appeal_instructions && (
                        <div className="pt-2 border-t border-rose-200/60 flex items-start gap-2 text-xs text-rose-900">
                          <HelpCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold">Next Steps & How to Appeal: </span>
                            <span>{req.appeal_instructions}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* APPROVAL CARD FOR APPROVED CLAIMS */}
                  {isApproved && (
                    <div className="mt-3 p-3 rounded-xl bg-emerald-50/60 border border-emerald-100 text-xs text-emerald-900 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <span>This procedure is 100% authorized under your plan. No further action needed.</span>
                      </div>
                      <span className="font-mono text-[11px] text-emerald-700 font-bold">Auth ID: AUTH-883920</span>
                    </div>
                  )}

                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
