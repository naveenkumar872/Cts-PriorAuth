import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AlertCircle, ArrowUpDown, Clock, Filter, Search } from "lucide-react";
import { api } from "@/lib/api";
import type { AuthorizationRequest } from "@/types";
import { DEMO_AUTHORIZATION_REQUESTS } from "@/lib/mock-data-master";

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };
const COMPLEXITY_ORDER: Record<string, number> = { high: 1, medium: 2, low: 3 };

const PRIORITY_COLORS: Record<string, string> = {
  high:   "bg-rose-50 text-rose-700 border-rose-200 font-semibold",
  medium: "bg-amber-50 text-amber-700 border-amber-200 font-semibold",
  low:    "bg-blue-50 text-blue-700 border-blue-200 font-medium",
};

function getMappedPriority(p: string): "high" | "medium" | "low" {
  if (p === "urgent" || p === "high") return "high";
  if (p === "low") return "low";
  return "medium";
}

const COMPLEXITY_BADGES: Record<string, { bg: string; text: string; border: string; label: string }> = {
  high:   { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200", label: "High Complexity (Rank 1)" },
  medium: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", label: "Medium Complexity (Rank 2)" },
  low:    { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", label: "Low Complexity (Rank 3)" },
};

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string; Icon: React.ComponentType<{ className?: string }> }> = {
  "Pending Review":            { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", Icon: Clock },
  "Under Review":              { bg: "bg-blue-50",    text: "text-blue-700", border: "border-blue-200",   Icon: AlertCircle },
  "More Information Required": { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200",  Icon: AlertCircle },
  "Nurse Review Required":     { bg: "bg-indigo-50",    text: "text-indigo-700", border: "border-indigo-200", Icon: AlertCircle },
};

const AI_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "Approve":           { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  "Deny":              { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
  "Request More Info": { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  "Escalate":          { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
};

export default function ReviewQueue() {
  const location = useLocation();
  const [all, setAll]         = useState<AuthorizationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [priority, setPriority] = useState("all");
  const [sortBy, setSortBy]   = useState<"complexity" | "urgency" | "date">("complexity");

  useEffect(() => {
    api.getAuthorizations()
      .then(d => {
        const fetched = (d as any)?.cases;
        setAll(fetched && fetched.length > 0 ? fetched : DEMO_AUTHORIZATION_REQUESTS);
      })
      .catch(() => setAll(DEMO_AUTHORIZATION_REQUESTS))
      .finally(() => setLoading(false));
  }, [location.key]);

  const queue = useMemo(() => {
    const QUEUE_STATUSES = ["Pending Review", "Under Review", "More Information Required", "Nurse Review Required"];
    let filtered = all.filter(r => QUEUE_STATUSES.includes(r.status));

    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(r =>
        r.caseNumber.toLowerCase().includes(s) ||
        (r.patient?.name ?? "").toLowerCase().includes(s) ||
        (r.procedures?.[0]?.description ?? "").toLowerCase().includes(s)
      );
    }
    if (priority !== "all") {
      filtered = filtered.filter(r => getMappedPriority(r.priority) === priority);
    }

    return [...filtered].sort((a, b) => {
      const priorityA = getMappedPriority(a.priority);
      const priorityB = getMappedPriority(b.priority);

      if (sortBy === "complexity") {
        const mlA = a.ruleEvaluation?.mlComplexity || (a.policyContext as any)?.ruleEvaluation?.mlComplexity;
        const mlB = b.ruleEvaluation?.mlComplexity || (b.policyContext as any)?.ruleEvaluation?.mlComplexity;
        const rankA = mlA?.complexityRank ?? (COMPLEXITY_ORDER[mlA?.predictedComplexity] ?? 4);
        const rankB = mlB?.complexityRank ?? (COMPLEXITY_ORDER[mlB?.predictedComplexity] ?? 4);

        if (rankA !== rankB) return rankA - rankB; // High (1) comes before Medium (2), which comes before Low (3)
        return (PRIORITY_ORDER[priorityA] ?? 9) - (PRIORITY_ORDER[priorityB] ?? 9);
      }
      if (sortBy === "urgency") {
        if (priorityA === priorityB) {
          const subOrder: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 };
          return (subOrder[a.priority] ?? 9) - (subOrder[b.priority] ?? 9);
        }
        return (PRIORITY_ORDER[priorityA] ?? 9) - (PRIORITY_ORDER[priorityB] ?? 9);
      }
      return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
    });
  }, [all, search, priority, sortBy]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="h-8 w-8 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Review Queue</h1>
        <p className="text-slate-600 mt-1 flex items-center gap-2">
          <span>{queue.length} request{queue.length !== 1 ? "s" : ""} awaiting review</span>
          {sortBy === "complexity" && (
            <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
              ⚡ ML Sorted: High Complexity First
            </span>
          )}
          {sortBy === "urgency" && (
            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
              Sorted: Urgent First
            </span>
          )}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text" placeholder="Search by ID, patient, or service..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-500 shrink-0" />
          <select value={priority} onChange={e => setPriority(e.target.value)}
            className="px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20">
            <option value="all">All Priorities</option>
            <option value="high">High Only</option>
            <option value="medium">Medium Only</option>
            <option value="low">Low Only</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-4 w-4 text-slate-500 shrink-0" />
          <select value={sortBy} onChange={e => setSortBy(e.target.value as "complexity" | "urgency" | "date")}
            className="px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20">
            <option value="complexity">⚡ Sort: ML Complexity (High → Low)</option>
            <option value="urgency">Sort: Urgency (High → Low)</option>
            <option value="date">Sort: Newest First</option>
          </select>
        </div>
      </div>

      {queue.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-12 text-center shadow-sm">
          <AlertCircle className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No requests found</h3>
          <p className="text-slate-600">Try adjusting your filters or search terms</p>
        </div>
      ) : (
        <div className="space-y-4">
          {queue.map(request => {
            const statusCfg = STATUS_COLORS[request.status];
            const StatusIcon = statusCfg?.Icon ?? Clock;
            const aiRec = request.aiRecommendation;
            const aiColor = AI_COLORS[aiRec?.decision ?? ""] ?? AI_COLORS["Approve"];
            const mappedPriority = getMappedPriority(request.priority);
            
            const mlComplexity = request.ruleEvaluation?.mlComplexity || (request.policyContext as any)?.ruleEvaluation?.mlComplexity;
            const mlBadge = mlComplexity?.predictedComplexity ? COMPLEXITY_BADGES[mlComplexity.predictedComplexity] : null;

            return (
              <div key={request.id} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md hover:border-slate-350 transition-all">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  {/* Left */}
                  <div className="md:col-span-4 space-y-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase">Request ID</p>
                      <p className="text-sm font-bold text-blue-600">{request.caseNumber}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase">Patient</p>
                      <p className="text-sm font-medium text-slate-900">{request.patient?.name}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase">Service</p>
                      <p className="text-sm text-slate-600 line-clamp-2">{request.procedures?.[0]?.description}</p>
                    </div>
                  </div>

                  {/* Middle */}
                  <div className="md:col-span-3 space-y-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase">Status</p>
                      <div className="flex items-center gap-2 mt-1">
                        <StatusIcon className="h-3.5 w-3.5 text-slate-500" />
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${statusCfg?.bg ?? ""} ${statusCfg?.text ?? ""} ${statusCfg ? "border-" + statusCfg.text.split("-")[1] + "-200" : ""}`}>
                          {request.status}
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase">Priority & Urgency</p>
                      <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full border mt-1 ${PRIORITY_COLORS[mappedPriority] ?? ""}`}>
                        {mappedPriority.charAt(0).toUpperCase() + mappedPriority.slice(1)}
                      </span>
                    </div>

                    {/* ML Complexity Badge */}
                    {mlBadge && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase">ML Review Complexity</p>
                        <div className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border mt-1 ${mlBadge.bg} ${mlBadge.text} ${mlBadge.border}`}>
                          {mlBadge.label}
                          {mlComplexity?.confidenceScore && (
                            <span className="text-[10px] opacity-75">({mlComplexity.confidenceScore}%)</span>
                          )}
                        </div>
                      </div>
                    )}

                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase">Submitted</p>
                      <p className="text-sm text-slate-600">{new Date(request.submittedAt).toLocaleDateString()}</p>
                    </div>
                  </div>

                  {/* Right — AI */}
                  <div className="md:col-span-3 space-y-3 md:border-l md:border-slate-200 md:pl-6">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase">AI Recommendation</p>
                      <div className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded border mt-1 ${aiColor.bg} ${aiColor.text} ${aiColor.border}`}>
                        {aiRec?.decision ?? "Pending"}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase">Confidence</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-600 rounded-full" style={{ width: `${aiRec?.confidence ?? 0}%` }} />
                        </div>
                        <span className="text-xs font-bold text-[#0A192F]">{aiRec?.confidence ?? 0}%</span>
                      </div>
                    </div>
                    <Link to={`/reviewer/requests/${request.id}`}
                      className="btn-primary w-full block text-center shadow-none mt-4 text-xs py-2">
                      Review Case
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
