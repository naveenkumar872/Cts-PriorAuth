import { useNavigate } from 'react-router-dom'
import {
  FileText, Clock, CheckCircle, UserCheck, TrendingUp,
  TrendingDown, Plus, ChevronRight, CheckCheck,
  BookOpen, FilePlus, ArrowUpRight,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import {
  mockDashboardStats, mockTrendData, mockAuthRequests, mockActivityItems, currentUser,
} from '@/lib/mockData'
import { formatDate, formatConfidence, getInitials } from '@/lib/utils'
import { AuthStatus, Priority, AIRecommendation } from '@/types'

const statusVariant = {
  [AuthStatus.PENDING]: 'pending',
  [AuthStatus.IN_REVIEW]: 'primary',
  [AuthStatus.APPROVED]: 'success',
  [AuthStatus.DENIED]: 'danger',
} as const

const aiVariant = {
  [AIRecommendation.APPROVE]: 'success',
  [AIRecommendation.DENY]: 'danger',
  [AIRecommendation.ESCALATE]: 'pending',
} as const

const activityIcon = {
  authorization: CheckCheck,
  review: UserCheck,
  policy: BookOpen,
  request: FilePlus,
}

const activityColor = {
  authorization: 'text-[#16a34a]',
  review: 'text-[#0eadb9]',
  policy: 'text-[#00c4cc]',
  request: 'text-[#f59e0b]',
}

const stats = [
  {
    label: 'Total Requests',
    value: mockDashboardStats.total_requests,
    icon: FileText,
    change: '+12%',
    positive: true,
    color: 'text-[#0eadb9]',
    bg: 'bg-[#e0f7f8] dark:bg-[#0eadb9]/15',
  },
  {
    label: 'Pending Review',
    value: mockDashboardStats.pending_requests,
    icon: Clock,
    change: '+4%',
    positive: false,
    color: 'text-[#f59e0b]',
    bg: 'bg-[#fffbeb] dark:bg-[#f59e0b]/10',
  },
  {
    label: 'Approved',
    value: mockDashboardStats.approved,
    icon: CheckCircle,
    change: '+18%',
    positive: true,
    color: 'text-[#16a34a]',
    bg: 'bg-[#f0fdf4] dark:bg-[#16a34a]/10',
  },
  {
    label: 'Nurse Review',
    value: mockDashboardStats.nurse_review,
    icon: UserCheck,
    change: '-2%',
    positive: true,
    color: 'text-[#7c3aed]',
    bg: 'bg-[#f5f3ff] dark:bg-[#7c3aed]/10',
  },
]

export default function Dashboard() {
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
            Welcome back, {currentUser.name}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Here's what's happening with your authorization workload today.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select className="h-9 px-3 text-sm rounded-lg border border-[#e5e7eb] dark:border-[#232833] bg-white dark:bg-[#181c24] text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#2563eb]">
            <option>Last 30 days</option>
            <option>Last 7 days</option>
            <option>Last 90 days</option>
            <option>This year</option>
          </select>
          <Button onClick={() => navigate('/auth-requests/new')} className="gap-2">
            <Plus className="w-4 h-4" />
            New Authorization
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map((s) => {
          const Icon = s.icon
          return (
            <Card key={s.label} hover>
              <CardContent className="flex items-start gap-4 py-5">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${s.bg} flex-shrink-0`}>
                  <Icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">{s.label}</p>
                  <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mt-0.5 leading-none">{s.value}</p>
                  <div className="flex items-center gap-1 mt-1.5">
                    {s.positive ? (
                      <TrendingUp className="w-3 h-3 text-[#16a34a]" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-[#dc2626]" />
                    )}
                    <span className={`text-xs font-medium ${s.positive ? 'text-[#16a34a]' : 'text-[#dc2626]'}`}>
                      {s.change}
                    </span>
                    <span className="text-xs text-slate-400">vs last month</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Chart + Activity */}
      <div className="grid grid-cols-3 gap-4">
        {/* Trend chart */}
        <Card className="col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Authorization Trend</CardTitle>
              <span className="text-xs text-slate-500 dark:text-slate-400">Last 12 months</span>
            </div>
          </CardHeader>
          <CardContent className="pt-2 pb-4">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={mockTrendData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0eadb9" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#0eadb9" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorApproved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 4px 14px rgb(0 0 0 / 0.08)' }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="total" name="Total" stroke="#0eadb9" strokeWidth={2.5} fill="url(#colorTotal)" />
                <Area type="monotone" dataKey="approved" name="Approved" stroke="#10b981" strokeWidth={2.5} fill="url(#colorApproved)" />
                <Area type="monotone" dataKey="denied" name="Denied" stroke="#ef4444" strokeWidth={1.5} fill="none" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Activity</CardTitle>
              <button className="text-xs font-semibold text-[#0eadb9] hover:underline">View all</button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-[#f1f5f9] dark:divide-[#232833]">
              {mockActivityItems.map((item) => {
                const Icon = activityIcon[item.type]
                return (
                  <li key={item.id} className="flex items-start gap-3 px-6 py-3.5">
                    <div className={`mt-0.5 w-7 h-7 rounded-full flex items-center justify-center bg-slate-100 dark:bg-[#232833] flex-shrink-0`}>
                      <Icon className={`w-3.5 h-3.5 ${activityColor[item.type]}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-slate-800 dark:text-slate-200 leading-tight">{item.title}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-snug line-clamp-2">{item.description}</p>
                      <p className="text-[10.5px] text-slate-400 mt-1">{formatDate(item.timestamp)}</p>
                    </div>
                  </li>
                )
              })}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Recent Authorization Requests */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Authorization Requests</CardTitle>
            <button
              onClick={() => navigate('/auth-requests')}
              className="flex items-center gap-1 text-xs text-[#2563eb] hover:underline"
            >
              View all <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#f1f5f9] dark:border-[#232833]">
                {['Patient', 'Request ID', 'Service', 'AI Confidence', 'Recommendation', 'Status', 'Date', ''].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f9fafb] dark:divide-[#1e2634]">
              {mockAuthRequests.slice(0, 5).map((req) => {
                const aiDecision = req.ai_decisions?.[0]
                return (
                  <tr
                    key={req.id}
                    className="hover:bg-[#f9fafb] dark:hover:bg-[#1a1e28] cursor-pointer transition-colors"
                    onClick={() => navigate(`/auth-requests/${req.id}`)}
                  >
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-[#2563eb]/10 flex items-center justify-center text-[#2563eb] text-xs font-semibold flex-shrink-0">
                          {getInitials(req.patient?.name || '')}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900 dark:text-slate-100 text-[13px]">{req.patient?.name}</p>
                          <p className="text-[10.5px] text-slate-500">{req.patient?.member_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="font-mono text-xs text-slate-600 dark:text-slate-400">PA-{String(req.id).padStart(3, '0')}</span>
                    </td>
                    <td className="px-6 py-3.5">
                      <p className="text-[13px] text-slate-700 dark:text-slate-300">{req.service?.name}</p>
                      <p className="text-[10.5px] text-slate-400 font-mono">{req.service?.code}</p>
                    </td>
                    <td className="px-6 py-3.5">
                      {aiDecision ? (
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-slate-100 dark:bg-[#232833] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#2563eb] rounded-full"
                              style={{ width: `${aiDecision.confidence_score * 100}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                            {formatConfidence(aiDecision.confidence_score)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-3.5">
                      {aiDecision ? (
                        <Badge variant={aiVariant[aiDecision.recommendation]}>
                          {aiDecision.recommendation}
                        </Badge>
                      ) : <span className="text-xs text-slate-400">Pending</span>}
                    </td>
                    <td className="px-6 py-3.5">
                      <Badge variant={statusVariant[req.status]}>
                        {req.status.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="px-6 py-3.5 text-[13px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {formatDate(req.submitted_at)}
                    </td>
                    <td className="px-6 py-3.5">
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/auth-requests/${req.id}`) }}
                        className="flex items-center gap-1 text-xs text-[#2563eb] hover:underline"
                      >
                        View <ChevronRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
