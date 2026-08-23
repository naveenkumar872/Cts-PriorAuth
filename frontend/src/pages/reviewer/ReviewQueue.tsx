import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AlertCircle, ArrowUpDown, Clock, Filter, Search } from "lucide-react";
import { api } from "@/lib/api";
import type { AuthorizationRequest } from "@/types";
import { RuleEngineDecisionBadge } from "@/components/ui/RuleEngineDecisionBadge";

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

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string; Icon: React.ComponentType<{ className?: string }> }> = {
  "Pending Review":            { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", Icon: Clock },
  "Under Review":              { bg: "bg-blue-50",    text: "text-blue-700", border: "border-blue-200",   Icon: AlertCircle },
  "More Information Required": { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200",  Icon: AlertCircle },
  "Nurse Review Required":     { bg: "bg-indigo-50",    text: "text-indigo-700", border: "border-indigo-200", Icon: AlertCircle },
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
        setAll(fetched || []);
      })
      .catch(() => setAll([]))
      .finally(() => setLoading(false));
  }, [location.key]);

  const queue = useMemo(() => {
    // Nurse Review Queue only contains cases requiring clinical nurse review (excluding More Information Required)
    const NURSE_QUEUE_STATUSES = ["Nurse Review Required", "Pending Review", "Under Review"];
    let filtered = all.filter(r => 
      NURSE_QUEUE_STATUSES.includes(r.status) &&
      r.status !== "More Information Required" &&
      (r.ruleEvaluation?.decision !== "More Information Required") &&
      (r.policyContext?.ruleEvaluation?.decision !== "More Information Required")
    );

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

        if (rankA !== rankB) return rankA - rankB;
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
      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Nurse Review Queue</h1>
        <p className="text-slate-600 mt-1 flex items-center gap-2 font-medium">
          <span>{queue.length} request{queue.length !== 1 ? "s" : ""} awaiting clinical review</span>
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text" placeholder="Search by Case ID, patient name, or service..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-500 shrink-0" />
          <select value={priority} onChange={e => setPriority(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20">
            <option value="all">All Priorities</option>
            <option value="high">High Only</option>
            <option value="medium">Medium Only</option>
            <option value="low">Low Only</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-4 w-4 text-slate-500 shrink-0" />
          <select value={sortBy} onChange={e => setSortBy(e.target.value as "complexity" | "urgency" | "date")}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20">
            <option value="complexity">Sort: Clinical Urgency</option>
            <option value="date">Sort: Newest First</option>
          </select>
        </div>
      </div>

      {queue.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs">
          <AlertCircle className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-900 mb-1">No requests found</h3>
          <p className="text-xs text-slate-500 font-medium">Try adjusting your filters or search terms</p>
        </div>
      ) : (
        <div className="space-y-4">
          {queue.map(request => {
            const statusCfg = STATUS_COLORS[request.status];
            const ruleEval = request.ruleEvaluation || (request.policyContext as any)?.ruleEvaluation;
            const decision = ruleEval?.decision || request.aiRecommendation?.decision || request.status;
            const confidence = request.aiRecommendation?.confidence ?? 88;
            const mappedPriority = getMappedPriority(request.priority);

            return (
              <div
                key={request.id}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs hover:shadow-md hover:border-blue-300 transition-all duration-200 relative overflow-hidden group"
              >
                {/* Left accent bar */}
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                  mappedPriority === "high" ? "bg-rose-500" : mappedPriority === "medium" ? "bg-amber-500" : "bg-blue-600"
                }`} />

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center pl-2">
                  {/* Left: Patient & Request Metadata */}
                  <div className="md:col-span-5 space-y-2.5">
                    <div className="flex items-center gap-3">
                      <Link to={`/reviewer/requests/${request.id}`} className="font-mono text-sm font-extrabold text-[#1E6BF3] hover:underline">
                        {request.caseNumber}
                      </Link>
                      <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${statusCfg?.bg ?? ""} ${statusCfg?.text ?? ""} ${statusCfg ? "border-" + statusCfg.text.split("-")[1] + "-200" : ""}`}>
                        {request.status}
                      </span>
                    </div>

                    <div>
                      <p className="text-base font-extrabold text-slate-900">{request.patient?.name}</p>
                      <p className="text-xs font-semibold text-slate-600 mt-0.5 line-clamp-1">
                        {request.procedures?.[0]?.description}
                      </p>
                    </div>

                    <p className="text-[11px] text-slate-400 font-medium">
                      Submitted {new Date(request.submittedAt).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Middle: Badges */}
                  <div className="md:col-span-3 space-y-2.5 border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-6">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Priority Tier</p>
                      <span className={`inline-block text-xs font-extrabold px-2.5 py-0.5 rounded-full border mt-1 ${PRIORITY_COLORS[mappedPriority] ?? ""}`}>
                        {mappedPriority.charAt(0).toUpperCase() + mappedPriority.slice(1)}
                      </span>
                    </div>
                  </div>

                  {/* Right: Rule Engine Decision & Action */}
                  <div className="md:col-span-4 bg-slate-50/80 p-4 rounded-xl border border-slate-150 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Rule Engine Decision</span>
                      <RuleEngineDecisionBadge decision={decision} size="sm" />
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1">
                        <span>Confidence Score</span>
                        <span>{confidence}%</span>
                      </div>
                      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full transition-all duration-300" style={{ width: `${confidence}%` }} />
                      </div>
                    </div>

                    <Link
                      to={`/reviewer/requests/${request.id}`}
                      className="w-full block text-center py-2.5 px-4 rounded-xl bg-[#1E6BF3] hover:bg-blue-700 text-white font-extrabold text-xs shadow-xs hover:shadow-md transition-all cursor-pointer"
                    >
                      Review Case →
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
