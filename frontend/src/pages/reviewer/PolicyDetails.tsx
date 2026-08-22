import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft, BookOpen, CheckCircle, AlertCircle, FileText,
  Calendar, Tag, Copy, Check, Printer, ShieldCheck, XCircle, FileSpreadsheet,
} from "lucide-react";
import { api } from "@/lib/api";

const CATEGORY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  "Diagnostic Imaging":     { bg: "bg-blue-50",    text: "text-blue-750",    border: "border-blue-200" },
  "Surgical Procedures":    { bg: "bg-rose-50",    text: "text-rose-750",    border: "border-rose-200" },
  "Rehabilitation Services":{ bg: "bg-emerald-50", text: "text-emerald-750", border: "border-emerald-200" },
  "Specialist Services":    { bg: "bg-amber-50",   text: "text-amber-750",   border: "border-amber-200" },
};

export default function PolicyDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [policy, setPolicy]     = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api.getPolicy(id)
      .then(d => setPolicy(d))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="h-8 w-8 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
    </div>
  );

  if (notFound || !policy) return (
    <div className="text-center py-20 bg-white rounded-lg border border-slate-200 p-8 max-w-xl mx-auto shadow-sm">
      <AlertCircle className="h-12 w-12 text-slate-300 mx-auto mb-4" />
      <h2 className="text-lg font-bold text-slate-900">Policy Not Found</h2>
      <button onClick={() => navigate("/reviewer/policies")} className="btn-primary">
        ← Return to Policy Library
      </button>
    </div>
  );

  const catStyle = CATEGORY_STYLES[policy.coverageType] ?? { bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200" };
  const criteria              = policy.criteria ?? [];
  const documentationRequired = policy.documentationRequired ?? [];
  const denialCriteria        = policy.denialCriteria ?? [];
  const relatedCpts           = policy.relatedCpts ?? [];
  const hasDetails = criteria.length > 0 || documentationRequired.length > 0 || denialCriteria.length > 0 || relatedCpts.length > 0;

  return (
    <div className="w-full space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Link to="/reviewer/policies" className="hover:text-blue-600 font-medium">Policies</Link>
          <span>/</span>
          <span className="text-slate-900 font-semibold">{policy.title}</span>
        </div>
        <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 shadow-sm">
          <Printer className="h-3.5 w-3.5" /> Print
        </button>
      </div>

      {/* Header Banner */}
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3.5">
          <button onClick={() => navigate("/reviewer/policies")} className="mt-1 p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-blue-50 hover:text-blue-600 shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-mono text-xs font-bold text-blue-600 px-2 py-0.5 bg-blue-50 rounded border border-blue-200">{policy.id.toUpperCase()}</span>
              <h1 className="text-xl font-bold text-slate-900">{policy.title}</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />{policy.status}
              </span>
            </div>
            <div className="flex items-center gap-4 mt-3 text-xs text-slate-500 flex-wrap">
              <span className={`px-2.5 py-0.5 rounded-full font-semibold border ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}>
                <Tag className="h-3 w-3 inline mr-1" />{policy.coverageType}
              </span>
              <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5 text-slate-400" /> Version {policy.version}</span>
              {policy.effectiveDate && <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5 text-slate-400" /> Effective {policy.effectiveDate}</span>}
              {policy.lastUpdated && <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5 text-slate-400" /> Updated {policy.lastUpdated}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Overview */}
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="h-4 w-4 text-blue-600" />
          <h2 className="text-base font-bold text-slate-900">Policy Scope &amp; Overview</h2>
        </div>
        <p className="text-xs text-slate-700 leading-relaxed bg-slate-50/70 p-4 rounded-lg border border-slate-200">{policy.description}</p>
      </div>

      {hasDetails && (
        <>
          {/* Coverage Criteria */}
          {criteria.length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-emerald-600" />
                  <h2 className="text-base font-bold text-slate-900">Mandatory Coverage Criteria</h2>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">All Required</span>
              </div>
              <div className="space-y-2.5">
                {criteria.map((c: string, i: number) => (
                  <div key={i} className="flex items-start gap-3.5 p-3.5 rounded-lg border border-slate-100 bg-slate-50/50">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold mt-0.5">{i + 1}</span>
                    <span className="text-xs font-medium text-slate-800 leading-normal">{c}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Required Documentation */}
          {documentationRequired.length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="h-4 w-4 text-blue-600" />
                <h2 className="text-base font-bold text-slate-900">Required Supporting Documentation</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {documentationRequired.map((d: string, i: number) => (
                  <div key={i} className="flex items-start gap-2.5 p-3.5 rounded-lg border border-slate-200 bg-white shadow-sm">
                    <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                    <span className="text-xs font-medium text-slate-700 leading-relaxed">{d}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Denial Criteria */}
          {denialCriteria.length > 0 && (
            <div className="rounded-lg border border-rose-200 bg-rose-50/10 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="h-5 w-5 text-rose-600" />
                <h2 className="text-base font-bold text-rose-900">Specific Exclusion &amp; Denial Criteria</h2>
              </div>
              <p className="text-xs text-rose-700 mb-4">Authorization must be <strong>denied</strong> if any of the following conditions are identified:</p>
              <div className="space-y-2">
                {denialCriteria.map((d: string, i: number) => (
                  <div key={i} className="flex items-start gap-2.5 p-3 rounded-lg bg-white border border-rose-200 text-xs text-rose-900 shadow-sm">
                    <span className="text-rose-500 font-bold shrink-0">✕</span>
                    <span className="leading-relaxed">{d}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CPT Codes */}
          {relatedCpts.length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-blue-600" />
                  <h2 className="text-base font-bold text-slate-900">Applicable Procedure Codes (CPT)</h2>
                </div>
                <span className="text-xs text-slate-500">{relatedCpts.length} codes in scope</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {relatedCpts.map((cpt: string, i: number) => {
                  const [code, ...descParts] = cpt.split(" — ");
                  const codeOnly = code.trim();
                  const isCopied = copiedCode === codeOnly;
                  return (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-blue-50/20 hover:border-blue-200 transition-all shadow-sm">
                      <div className="min-w-0 pr-2">
                        <span className="font-mono text-xs font-bold text-blue-600">{codeOnly}</span>
                        <p className="text-xs text-slate-700 truncate mt-0.5">{descParts.join(" — ")}</p>
                      </div>
                      <button onClick={() => handleCopy(codeOnly)} className="p-1.5 text-slate-400 hover:text-blue-600 rounded hover:bg-white transition-colors shrink-0" title="Copy CPT Code">
                        {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      <div className="pt-2">
        <Link to="/reviewer/policies" className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-semibold">
          <ArrowLeft className="h-4 w-4" /> Back to Policy Library
        </Link>
      </div>
    </div>
  );
}
