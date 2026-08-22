import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Search, Filter, Plus, CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import type { AuthorizationRequest, AuthorizationStatus } from "@/types";
import { DEMO_AUTHORIZATION_REQUESTS } from "@/lib/mock-data-master";

const STATUS_CONFIG: Record<AuthorizationStatus, { label: string; bg: string; text: string; border: string; icon: React.ComponentType<{ className?: string }> }> = {
  "Approved":                   { label: "Approved",     bg: "bg-emerald-50",  text: "text-emerald-700",  border: "border-emerald-200", icon: CheckCircle },
  "Denied":                     { label: "Denied",       bg: "bg-rose-50",    text: "text-rose-700",    border: "border-rose-200", icon: XCircle },
  "Not Approved":               { label: "Not Approved", bg: "bg-rose-50",    text: "text-rose-700",    border: "border-rose-200", icon: XCircle },
  "Rejected":                   { label: "Rejected",     bg: "bg-rose-50",    text: "text-rose-700",    border: "border-rose-200", icon: XCircle },
  "Pending Review":             { label: "Pending", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", icon: Clock },
  "More Information Required":  { label: "More Info", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", icon: AlertCircle },
  "Under Review":               { label: "Pending", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", icon: Clock },
  "Nurse Review Required":      { label: "Pending", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", icon: Clock },
};
const PRIORITY_CONFIG: Record<string, string> = {
  urgent: "bg-rose-50 text-rose-700 border border-rose-200",
  high:   "bg-amber-50 text-amber-700 border border-amber-200",
  normal: "bg-blue-50 text-blue-700 border border-blue-200",
  low:    "bg-slate-50 text-slate-600 border border-slate-200",
};

export default function ProviderRequests() {
  const { user } = useAuth();
  const location = useLocation();
  const [all, setAll]             = useState<AuthorizationRequest[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Re-fetch from TiDB on every navigation
  useEffect(() => {
    setLoading(true);
    api.getAuthorizations()
      .then(d => {
        const fetched = (d as any)?.cases;
        setAll(fetched && fetched.length > 0 ? fetched : DEMO_AUTHORIZATION_REQUESTS);
      })
      .catch(() => setAll(DEMO_AUTHORIZATION_REQUESTS))
      .finally(() => setLoading(false));
  }, [location.key]);

  const requests = useMemo(() => all.filter(r => {
    const matchSearch = !search
      || r.caseNumber.toLowerCase().includes(search.toLowerCase())
      || (r.patient?.name ?? "").toLowerCase().includes(search.toLowerCase())
      || (r.procedures?.[0]?.description ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all"
      || r.status.toLowerCase() === statusFilter.toLowerCase();
    return matchSearch && matchStatus;
  }), [all, search, statusFilter]);

  const counts = useMemo(() => ({
    all:      all.length,
    approved: all.filter(r => r.status === "Approved").length,
    pending:  all.filter(r => ["Pending Review", "Under Review", "Nurse Review Required"].includes(r.status)).length,
    denied:   all.filter(r => ["Denied", "Rejected", "Not Approved"].includes(r.status)).length,
  }), [all]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="h-8 w-8 rounded-full border-4 border-teal-500 border-t-transparent animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Requests</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            All prior authorization requests submitted by {user?.name}
          </p>
        </div>
        <Link to="/provider/create-request"
          className="btn-primary">
          <Plus className="h-4 w-4" /> New Request
        </Link>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total",    value: counts.all,      color: "text-slate-900" },
          { label: "Approved", value: counts.approved,  color: "text-emerald-600" },
          { label: "Pending",  value: counts.pending,   color: "text-amber-600" },
          { label: "Denied",   value: counts.denied,    color: "text-rose-600" },
        ].map(s => (
          <div key={s.label} className="rounded-lg border border-slate-200 bg-white p-4 text-center shadow-sm">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-xl border border-slate-200">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Search by case number, patient, or service..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30" />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-500" />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/30">
            <option value="all">All Status</option>
            <option value="Pending Review">Pending Review</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Denied</option>
            <option value="More Information Required">More Info Required</option>
            <option value="Under Review">Under Review</option>
          </select>
        </div>
      </div>

      {requests.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-12 text-center shadow-sm">
          <AlertCircle className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">
            {all.length === 0 ? "No requests submitted yet." : "No requests match your filters."}
          </p>
          {all.length === 0 && (
            <Link to="/provider/create-request"
              className="mt-3 inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium">
              <Plus className="h-3.5 w-3.5" /> Submit your first request
            </Link>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                {["Case #", "Patient", "Service", "Submitted", "Status", "Priority", ""].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requests.map(req => {
                const cfg = STATUS_CONFIG[req.status as AuthorizationStatus] ?? { label: req.status, bg: "bg-slate-100", text: "text-slate-600", icon: AlertCircle };
                const Icon = cfg.icon;
                return (
                  <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4">
                      <span className="font-mono text-xs font-bold text-blue-600">{req.caseNumber}</span>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-900">{req.patient?.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{req.patient?.payer}</p>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      <p className="text-slate-700 max-w-xs truncate">{req.procedures?.[0]?.description}</p>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">CPT {req.procedures?.[0]?.code}</p>
                    </td>
                    <td className="px-5 py-4 hidden sm:table-cell">
                      <p className="text-slate-600">
                        {new Date(req.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                        <Icon className="h-3 w-3" />{cfg.label}
                      </span>
                    </td>
                    <td className="px-5 py-4 hidden lg:table-cell">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_CONFIG[req.priority] ?? "bg-slate-50 text-slate-600 border border-slate-200"}`}>
                        {req.priority.charAt(0).toUpperCase() + req.priority.slice(1)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link to={`/provider/requests/${req.id}`}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                        View →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
