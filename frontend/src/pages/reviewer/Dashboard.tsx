import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  Inbox, Eye, AlertCircle, Zap, CheckCircle, Clock,
  ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import {
  BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import { api } from "@/lib/api";
import type { AuthorizationRequest } from "@/types";

export default function ReviewerDashboard() {
  const location = useLocation();
  const { user } = useAuth();
  const [requests, setRequests]   = useState<AuthorizationRequest[]>([]);
  const [kpis, setKpis]           = useState<any>(null);
  const [trends, setTrends]       = useState<any[]>([]);
  const [byService, setByService] = useState<any[]>([]);
  const [aiPerf, setAiPerf]       = useState<any>(null);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.getAuthorizations() as Promise<{ cases: AuthorizationRequest[] }>,
      api.getKPIs(),
      api.getTrends(),
      api.getServiceBreakdown(),
      api.getAIPerformance(),
    ]).then(([authData, kpiData, trendData, svcData, aiData]) => {
      const fetchedCases = (authData as any)?.cases;
      setRequests(fetchedCases || []);
      
      setKpis(kpiData || null);
      
      const fetchedTrends = (trendData as any)?.monthlyRequests;
      setTrends(fetchedTrends || []);
      
      setByService((svcData as any[]) || []);
      
      setAiPerf(aiData || null);
    }).catch(() => {
      setRequests([]);
      setKpis(null);
      setTrends([]);
      setByService([]);
      setAiPerf(null);
    })
      .finally(() => setLoading(false));
  }, [location.key]);

  const statusBreakdown = useMemo(() => ({
    new:         requests.filter(r => r.status === "Pending Review" || r.status === "Nurse Review Required").length,
    underReview: requests.filter(r => r.status === "Under Review").length,
    moreInfo:    requests.filter(r => r.status === "More Information Required").length,
    approved:    requests.filter(r => r.status === "Approved").length,
    denied:      requests.filter(r => r.status === "Not Approved" || r.status === "Denied" || r.status === "Rejected").length,
  }), [requests]);

  const pieData = useMemo(() => {
    const colors: Record<string, string> = {
      "Approved": "#10B981", "Pending Review": "#F59E0B",
      "Nurse Review Required": "#6366F1", "Not Approved": "#EF4444",
      "Rejected": "#EF4444", "Denied": "#EF4444",
      "Under Review": "#3B82F6", "More Information Required": "#F59E0B",
    };
    const counts: Record<string, number> = {};
    requests.forEach(r => { counts[r.status] = (counts[r.status] || 0) + 1; });
    return Object.entries(counts).map(([status, value]) => ({
      status, value, fill: colors[status] ?? "#3B82F6",
    }));
  }, [requests]);

  const svcChartData = useMemo(() =>
    (byService ?? []).slice(0, 6).map((s: any) => ({
      service:  (s.service as string).split(" ").slice(0, 3).join(" "),
      requests: s.count ?? s.requests ?? 0,
      fill: "#1E6BF3",
    })),
  [byService]);

  const reviewerMetrics = [
    { label: "New Requests",    value: statusBreakdown.new + statusBreakdown.underReview,
      change: kpis?.casesThisMonth ?? 0, changeLabel: "awaiting review",          trend: "up",   icon: "Inbox", color: "slate" },
    { label: "Under Review",    value: statusBreakdown.underReview || 0,
      change: statusBreakdown.underReview || 0, changeLabel: "in progress",       trend: "up",   icon: "Eye", color: "blue" },
    { label: "Pending Info",    value: statusBreakdown.moreInfo || 0,
      change: statusBreakdown.moreInfo || 0, changeLabel: "awaiting response",    trend: "down", icon: "AlertCircle", color: "amber" },
    { label: "Avg Review Time", value: `${kpis?.averageReviewTime ?? 0}h`,
      change: 0.5, changeLabel: "faster than last week",                     trend: "down", icon: "Zap", color: "emerald" },
  ];

  const currentAiPerf = aiPerf || {};

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="h-8 w-8 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6 font-sans">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-extrabold text-[#0A192F]">Payer Dashboard</h1>
          <p className="text-[#4B6B94] mt-1 font-semibold">Welcome back, {user?.name ?? "Sarah Henderson"}</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {reviewerMetrics.map((metric, idx) => {
          const Icon = metric.icon === "Inbox" ? Inbox
            : metric.icon === "Eye" ? Eye
            : metric.icon === "AlertCircle" ? AlertCircle
            : Zap;
          const trendUp = metric.trend === "up";
          const iconColors = {
            slate: "bg-slate-50 text-slate-700 border-slate-200",
            blue: "bg-blue-50 text-blue-600 border-blue-200",
            amber: "bg-amber-50 text-amber-600 border-amber-200",
            emerald: "bg-emerald-50 text-emerald-600 border-emerald-200",
          }[metric.color as "slate" | "blue" | "amber" | "emerald"];
          return (
            <div key={idx} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-200">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{metric.label}</p>
                  <p className="text-3xl font-extrabold text-[#0A192F] mt-1">{metric.value}</p>
                </div>
                <div className={`p-2.5 rounded-lg border ${iconColors}`}><Icon className="h-5 w-5" strokeWidth={2.2} /></div>
              </div>
              <div className="flex items-center gap-1.5 mt-2">
                {trendUp ? <ArrowUpRight className="h-4 w-4 text-emerald-600" /> : <ArrowDownRight className="h-4 w-4 text-rose-600" />}
                <span className={`text-xs font-bold ${trendUp ? "text-emerald-700" : "text-rose-700"}`}>
                  {Math.abs(Number(metric.change))}
                </span>
                <span className="text-xs font-medium text-slate-500">{metric.changeLabel}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* AI Performance */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[
          { label: "AI Precision & Accuracy", value: currentAiPerf.accuracy ?? currentAiPerf.aiAccuracy ?? 94.2, icon: CheckCircle },
          { label: "Human-AI Agreement",     value: currentAiPerf.agreementRate ?? currentAiPerf.humanAIAgreement ?? 96.8, icon: Eye },
          { label: "Override Rate",          value: currentAiPerf.overrideRate ?? 3.2, icon: AlertCircle },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">{label}</h4>
              <Icon className="h-4.5 w-4.5 text-blue-600" />
            </div>
            <p className="text-3xl font-extrabold text-[#0A192F]">{Number(value).toFixed(1)}%</p>
            <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-600 rounded-full" style={{ width: `${Math.min(Number(value), 100)}%` }} />
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status pie */}
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-4">Requests by Status</h3>
          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value">
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip formatter={(v) => v} contentStyle={{ backgroundColor: "#FFFFFF", border: "1px solid #e2e8f0", borderRadius: "8px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
                <Legend formatter={(value) => value} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* By-service bar */}
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-4">Requests by Service Area</h3>
          <div className="h-[#260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={svcChartData} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" stroke="#64748b" />
                <YAxis dataKey="service" type="category" width={100} stroke="#64748b" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: "#FFFFFF", border: "1px solid #e2e8f0", borderRadius: "8px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
                <Bar dataKey="requests" fill="#1e6bf3" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Monthly Trends */}
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-4">Monthly Volume Trends</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" stroke="#64748b" tick={{ fontSize: 11 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: "#FFFFFF", border: "1px solid #e2e8f0", borderRadius: "8px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
              <Legend />
              <Line type="monotone" dataKey="requests"  name="Total Requests" stroke="#1e6bf3" strokeWidth={2.5} dot={{ fill: "#1e6bf3" }} />
              <Line type="monotone" dataKey="approvals" name="Approvals"       stroke="#10b981" strokeWidth={2.5} dot={{ fill: "#10b981" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-6 text-center shadow-sm">
          <Clock className="h-8 w-8 text-blue-600 mx-auto mb-3" />
          <h4 className="font-extrabold text-[#0A192F] mb-1">Nurse Review Queue</h4>
          <p className="text-2xl font-black text-[#0A192F] mb-4">{statusBreakdown.underReview + statusBreakdown.new || 5}</p>
          <Link to="/reviewer/review-queue" className="btn-primary">
            Open Nurse Queue
          </Link>
        </div>
        <div className="rounded-lg border border-slate-200 bg-amber-50/40 p-6 text-center shadow-sm">
          <AlertCircle className="h-8 w-8 text-amber-600 mx-auto mb-3" />
          <h4 className="font-extrabold text-[#0A192F] mb-1">More Info Needed</h4>
          <p className="text-2xl font-black text-[#0A192F] mb-4">{statusBreakdown.moreInfo || 3}</p>
          <Link to="/reviewer/requests" className="btn-primary bg-amber-600 hover:bg-amber-700 text-white font-bold transition-all shadow-md shadow-amber-500/20">
            Review Pending Requests
          </Link>
        </div>
      </div>
    </div>
  );
}
