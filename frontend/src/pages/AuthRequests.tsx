import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Filter, Plus, ArrowUpDown, Eye, Brain, ChevronLeft, ChevronRight } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { mockAuthRequests } from '@/lib/mockData'
import { formatDate, formatConfidence, getInitials } from '@/lib/utils'
import { AuthStatus, Priority, AIRecommendation } from '@/types'

const statusVariant = {
  [AuthStatus.PENDING]: 'pending',
  [AuthStatus.IN_REVIEW]: 'primary',
  [AuthStatus.APPROVED]: 'success',
  [AuthStatus.DENIED]: 'danger',
} as const

const priorityVariant = {
  [Priority.LOW]: 'slate',
  [Priority.MEDIUM]: 'blue',
  [Priority.HIGH]: 'pending',
  [Priority.URGENT]: 'danger',
} as const

const aiVariant = {
  [AIRecommendation.APPROVE]: 'success',
  [AIRecommendation.DENY]: 'danger',
  [AIRecommendation.ESCALATE]: 'pending',
} as const

export default function AuthRequests() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [page, setPage] = useState(1)
  const perPage = 10

  const filtered = mockAuthRequests.filter((r) => {
    const q = search.toLowerCase()
    const matchesSearch =
      !q ||
      r.patient?.name.toLowerCase().includes(q) ||
      r.service?.name.toLowerCase().includes(q) ||
      r.provider?.name.toLowerCase().includes(q) ||
      `PA-${String(r.id).padStart(3, '0')}`.toLowerCase().includes(q)
    const matchesStatus = !statusFilter || r.status === statusFilter
    const matchesPriority = !priorityFilter || r.priority === priorityFilter
    return matchesSearch && matchesStatus && matchesPriority
  })

  const totalPages = Math.ceil(filtered.length / perPage)
  const paged = filtered.slice((page - 1) * perPage, page * perPage)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">Authorization Requests</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{filtered.length} total requests</p>
        </div>
        <Button onClick={() => navigate('/auth-requests/new')} className="gap-2">
          <Plus className="w-4 h-4" /> New Authorization
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex items-center gap-3 px-4 py-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search by patient, service, or request ID..."
              className="w-full h-9 pl-9 pr-3 text-sm rounded-lg border border-[#e5e7eb] dark:border-[#232833] bg-[#f9fafb] dark:bg-[#12151c] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
            />
          </div>
          <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
            className="h-9 px-3 text-sm rounded-lg border border-[#e5e7eb] dark:border-[#232833] bg-white dark:bg-[#181c24] text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="in_review">In Review</option>
            <option value="approved">Approved</option>
            <option value="denied">Denied</option>
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => { setPriorityFilter(e.target.value); setPage(1) }}
            className="h-9 px-3 text-sm rounded-lg border border-[#e5e7eb] dark:border-[#232833] bg-white dark:bg-[#181c24] text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
          >
            <option value="">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          {(search || statusFilter || priorityFilter) && (
            <button onClick={() => { setSearch(''); setStatusFilter(''); setPriorityFilter(''); setPage(1) }} className="text-xs font-semibold text-[#0eadb9] hover:underline">
              Clear filters
            </button>
          )}
        </div>
      </Card>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#f1f5f9] dark:border-[#232833]">
                {[
                  { label: 'Request ID' }, { label: 'Patient' }, { label: 'Service' },
                  { label: 'Provider' }, { label: 'Priority' }, { label: 'AI Rec' },
                  { label: 'Status' }, { label: 'Submitted' }, { label: 'Actions' }
                ].map((h) => (
                  <th key={h.label} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    <span className="flex items-center gap-1">
                      {h.label}
                      {h.label !== 'Actions' && <ArrowUpDown className="w-3 h-3 opacity-40" />}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f9fafb] dark:divide-[#1e2634]">
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center text-slate-500 dark:text-slate-400">
                    <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="font-medium">No requests found</p>
                    <p className="text-xs mt-1">Try adjusting your search or filters</p>
                  </td>
                </tr>
              ) : paged.map((req) => {
                const aiDecision = req.ai_decisions?.[0]
                return (
                  <tr
                    key={req.id}
                    className="hover:bg-[#f9fafb] dark:hover:bg-[#1a1e28] cursor-pointer transition-colors"
                    onClick={() => navigate(`/auth-requests/${req.id}`)}
                  >
                    <td className="px-4 py-3.5">
                      <span className="font-mono text-xs text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-[#232833] px-2 py-0.5 rounded">
                        PA-{String(req.id).padStart(3, '0')}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[#0eadb9]/15 flex items-center justify-center text-[#0eadb9] text-xs font-bold flex-shrink-0">
                          {getInitials(req.patient?.name || '')}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900 dark:text-slate-100 text-[13px] whitespace-nowrap">{req.patient?.name}</p>
                          <p className="text-[10.5px] text-slate-400">{req.patient?.member_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-[13px] text-slate-700 dark:text-slate-300 whitespace-nowrap">{req.service?.name}</p>
                      <p className="text-[10.5px] text-slate-400 font-mono">{req.service?.code}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-[13px] text-slate-700 dark:text-slate-300 whitespace-nowrap">{req.provider?.name}</p>
                      <p className="text-[10.5px] text-slate-400">{req.provider?.organization}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge variant={priorityVariant[req.priority]}>{req.priority}</Badge>
                    </td>
                    <td className="px-4 py-3.5">
                      {aiDecision ? (
                        <div className="space-y-1">
                          <Badge variant={aiVariant[aiDecision.recommendation]}>{aiDecision.recommendation}</Badge>
                          <p className="text-[10.5px] text-slate-400">{formatConfidence(aiDecision.confidence_score)}</p>
                        </div>
                      ) : <span className="text-xs text-slate-400">Pending triage</span>}
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge variant={statusVariant[req.status]}>{req.status.replace('_', ' ')}</Badge>
                    </td>
                    <td className="px-4 py-3.5 text-[13px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {formatDate(req.submitted_at)}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => navigate(`/auth-requests/${req.id}`)}
                          className="p-1.5 rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-[#232833] hover:text-[#2563eb] transition-colors"
                          title="View details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => navigate(`/auth-requests/${req.id}/triage`)}
                          className="p-1.5 rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-[#232833] hover:text-[#7c3aed] transition-colors"
                          title="AI Triage"
                        >
                          <Brain className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#f1f5f9] dark:border-[#232833]">
            <p className="text-xs text-slate-500">
              Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, filtered.length)} of {filtered.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded border border-[#e5e7eb] dark:border-[#232833] text-slate-500 hover:bg-slate-50 dark:hover:bg-[#232833] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 text-xs rounded ${page === p ? 'bg-[#2563eb] text-white' : 'border border-[#e5e7eb] dark:border-[#232833] text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#232833]'}`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded border border-[#e5e7eb] dark:border-[#232833] text-slate-500 hover:bg-slate-50 dark:hover:bg-[#232833] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
