import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Search, BookOpen, Filter, ChevronRight, Calendar,
  Tag, CheckCircle2, Layers, FileCheck, X, ArrowUpRight,
} from "lucide-react";
import { api } from "@/lib/api";

const CATEGORIES = ["All", "Outpatient Imaging", "Surgical & Inpatient", "Diagnostic Testing", "Specialist Services"];

const BADGE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "Outpatient Imaging":    { bg: "bg-blue-50",    text: "text-blue-750",    border: "border-blue-200" },
  "Surgical & Inpatient": { bg: "bg-indigo-50",  text: "text-indigo-750",  border: "border-indigo-200" },
  "Diagnostic Testing":   { bg: "bg-emerald-50",  text: "text-emerald-750",    border: "border-emerald-200" },
  "Specialist Services":   { bg: "bg-amber-50",   text: "text-amber-750",   border: "border-amber-200" },
};

export default function PolicyManagement() {
  const location = useLocation();
  const [policies, setPolicies]         = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState("");
  const [category, setCategory]         = useState("All");
  const [selectedQuickView, setSelectedQuickView] = useState<any | null>(null);

  useEffect(() => {
    api.getPolicies()
      .then(d => {
        const fetched = d as any[];
        setPolicies(fetched || []);
      })
      .catch(() => setPolicies([]))
      .finally(() => setLoading(false));
  }, [location.key]);

  const filtered = useMemo(() => policies.filter(p => {
    const matchSearch = !search
      || p.title.toLowerCase().includes(search.toLowerCase())
      || (p.description ?? "").toLowerCase().includes(search.toLowerCase())
      || (p.coverageType ?? "").toLowerCase().includes(search.toLowerCase());
    const matchCategory = category === "All" || p.coverageType === category;
    return matchSearch && matchCategory;
  }), [policies, search, category]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: policies.length };
    CATEGORIES.slice(1).forEach(cat => { counts[cat] = policies.filter(p => p.coverageType === cat).length; });
    return counts;
  }, [policies]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="h-8 w-8 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Policy Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">Browse, search, and reference medical necessity coverage policies</p>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-500 uppercase">Total Policies</p>
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600"><BookOpen className="h-4 w-4" /></div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{policies.length}</p>
          <p className="text-xs text-slate-500 mt-1">In active library</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-500 uppercase">Active</p>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600"><CheckCircle2 className="h-4 w-4" /></div>
          </div>
          <p className="text-2xl font-bold text-emerald-600">{policies.filter(p => p.status === "Active").length}</p>
          <p className="text-xs text-slate-500 mt-1">100% compliant</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-500 uppercase">Categories</p>
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600"><Layers className="h-4 w-4" /></div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{new Set(policies.map(p => p.coverageType)).size}</p>
          <p className="text-xs text-slate-500 mt-1">Service domains</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-500 uppercase">Guideline Year</p>
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600"><Calendar className="h-4 w-4" /></div>
          </div>
          <p className="text-2xl font-bold text-blue-600">2026</p>
          <p className="text-xs text-slate-500 mt-1">Latest CMS / NCD rules</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Search policies by title, description, or keywords..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-9 py-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400 shrink-0" />
          <select value={category} onChange={e => setCategory(e.target.value)}
            className="px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium">
            {CATEGORIES.map(c => (
              <option key={c} value={c}>{c} ({categoryCounts[c] ?? 0})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map(c => {
          const active = category === c;
          return (
            <button key={c} onClick={() => setCategory(c)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                active ? "bg-blue-600 text-white shadow-sm" : "bg-white border border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600"
              }`}>
              {c}
              <span className={`px-1.5 rounded-full text-[10px] font-bold ${active ? "bg-blue-700/60 text-white" : "bg-slate-100 text-slate-500"}`}>
                {categoryCounts[c] ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      {/* Policy Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filtered.map(policy => {
          const catStyle = BADGE_COLORS[policy.coverageType] ?? { bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200" };
          return (
            <div key={policy.id} className="rounded-lg border border-slate-200 bg-white p-5 flex flex-col hover:shadow-md hover:border-blue-300 transition-all group">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="p-2 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-100 transition-colors">
                  <BookOpen className="h-4 w-4" />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded border bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />{policy.status}
                  </span>
                  <span className="text-xs font-mono px-1.5 py-0.5 rounded border border-slate-200 bg-slate-50 text-slate-600">v{policy.version}</span>
                </div>
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1.5 group-hover:text-blue-700 transition-colors">{policy.title}</h3>
              <p className="text-xs text-slate-600 mb-4 flex-1 line-clamp-3 leading-relaxed">{policy.description}</p>
              <div className="space-y-2.5 mb-4 border-t border-slate-100 pt-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 flex items-center gap-1"><Tag className="h-3.5 w-3.5 text-slate-400" /> Category</span>
                  <span className={`px-2 py-0.5 rounded border ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}>{policy.coverageType}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5 text-slate-400" /> Updated</span>
                  <span className="font-semibold text-slate-700">{policy.lastUpdated ? new Date(policy.lastUpdated).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button type="button" onClick={() => setSelectedQuickView(policy)}
                  className="btn-secondary flex-1 py-2 text-xs shadow-none border-slate-200">
                  <FileCheck className="h-3.5 w-3.5" /> Quick Rules
                </button>
                <Link to={`/reviewer/policies/${policy.id}`}
                  className="btn-primary flex-1 py-2 text-xs shadow-none">
                  Full Policy <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-12 text-center shadow-sm">
          <BookOpen className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-900 mb-1">No policies found</h3>
          <button onClick={() => { setSearch(""); setCategory("All"); }}
            className="btn-primary">
            Reset Filters
          </button>
        </div>
      )}

      {/* Quick View Modal */}
      {selectedQuickView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-100">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <span className="text-xs font-mono font-bold text-blue-600">{selectedQuickView.id.toUpperCase()}</span>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">{selectedQuickView.title}</h3>
              </div>
              <button onClick={() => setSelectedQuickView(null)} className="p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4 text-xs text-slate-700">
              <div>
                <p className="font-semibold text-slate-500 uppercase tracking-wide mb-1">Summary</p>
                <p className="leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">{selectedQuickView.description}</p>
              </div>
              {(selectedQuickView.criteria ?? []).length > 0 && (
                <div>
                  <p className="font-semibold text-slate-500 uppercase tracking-wide mb-2">Key Coverage Criteria</p>
                  <ul className="space-y-1.5">
                    {selectedQuickView.criteria.slice(0, 3).map((c: string, i: number) => (
                      <li key={i} className="flex gap-2 p-2 rounded-lg bg-blue-50 border border-blue-100 text-blue-900">
                        <span className="shrink-0 font-bold">{i + 1}.</span>{c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="mt-5 flex items-center justify-between pt-3 border-t border-slate-100">
              <button onClick={() => setSelectedQuickView(null)} className="btn-secondary px-4 py-2 text-xs shadow-none">Close</button>
              <Link to={`/reviewer/policies/${selectedQuickView.id}`}
                className="btn-primary px-4 py-2 text-xs shadow-none flex items-center gap-1">
                View Full Details <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
