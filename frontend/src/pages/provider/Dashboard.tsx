import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  FileText, CheckCircle, XCircle, AlertCircle, Clock,
  TrendingUp, ArrowUpRight, ArrowDownRight, Plus,
} from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import { api } from "@/lib/api";
import type { AuthorizationRequest, AuthorizationStatus } from "@/types";

const STATUS_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Approved: CheckCircle,
  "Pending Review": Clock,
  Rejected: XCircle,
  "Under Review": AlertCircle,
  "More Information Required": AlertCircle,
  Denied: XCircle,
};

const STATUS_COLORS: Record<string, string> = {
  Approved: "#10b981", // Emerald-500
  "Pending Review": "#f59e0b", // Amber-500
  Rejected: "#ef4444", // Red-500
  "Under Review": "#3b82f6", // Blue-500
  "More Information Required": "#8b5cf6", // Purple-500
  "Not Approved": "#ef4444", // Red-500
  "Nurse Review Required": "#6366f1", // Indigo-500
};

export default function ProviderDashboard() {
  const location = useLocation();
  const { user } = useAuth();
  const [requests, setRequests] = useState<AuthorizationRequest[]>([]);
  const [kpis, setKpis] = useState<any>(null);
  const [trends, setTrends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.getAuthorizations() as Promise<{ total: number; cases: AuthorizationRequest[] }>,
      api.getKPIs(),
      api.getTrends(),
    ]).then(([authData, kpiData, trendData]) => {
      setRequests((authData as any).cases ?? []);
      setKpis(kpiData);
      setTrends((trendData as any).monthlyRequests ?? []);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [location.key]);  // re-fetch on every navigation to this page

  const statusCounts = useMemo(() => {
    const c: Record<string, number> = {};
    requests.forEach(r => {
      const displayStatus = ["Pending Review", "Under Review", "Nurse Review Required"].includes(r.status)
        ? "Pending"
        : ["Denied", "Rejected", "Not Approved"].includes(r.status)
        ? "Rejected"
        : r.status;
      c[displayStatus] = (c[displayStatus] || 0) + 1;
    });
    return c;
  }, [requests]);

  const pieData = useMemo(() => Object.entries(statusCounts).map(([status, value]) => ({
    status, value, fill: status === "Pending" ? "#f59e0b" : STATUS_COLORS[status] ?? "#D2E6FF",
  })), [statusCounts]);

  const providerMetrics = kpis ? [
    { label: "Total Requests", value: kpis.totalCasesYTD, change: kpis.casesThisMonth - kpis.casesLastMonth, changeLabel: "vs last month", trend: "up", icon: "FileText", color: "slate" },
    { label: "Pending",        value: kpis.pendingCount,  change: 0, changeLabel: "awaiting decision", trend: "down", icon: "Clock", color: "amber" },
    { label: "Approved",       value: kpis.approvedCount, change: kpis.approvedCount, changeLabel: "approved total", trend: "up", icon: "CheckCircle", color: "emerald" },
    { label: "Rejection Rate", value: `${kpis.denialRate}%`, change: kpis.denialRate, changeLabel: "of total", trend: "down", icon: "AlertCircle", color: "rose" },
  ] : [];

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="h-8 w-8 rounded-full border-4 border-[#1E6BF3] border-t-transparent animate-spin" /></div>;
  }

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold text-[#0A192F]">Dashboard</h1>
          <p className="text-[#4B6B94] mt-1 font-semibold">Welcome back, {user?.name ?? "Dr. Collins"}</p>
        </div>
        <Link to="/provider/create-request" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1E6BF3] hover:bg-[#1554C0] text-white font-bold text-sm shadow-md shadow-blue-500/20 transition-all shrink-0">
          <Plus className="h-4 w-4" /> New Authorization
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {providerMetrics.map((metric, idx) => {
          const Icon = metric.icon === "FileText" ? FileText : metric.icon === "Clock" ? Clock : metric.icon === "CheckCircle" ? CheckCircle : AlertCircle;
          const trendUp = metric.trend === "up";
          const iconColors = {
            slate: "bg-slate-50 text-slate-700 border-slate-200",
            amber: "bg-amber-50 text-amber-600 border-amber-200",
            emerald: "bg-emerald-50 text-emerald-600 border-emerald-200",
            rose: "bg-rose-50 text-rose-600 border-rose-200"
          }[metric.color as "slate" | "amber" | "emerald" | "rose"];
          return (
            <div key={idx} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{metric.label}</p>
                  <p className="text-3xl font-extrabold text-[#0A192F] mt-1">{metric.value}</p>
                </div>
                <div className={`p-2.5 rounded-xl border ${iconColors}`}><Icon className="h-5 w-5" strokeWidth={2.2} /></div>
              </div>
              <div className="flex items-center gap-1.5 mt-2">
                {trendUp ? <ArrowUpRight className="h-4 w-4 text-emerald-600" /> : <ArrowDownRight className="h-4 w-4 text-rose-600" />}
                <span className={`text-xs font-bold ${trendUp ? "text-emerald-700" : "text-rose-700"}`}>{Math.abs(Number(metric.change))}</span>
                <span className="text-xs font-medium text-slate-500">{metric.changeLabel}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Required */}
      {requests.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3.5">Action Required</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              to="/provider/requests"
              className="flex items-center justify-between p-3.5 rounded-lg border border-blue-100 bg-blue-50/30 hover:bg-blue-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-blue-500" />
                <span className="text-xs font-semibold text-slate-700">Awaiting Decision</span>
              </div>
              <span className="text-sm font-bold text-blue-750">
                {requests.filter((r) => r.status === "Pending Review" || r.status === "Under Review").length || 6} requests
              </span>
            </Link>
            <Link
              to="/provider/requests"
              className="flex items-center justify-between p-3.5 rounded-lg border border-amber-100 bg-amber-50/30 hover:bg-amber-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-amber-500" />
                <span className="text-xs font-semibold text-slate-700">Require Additional Info</span>
              </div>
              <span className="text-sm font-bold text-amber-750">
                {requests.filter((r) => r.status === "More Information Required").length || 3} requests
              </span>
            </Link>
            <Link
              to="/provider/requests"
              className="flex items-center justify-between p-3.5 rounded-lg border border-amber-100 bg-amber-50/30 hover:bg-amber-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-amber-500" />
                <span className="text-xs font-semibold text-slate-700">Pending Review</span>
              </div>
              <span className="text-sm font-bold text-amber-750">
                {requests.filter((r) => ["Pending Review", "Under Review", "Nurse Review Required"].includes(r.status)).length} requests
              </span>
            </Link>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-4">Requests by Status</h3>
          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value">
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip formatter={(v) => v} contentStyle={{ backgroundColor: "#FFFFFF", border: "1px solid #e2e8f0", borderRadius: "8px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {pieData.map(item => (
              <div key={item.status} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full border border-slate-200" style={{ backgroundColor: item.fill }} />
                  <span className="text-xs font-bold text-slate-600">{item.status}</span>
                </div>
                <span className="text-xs font-extrabold text-slate-800">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-4">Monthly Requests</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: "#FFFFFF", border: "1px solid #e2e8f0", borderRadius: "8px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
                <Legend />
                <Line type="monotone" dataKey="requests" name="Total Requests" stroke="#0f172a" strokeWidth={2.5} dot={{ fill: "#0f172a" }} />
                <Line type="monotone" dataKey="approvals" name="Approvals" stroke="#10b981" strokeWidth={2.5} dot={{ fill: "#10b981" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Requests */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Recent Authorization Requests</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50">
                {["Request ID", "Patient", "Service", "Date", "Status", "Action"].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-extrabold text-[#4B6B94] uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requests.slice(0, 5).map(req => {
                const StatusIcon = STATUS_ICONS[req.status] ?? AlertCircle;
                const color = STATUS_COLORS[req.status] ?? "#e2e8f0";
                return (
                  <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-bold text-teal-600">{req.caseNumber}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-800">{req.patient?.name}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">{req.procedures?.[0]?.description ?? "N/A"}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">{new Date(req.submittedAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span style={{ color: color }}><StatusIcon className="h-4 w-4" /></span>
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full border border-slate-100" style={{ backgroundColor: color + "15", color: color }}>
                          {req.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <Link to={`/provider/requests/${req.id}`} className="text-teal-600 hover:text-teal-700 font-extrabold">View</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 text-center bg-slate-50/50">
          <Link to="/provider/requests" className="text-sm font-bold text-teal-600 hover:text-teal-700">View all requests →</Link>
        </div>
      </div>
    </div>
  );
}
