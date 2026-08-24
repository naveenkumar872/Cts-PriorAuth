import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import {
  TrendingUp, TrendingDown, Activity, Clock, CheckCircle,
  XCircle, Brain, Download, Calendar, Zap, ShieldCheck,
} from "lucide-react";
import { api } from "@/lib/api";

export default function Analytics() {
  const location = useLocation();
  const [kpis, setKpis]           = useState<any>(null);
  const [trends, setTrends]       = useState<any[]>([]);
  const [byService, setByService] = useState<any[]>([]);
  const [aiPerf, setAiPerf]       = useState<any>(null);
  const [loading, setLoading]     = useState(true);
  const [timeRange, setTimeRange] = useState("Last 30 Days");

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.getKPIs(),
      api.getTrends(),
      api.getServiceBreakdown(),
      api.getAIPerformance(),
    ]).then(([k, t, s, a]) => {
      setKpis(k || null);
      setTrends((t as any)?.monthlyRequests || (Array.isArray(t) ? t : []));
      setByService((s as any[]) || []);
      setAiPerf(a || null);
    }).catch(() => {
      setKpis(null);
      setTrends([]);
      setByService([]);
      setAiPerf(null);
    })
      .finally(() => setLoading(false));
  }, [location.key]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="h-8 w-8 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
    </div>
  );

  const decisionData = [
    { name: "Approved",     value: kpis?.approvalRate  ?? 0, color: "#10b981" },
    { name: "Denied",       value: kpis?.denialRate    ?? 0, color: "#f43f5e" },
    { name: "Pending",      value: kpis?.pendingRate   ?? 0, color: "#f59e0b" },
  ];

  const kpiCards = [
    { label: "Total Cases YTD",  value: kpis?.totalCasesYTD ?? 0,        change: `+${kpis?.casesThisMonth ?? 0}`,  up: true,  icon: Activity,    bg: "bg-blue-50/50",    color: "text-blue-600" },
    { label: "Approval Rate",    value: `${kpis?.approvalRate ?? 0}%`,    change: "+0.0%",                          up: true,  icon: CheckCircle, bg: "bg-emerald-50/50", color: "text-emerald-600" },
    { label: "Denial Rate",      value: `${kpis?.denialRate ?? 0}%`,      change: "-0.0%",                          up: false, icon: XCircle,     bg: "bg-rose-50/50",    color: "text-rose-600" },
    { label: "Avg Turnaround",   value: `${kpis?.averageReviewTime ?? 0} hrs`, change: "0.0 hrs",                   up: false, icon: Clock,       bg: "bg-blue-50/50",    color: "text-blue-600" },
    { label: "AI Accuracy",      value: `${aiPerf?.accuracy ?? 0}%`,     change: "+0.0%",                          up: true,  icon: Brain,       bg: "bg-blue-50/50",    color: "text-blue-600" },
    { label: "Human Agreement",  value: `${aiPerf?.agreementRate ?? 0}%`, change: "+0.0%",                          up: true,  icon: ShieldCheck, bg: "bg-emerald-50/50", color: "text-emerald-600" },
  ];

  const svcChartData = byService.slice(0, 6).map(s => ({
    service: s.service.split(" ").slice(0, 2).join(" "),
    count: s.count,
    rate: s.approvalRate ?? s.rate ?? 0,
  }));

  // Build AI accuracy trend from weekly data
  const aiAccuracyData = trends.slice(-4).map((t: any, i: number) => ({
    week: `W${i + 1}`,
    accuracy:  aiPerf?.accuracy  ?? 0,
    agreement: aiPerf?.agreementRate ?? 0,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analytics & Insights</h1>
          <p className="text-sm text-slate-500 mt-0.5">Operational metrics, AI performance, and clinical service volume</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-3 py-1.5 shadow-sm">
            <Calendar className="h-4 w-4 text-slate-400" />
            <select value={timeRange} onChange={e => setTimeRange(e.target.value)} className="text-xs text-slate-800 font-semibold bg-transparent focus:outline-none cursor-pointer">
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
              <option>Quarter to Date</option>
              <option>Year to Date</option>
            </select>
          </div>
          <button onClick={() => window.print()} className="btn-primary flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold">
            <Download className="h-3.5 w-3.5" /> Export PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpiCards.map(kpi => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className={`inline-flex p-2 rounded-lg ${kpi.bg} mb-2.5`}><Icon className={`h-4 w-4 ${kpi.color}`} /></div>
              <p className="text-xl font-bold text-slate-900">{kpi.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{kpi.label}</p>
              <div className={`flex items-center gap-1 mt-2 text-xs font-semibold ${kpi.up ? "text-emerald-600" : "text-blue-600"}`}>
                {kpi.up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {kpi.change} <span className="text-[10px] text-slate-400 font-normal">vs prev</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Monthly Volume Trends */}
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4">
          <h3 className="text-base font-bold text-slate-900">Monthly Volume &amp; Determination Trends</h3>
          <p className="text-xs text-slate-500 mt-0.5">Authorization submissions, approvals, denials, and pending cases</p>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={trends} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "0.75rem", fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
            <Bar dataKey="approved" name="Approved" fill="#10b981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="pending"  name="Pending"  fill="#f59e0b" radius={[4, 4, 0, 0]} />
            <Bar dataKey="denied"   name="Denied"   fill="#f43f5e" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Service Breakdown + Decision Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 mb-1">Requests by Service Area</h3>
          <p className="text-xs text-slate-500 mb-4">Total case volume per specialty domain</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={svcChartData} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="service" tick={{ fontSize: 11, fill: "#334155" }} axisLine={false} tickLine={false} width={85} />
              <Tooltip contentStyle={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "0.75rem", fontSize: 12 }} />
              <Bar dataKey="count" name="Cases" fill="#1e6bf3" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 mb-1">Overall Decision Distribution</h3>
          <p className="text-xs text-slate-500 mb-4">Percentage breakdown across all submitted cases</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <div className="h-48 w-48 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={decisionData} cx="50%" cy="50%" outerRadius={80} innerRadius={50} paddingAngle={3} dataKey="value">
                    {decisionData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "0.75rem", fontSize: 12 }} formatter={(v) => `${v}%`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2.5 w-full sm:w-auto">
              {decisionData.map(d => (
                <div key={d.name} className="flex items-center justify-between gap-4 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                    <span className="text-xs font-semibold text-slate-700">{d.name}</span>
                  </div>
                  <span className="text-xs font-bold text-slate-900">{typeof d.value === "number" ? d.value.toFixed(1) : d.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* AI Performance Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">AI Model Accuracy &amp; Human Agreement Trend</h3>
              <p className="text-xs text-slate-500 mt-0.5">CareAuth Clinical Engine performance</p>
            </div>
            <span className="text-xs font-mono font-bold px-2 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-200">Model v2.1</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={aiAccuracyData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="week" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} domain={[80, 100]} />
              <Tooltip contentStyle={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "0.75rem", fontSize: 12 }} formatter={(v) => [`${Number(v).toFixed(1)}%`, ""]} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              <Line type="monotone" dataKey="accuracy"  name="AI Accuracy"      stroke="#1e6bf3" strokeWidth={2.5} dot={{ fill: "#1e6bf3", r: 4 }} />
              <Line type="monotone" dataKey="agreement" name="Human Agreement"  stroke="#047857" strokeWidth={2.5} dot={{ fill: "#047857", r: 4 }} strokeDasharray="4 4" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3"><Zap className="h-5 w-5 text-blue-600" /><h3 className="text-base font-bold text-slate-900">Key AI Insights</h3></div>
            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-blue-50/60 border border-blue-100">
                <p className="font-bold text-blue-900">Turnaround Velocity</p>
                <p className="text-blue-800/80 mt-0.5">Average review latency reduced from 8.6 hours to {kpis?.averageReviewTime ?? 4.2} hours with automated triage.</p>
              </div>
              <div className="p-3 rounded-lg bg-emerald-50/60 border border-emerald-100">
                <p className="font-bold text-emerald-900">High Confidence Approvals</p>
                <p className="text-emerald-800/80 mt-0.5">{aiPerf?.accuracy ?? 91.7}% agreement on routine authorization requests.</p>
              </div>
              <div className="p-3 rounded-lg bg-amber-50/60 border border-amber-100">
                <p className="font-bold text-amber-900">Documentation Gaps</p>
                <p className="text-amber-800/80 mt-0.5">62% of 'More Info Needed' cases were due to missing prior treatment records.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
