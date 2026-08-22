import { useState } from 'react'
import { Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { mockAuthRequests } from '@/lib/mockData'
import { formatDate, getInitials } from '@/lib/utils'
import { AuthStatus, Priority } from '@/types'

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

export default function History() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [page, setPage] = useState(1)
  const perPage = 8

  const filtered = mockAuthRequests.filter(r => {
    const q = search.toLowerCase()
    return (
      (!q || r.patient?.name.toLowerCase().includes(q) || r.service?.name.toLowerCase().includes(q)) &&
      (!statusFilter || r.status === statusFilter) &&
      (!priorityFilter || r.priority === priorityFilter)
    )
  })
  const totalPages = Math.ceil(filtered.length / perPage)
  const paged = filtered.slice((page-1)*perPage, page*perPage)

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">Authorization History</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Complete history of all authorization requests</p>
      </div>

      <Card>
        <div className="flex items-center gap-3 px-4 py-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Search history..." className="w-full h-9 pl-9 pr-3 text-sm rounded-lg border border-[#e5e7eb] dark:border-[#232833] bg-[#f9fafb] dark:bg-[#12151c] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563eb]" />
          </div>
          <Filter className="w-4 h-4 text-slate-400" />
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }} className="h-9 px-3 text-sm rounded-lg border border-[#e5e7eb] dark:border-[#232833] bg-white dark:bg-[#181c24] text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#2563eb]">
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="in_review">In Review</option>
            <option value="approved">Approved</option>
            <option value="denied">Denied</option>
          </select>
          <select value={priorityFilter} onChange={e => { setPriorityFilter(e.target.value); setPage(1) }} className="h-9 px-3 text-sm rounded-lg border border-[#e5e7eb] dark:border-[#232833] bg-white dark:bg-[#181c24] text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#2563eb]">
            <option value="">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          {(search || statusFilter || priorityFilter) && <button onClick={() => { setSearch(''); setStatusFilter(''); setPriorityFilter(''); setPage(1) }} className="text-xs text-[#2563eb] hover:underline">Clear</button>}
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#f1f5f9] dark:border-[#232833]">
                {['ID', 'Patient', 'Service', 'Provider', 'Priority', 'Status', 'Submitted', 'Final Decision'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f9fafb] dark:divide-[#1e2634]">
              {paged.map(req => {
                const finalDec = req.authorization_decisions?.[0]
                return (
                  <tr key={req.id} onClick={() => navigate(`/auth-requests/${req.id}`)} className="hover:bg-[#f9fafb] dark:hover:bg-[#1a1e28] cursor-pointer transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-slate-500 bg-slate-100 dark:bg-[#232833] rounded m-1">PA-{String(req.id).padStart(3,'0')}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[#2563eb]/10 flex items-center justify-center text-[#2563eb] text-xs font-semibold">{getInitials(req.patient?.name || '')}</div>
                        <span className="text-[13px] text-slate-800 dark:text-slate-200">{req.patient?.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[13px] text-slate-700 dark:text-slate-300">{req.service?.name}</td>
                    <td className="px-4 py-3 text-[13px] text-slate-700 dark:text-slate-300">{req.provider?.name}</td>
                    <td className="px-4 py-3"><Badge variant={priorityVariant[req.priority]}>{req.priority}</Badge></td>
                    <td className="px-4 py-3"><Badge variant={statusVariant[req.status]}>{req.status.replace('_',' ')}</Badge></td>
                    <td className="px-4 py-3 text-[13px] text-slate-500 whitespace-nowrap">{formatDate(req.submitted_at)}</td>
                    <td className="px-4 py-3">
                      {finalDec ? <Badge variant={finalDec.decision === 'approved' ? 'success' : finalDec.decision === 'denied' ? 'danger' : 'pending'}>{finalDec.decision}</Badge> : <span className="text-xs text-slate-400">—</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#f1f5f9] dark:border-[#232833]">
            <p className="text-xs text-slate-500">Showing {(page-1)*perPage+1}–{Math.min(page*perPage, filtered.length)} of {filtered.length}</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1} className="p-1.5 rounded border border-[#e5e7eb] dark:border-[#232833] disabled:opacity-40 disabled:cursor-not-allowed"><ChevronLeft className="w-4 h-4" /></button>
              <button onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages} className="p-1.5 rounded border border-[#e5e7eb] dark:border-[#232833] disabled:opacity-40 disabled:cursor-not-allowed"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
