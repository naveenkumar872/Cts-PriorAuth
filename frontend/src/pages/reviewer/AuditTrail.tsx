import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Search, Filter, FileText, Brain, CheckCircle, XCircle,
  AlertCircle, Info, Clock, Download, ChevronDown, ChevronUp, X,
} from "lucide-react";
import { api } from "@/lib/api";

type AuditCategory = "submission" | "ai_analysis" | "decision" | "system";

const CATEGORY_CONFIG: Record<AuditCategory, {
  icon: React.ComponentType<{ className?: string }>;
  bg: string; text: string; border: string; label: string;
}> = {
  submission: { icon: FileText,    bg: "bg-blue-50",    text: "text-blue-700",    border: "border-blue-200",    label: "Submissions" },
  ai_analysis:{ icon: Brain,       bg: "bg-purple-50",  text: "text-purple-700",  border: "border-purple-200",  label: "AI Analysis" },
  decision:   { icon: CheckCircle, bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", label: "Decisions" },
  system:     { icon: Info,        bg: "bg-slate-100",  text: "text-slate-700",   border: "border-slate-200",   label: "System Events" },
};

const ACTION_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  "Request Submitted":       FileText,
  "AI Triage Completed":     Brain,
  "Request Approved":        CheckCircle,
  "Request Denied":          XCircle,
  "Request Rejected":        XCircle,
  "Additional Info Requested": AlertCircle,
  "Request More Information Required": AlertCircle,
};

function formatRelativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs  = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (days > 0) return `${days}d ago`;
  if (hrs  > 0) return `${hrs}h ago`;
  return `${Math.max(mins, 1)}m ago`;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  submission:  { bg: "bg-blue-50",    text: "text-blue-700",    border: "border-blue-200" },
  evaluation:  { bg: "bg-purple-50",  text: "text-purple-700",  border: "border-purple-200" },
  decision:    { bg: "bg-blue-50",    text: "text-blue-700",    border: "border-blue-200" },
  system:      { bg: "bg-slate-50",   text: "text-slate-700",   border: "border-slate-200" },
  explanation: { bg: "bg-indigo-50",  text: "text-indigo-700",  border: "border-indigo-200" },
};

export default function AuditTrail() {
  const location = useLocation();
  const [entries, setEntries]       = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api.getAuditTrail()
      .then(d => {
        const fetched = d as any[];
        setEntries(fetched || []);
      })
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [location.key]);

  const filtered = useMemo(() => entries.filter(e => {
    const s = search.toLowerCase();
    const matchSearch = !search
      || (e.caseNumber ?? "").toLowerCase().includes(s)
      || (e.patient ?? "").toLowerCase().includes(s)
      || (e.action ?? "").toLowerCase().includes(s)
      || (e.performedBy ?? "").toLowerCase().includes(s)
      || (e.details ?? "").toLowerCase().includes(s);
    const matchCategory = categoryFilter === "all" || e.category === categoryFilter;
    const matchRole     = roleFilter     === "all" || (e.role ?? "").toLowerCase().includes(roleFilter.toLowerCase());
    return matchSearch && matchCategory && matchRole;
  }), [entries, search, categoryFilter, roleFilter]);

  const exportCSV = () => {
    const headers = "ID,Action,Performed By,Role,Case Number,Patient,Date,Details\n";
    const rows = filtered.map(e =>
      `"${e.id}","${e.action}","${e.performedBy}","${e.role}","${e.caseNumber ?? ""}","${e.patient ?? ""}","${new Date(e.timestamp).toLocaleString()}","${(e.details ?? "").replace(/"/g, '""')}"`
    ).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `careauth_audit_trail_${new Date().toISOString().split("T")[0]}.csv`);
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="h-8 w-8 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
    </div>
  );

  const catCounts = (["submission", "ai_analysis", "decision"] as AuditCategory[]).map(cat => ({
    cat, count: entries.filter(e => e.category === cat).length,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Audit Trail</h1>
          <p className="text-sm text-slate-500 mt-0.5">Immutable, timestamped log of all prior authorization activities and clinical determinations</p>
        </div>
        <button onClick={exportCSV} className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:border-blue-300 hover:text-blue-650 text-slate-700 rounded-lg text-xs font-semibold transition-colors shrink-0 shadow-sm">
          <Download className="h-4 w-4" /> Export CSV Log
        </button>
      </div>

      {/* Category Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {catCounts.map(({ cat, count }) => {
          const cfg  = CATEGORY_CONFIG[cat];
          const Icon = cfg.icon;
          const isSelected = categoryFilter === cat;
          return (
            <button key={cat} onClick={() => setCategoryFilter(isSelected ? "all" : cat)}
              className={`rounded-lg border p-4 text-left transition-all shadow-sm ${isSelected ? "border-blue-500 bg-blue-50/10 ring-2 ring-blue-500/20" : "border-slate-200 bg-white hover:shadow-md"}`}>
              <div className="flex items-center justify-between mb-2">
                <div className={`p-2 rounded-lg ${cfg.bg} ${cfg.text}`}><Icon className="h-4 w-4" /></div>
                <span className="text-xs font-semibold text-slate-400">{isSelected ? "Active" : "Filter"}</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">{count}</p>
              <p className="text-xs text-slate-500 mt-0.5">{cfg.label}</p>
            </button>
          );
        })}
        <button onClick={() => { setCategoryFilter("all"); setRoleFilter("all"); setSearch(""); }}
          className="rounded-lg border border-slate-200 bg-white p-4 text-left hover:shadow-md transition-all shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600"><Clock className="h-4 w-4" /></div>
            <span className="text-xs font-semibold text-slate-400">Total</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{entries.length}</p>
          <p className="text-xs text-slate-500 mt-0.5">All Recorded Events</p>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Search by case #, patient, action, physician..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-9 py-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400 shrink-0" />
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
            className="px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium">
            <option value="all">All Event Types</option>
            <option value="submission">Submissions</option>
            <option value="ai_analysis">AI Analyses</option>
            <option value="decision">Decisions</option>
          </select>
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
            className="px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium">
            <option value="all">All Roles</option>
            <option value="provider">Provider</option>
            <option value="reviewer">Reviewer</option>
            <option value="system">System / AI</option>
          </select>
        </div>
      </div>

      {/* Timeline */}
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{filtered.length} Audit Event{filtered.length !== 1 ? "s" : ""} Found</p>
          {(categoryFilter !== "all" || roleFilter !== "all" || search) && (
            <button onClick={() => { setCategoryFilter("all"); setRoleFilter("all"); setSearch(""); }} className="text-xs text-blue-600 hover:text-blue-755 font-semibold">Clear Filters</button>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Clock className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-900">No events found</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map(entry => {
              const cfg = CATEGORY_CONFIG[entry.category as AuditCategory] || CATEGORY_CONFIG.system;
              const ActionIcon = ACTION_ICON_MAP[entry.action] ?? Info;
              const isExpanded = expandedId === entry.id;
              const hasMetadata = entry.metadata && Object.keys(entry.metadata).length > 0;

              return (
                <div key={entry.id} className="px-5 py-4 hover:bg-slate-50/70 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className={`p-2.5 rounded-xl ${cfg.bg} ${cfg.text} border ${cfg.border} shrink-0 mt-0.5`}>
                      <ActionIcon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold text-slate-900">{entry.action}</p>
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border}`}>{cfg.label}</span>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-semibold text-slate-600">{formatRelativeTime(entry.timestamp)}</p>
                          <p className="text-[11px] text-slate-400">{new Date(entry.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                        <span className="font-medium text-slate-800">{entry.performedBy}</span>
                        <span>·</span>
                        <span className="px-1.5 bg-slate-100 rounded text-[11px] font-medium text-slate-600">{entry.role}</span>
                      </div>
                      <p className="text-xs text-slate-700 mt-2 leading-relaxed bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">{entry.details}</p>
                      <div className="flex items-center justify-between gap-3 mt-3 pt-1">
                        <div className="flex items-center gap-2 text-xs">
                          {entry.caseId && entry.caseNumber && (
                            <>
                              <span className="text-slate-400">Case:</span>
                              <Link to={`/reviewer/requests/${entry.caseId}`}
                                className="font-mono font-bold text-blue-600 hover:text-blue-750 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                {entry.caseNumber}
                              </Link>
                              {entry.patient && <><span className="text-slate-300">·</span><span className="text-slate-605 font-medium">{entry.patient}</span></>}
                            </>
                          )}
                        </div>
                        {hasMetadata && (
                          <button onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                            className="text-xs text-slate-500 hover:text-blue-650 flex items-center gap-1 font-semibold">
                            {isExpanded ? "Hide Metadata" : "View Metadata"}
                            {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          </button>
                        )}
                      </div>

                      {isExpanded && hasMetadata && (
                        <div className="mt-3 p-3 rounded-lg bg-white border border-slate-200 text-xs shadow-sm">
                          <p className="font-bold text-slate-700 uppercase tracking-wide text-[10px] mb-2">Event Parameters</p>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {Object.entries(entry.metadata).map(([key, val]) => (
                              <div key={key} className="p-2 rounded bg-slate-50 border border-slate-100">
                                <p className="text-[10px] text-slate-400 uppercase font-medium">{key}</p>
                                <p className="font-semibold text-slate-800 text-xs mt-0.5">{String(val)}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
