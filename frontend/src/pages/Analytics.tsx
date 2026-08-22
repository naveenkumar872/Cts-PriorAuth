import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { mockTrendData, mockDashboardStats, mockServices, mockInsurancePlans } from '@/lib/mockData'

const approvalData = [
  { name: 'Approved', value: mockDashboardStats.approved, color: '#10b981' },
  { name: 'Denied', value: Math.round(mockDashboardStats.total_requests * mockDashboardStats.denial_rate), color: '#ef4444' },
  { name: 'Pending', value: mockDashboardStats.pending_requests, color: '#f59e0b' },
  { name: 'In Review', value: mockDashboardStats.nurse_review, color: '#0eadb9' },
]

const serviceData = mockServices.map((s, i) => ({
  name: s.name.split(' ').slice(0,2).join(' '),
  requests: [24, 38, 15, 12, 8][i] || 10,
}))

const planData = mockInsurancePlans.slice(0,3).map((p, i) => ({
  name: p.provider,
  requests: [52, 38, 24][i],
}))

const confidenceData = [
  { range: '0–20%', count: 2 },
  { range: '20–40%', count: 5 },
  { range: '40–60%', count: 12 },
  { range: '60–80%', count: 28 },
  { range: '80–100%', count: 45 },
]

export default function Analytics() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Analytics & Reports</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Authorization performance metrics and insights</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Approval Rate', value: `${Math.round(mockDashboardStats.approval_rate * 100)}%`, color: 'text-[#10b981]', bg: 'bg-[#ecfdf5] dark:bg-[#10b981]/15' },
          { label: 'Denial Rate', value: `${Math.round(mockDashboardStats.denial_rate * 100)}%`, color: 'text-[#ef4444]', bg: 'bg-[#fef2f2] dark:bg-[#ef4444]/15' },
          { label: 'Nurse Review Rate', value: `${Math.round((mockDashboardStats.nurse_review / mockDashboardStats.total_requests) * 100)}%`, color: 'text-[#0eadb9]', bg: 'bg-[#e0f7f8] dark:bg-[#0eadb9]/15' },
          { label: 'Avg Processing Time', value: `${mockDashboardStats.avg_processing_time}d`, color: 'text-[#f59e0b]', bg: 'bg-[#fffbeb] dark:bg-[#f59e0b]/15' },
        ].map(m => (
          <Card key={m.label} hover>
            <CardContent className="py-4 text-center">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-2 ${m.bg}`}>
                <span className={`text-lg font-bold ${m.color}`}>{m.value}</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wide">{m.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="col-span-2">
          <CardHeader><CardTitle>Authorization Volume</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={mockTrendData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="aGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0eadb9" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#0eadb9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Area type="monotone" dataKey="total" name="Total" stroke="#2563eb" strokeWidth={2} fill="url(#aGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Status Distribution</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={approvalData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                  {approvalData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {approvalData.map(d => (
                <div key={d.name} className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: d.color }} />
                  <span className="text-[10.5px] text-slate-500">{d.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle>Requests by Service</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={serviceData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="requests" fill="#2563eb" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Requests by Plan</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={planData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="requests" fill="#16a34a" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>AI Confidence Distribution</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={confidenceData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="range" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="count" fill="#7c3aed" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
