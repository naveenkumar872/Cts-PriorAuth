import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Search, Filter, CheckCircle, XCircle, Clock, AlertCircle, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";
import type { AuthorizationRequest, AuthorizationStatus } from "@/types";
import { DEMO_AUTHORIZATION_REQUESTS } from "@/lib/mock-data-master";

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; icon: React.ComponentType<{ className?: string }> }> = {
  "Approved":                   { label: "Approved",     bg: "bg-emerald-50",  text: "text-emerald-700",  border: "border-emerald-200", icon: CheckCircle },
  "Denied":                     { label: "Denied",       bg: "bg-rose-50",    text: "text-rose-700",    border: "border-rose-200", icon: XCircle },
  "Rejected":                   { label: "Rejected",     bg: "bg-rose-50",    text: "text-rose-700",    border: "border-rose-200", icon: XCircle },
  "Pending Review":             { label: "Pending",      bg: "bg-amber-50",  text: "text-amber-700",  border: "border-amber-200", icon: Clock },
  "More Information Required":  { label: "More Info",    bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200",   icon: AlertCircle },
  "Under Review":               { label: "Under Review", bg: "bg-blue-50",   text: "text-blue-700",   border: "border-blue-200",   icon: Clock },
};

const PRIORITY_COLORS: Record<string, string> = {
  high:   "bg-rose-50 text-rose-700 border border-rose-200",
  medium: "bg-amber-50 text-amber-700 border border-amber-200",
  low:    "bg-blue-50 text-blue-700 border border-blue-200",
};

function getMappedPriority(p: string): "high" | "medium" | "low" {
  if (p === "urgent" || p === "high") return "high";
  if (p === "low") return "low";
  return "medium";
}

const AI_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "Approve":           { bg: "bg-emerald-50",  text: "text-emerald-700",  border: "border-emerald-200" },
  "Deny":              { bg: "bg-rose-50",    text: "text-rose-700",    border: "border-rose-200" },
  "Request More Info": { bg: "bg-amber-50",  text: "text-amber-700",  border: "border-amber-200" },
  "Escalate":          { bg: "bg-blue-50",   text: "text-blue-700",   border: "border-blue-200" },
};

export default function ReviewerRequests() {
  const location = useLocation();
  const [all, setAll]                     = useState<AuthorizationRequest[]>([]);
  const [loading, setLoading]             = useState(true);
  const [search, setSearch]               = useState("");
  const [statusFilter, setStatusFilter]   = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  // Fetch from TiDB on every navigation
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

  const filtered = useMemo(() => all.filter(r => {
    const s = search.toLowerCase();
    const matchSearch = !search
      || r.caseNumber.toLowerCase().includes(s)
      || (r.patient?.name ?? "").toLowerCase().includes(s)
      || (r.provider?.name ?? "").toLowerCase().includes(s)
      || (r.procedures?.[0]?.description ?? "").toLowerCase().includes(s);
    const matchStatus   = statusFilter   === "all" || r.status.toLowerCase().includes(statusFilter.toLowerCase());
    const matchPriority = priorityFilter === "all" || getMappedPriority(r.priority) === priorityFilter;
    return matchSearch && matchStatus && matchPriority;
  }), [all, search, statusFilter, priorityFilter]);

  const counts = useMemo(() => ({
    all:      all.length,
    pending:  all.filter(r => r.status === "Pending Review").length,
    approved: all.filter(r => r.status === "Approved").length,
    denied:   all.filter(r => ["Denied", "Rejected"].includes(r.status)).length,
    moreInfo: all.filter(r => r.status === "More Information Required").length,
  }), [all]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="h-8 w-8 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">All Requests</h1>
        <p className="text-sm text-slate-500 mt-0.5">Browse and manage all authorization requests</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Total",    value: counts.all,      color: "text-slate-900" },
          { label: "Pending",  value: counts.pending,  color: "text-amber-600" },
          { label: "Approved", value: counts.approved, color: "text-emerald-600" },
          { label: "Denied",   value: counts.denied,   color: "text-rose-600" },
          { label: "More Info",value: counts.moreInfo, color: "text-amber-600" },
        ].map(s => (
          <div key={s.label} className="rounded-lg border border-slate-200 bg-white p-4 text-center shadow-sm">
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Search by case, patient, provider, or service..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="denied">Denied</option>
              <option value="more information">More Info</option>
              <option value="under review">Under Review</option>
            </select>
          </div>
          <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
            <option value="all">All Priority</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      <p className="text-sm text-slate-500">{filtered.length} request{filtered.length !== 1 ? "s" : ""} found</p>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-12 text-center shadow-sm">
          <AlertCircle className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No requests match your filters</p>
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                {["Case #", "Patient", "Provider", "Service", "Status", "AI Rec.", "Due", ""].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(req => {
                const cfg       = STATUS_CONFIG[req.status] ?? { label: req.status, bg: "bg-slate-100", text: "text-slate-600", icon: AlertCircle };
                const StatusIcon = cfg.icon;
                const ruleEval  = req.ruleEvaluation || (req.policyContext as any)?.ruleEvaluation;
                const ai        = req.aiRecommendation || (ruleEval ? {
                  decision: ruleEval.decision === "Approved" ? "Approve" : ruleEval.decision === "More Information Required" ? "Request More Info" : ruleEval.decision === "Denied" ? "Deny" : "Escalate",
                  confidence: ruleEval.decision === "Approved" ? 94 : ruleEval.decision === "More Information Required" ? 82 : ruleEval.decision === "Denied" ? 88 : 85
                } : null);
                const aiColor   = AI_COLORS[ai?.decision ?? ""] ?? { bg: "bg-slate-100", text: "text-slate-600" };

                return (
                  <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4">
                      <span className="font-mono text-xs font-bold text-blue-600">{req.caseNumber}</span>
                      <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold ${PRIORITY_COLORS[getMappedPriority(req.priority)] ?? ""}`}>
                        {getMappedPriority(req.priority).toUpperCase()}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-900">{req.patient?.name}</p>
                      <p className="text-xs text-slate-500">{req.patient?.payer}</p>
                    </td>
                    <td className="px-5 py-4 hidden lg:table-cell">
                      <p className="text-slate-700">{req.provider?.name}</p>
                      <p className="text-xs text-slate-500">{req.provider?.specialty}</p>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      <p className="text-slate-700 max-w-xs truncate">{req.procedures?.[0]?.description}</p>
                      <p className="text-xs text-slate-500 font-mono">CPT {req.procedures?.[0]?.code}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded border text-xs font-semibold ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                        <StatusIcon className="h-3 w-3" />{cfg.label}
                      </span>
                    </td>
                    <td className="px-5 py-4 hidden sm:table-cell">
                      {ai ? (
                        <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${aiColor.bg} ${aiColor.text} ${aiColor.border}`}>{ai.decision}</span>
                      ) : <span className="text-xs text-slate-400">—</span>}
                    </td>
                    <td className="px-5 py-4 hidden xl:table-cell text-xs text-slate-500">
                      {req.dueDate ? new Date(req.dueDate).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link to={`/reviewer/requests/${req.id}`} className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-bold whitespace-nowrap">
                        Review <ChevronRight className="h-3 w-3" />
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
