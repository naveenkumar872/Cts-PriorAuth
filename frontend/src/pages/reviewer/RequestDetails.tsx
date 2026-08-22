import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, CheckCircle, XCircle, Clock, AlertCircle,
  User, Building, Brain, ChevronDown, ChevronUp,
  BookOpen, TrendingUp, TrendingDown, Minus, Eye, Download,
  Activity, FlaskConical, Code2, FileText, Loader2,
  Sparkles, Search, RefreshCw, ChevronRight,
} from "lucide-react";
import { api } from "@/lib/api";
import type { AuthorizationRequest, AuthorizationStatus, AIFactor, ClinicalDocument } from "@/types";
import { DocumentPreviewModal, DOC_TYPE_CONFIG } from "@/components/ui/DocumentPreviewModal";

const STATUS_CONFIG: Record<AuthorizationStatus, {
  label: string; bg: string; text: string; border: string;
  icon: React.ComponentType<{ className?: string }>;
}> = {
  "Approved":                   { label: "Approved",          bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", icon: CheckCircle },
  "Not Approved":               { label: "Not Approved",      bg: "bg-rose-50",    text: "text-rose-700",    border: "border-rose-200",    icon: XCircle },
  "Denied":                     { label: "Not Approved",      bg: "bg-rose-50",    text: "text-rose-700",    border: "border-rose-200",    icon: XCircle },
  "Rejected":                   { label: "Not Approved",      bg: "bg-rose-50",    text: "text-rose-700",    border: "border-rose-200",    icon: XCircle },
  "Nurse Review Required":      { label: "Nurse Review Required", bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200", icon: Brain },
  "Pending Review":             { label: "Pending Review",    bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200",   icon: Clock },
  "More Information Required":  { label: "More Info Required",bg: "bg-amber-50",    text: "text-amber-700",    border: "border-amber-200",    icon: AlertCircle },
  "Under Review":               { label: "Under Review",      bg: "bg-blue-50",    text: "text-blue-700",    border: "border-blue-200",    icon: Clock },
};

const PRIORITY_COLORS: Record<string, string> = {
  high:   "bg-rose-50 text-rose-700 border-rose-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  low:    "bg-blue-50 text-blue-700 border-blue-200",
};

function getMappedPriority(p: string): "high" | "medium" | "low" {
  if (p === "urgent" || p === "high") return "high";
  if (p === "low") return "low";
  return "medium";
}

type Decision = "Approved" | "Not Approved" | "More Information Required" | "Nurse Review Required" | null;

// ── Completeness ring ────────────────────────────────────────────────────────
function ScoreRing({ score, size = 64 }: { score: number; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ;
  const color = score >= 70 ? "#10b981" : score >= 40 ? "#f59e0b" : "#ef4444";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={7} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={7}
        strokeDasharray={`${filled} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`} />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central"
        fontSize={size < 60 ? 11 : 13} fontWeight="700" fill={color}>{score}</text>
    </svg>
  );
}

// ── Structured PA panel ──────────────────────────────────────────────────────
type StructuredPA = Record<string, any>;

function StructuredPAPanel({ caseId }: { caseId: string }) {
  const [data, setData]         = useState<StructuredPA | null>(null);
  const [pending, setPending]   = useState(false);
  const [showJson, setShowJson] = useState(false);
  const [retries, setRetries]   = useState(0);

  const load = useCallback(async () => {
    try {
      const res = await api.getStructuredPA(caseId) as any;
      if (res?.status === "pending") {
        setPending(true);
        if (retries < 10) setTimeout(() => setRetries(r => r + 1), 3000);
      } else {
        setPending(false);
        setData(res as StructuredPA);
      }
    } catch { /* 404 = not ready yet */ }
  }, [caseId, retries]);

  useEffect(() => { load(); }, [load]);

  if (pending || (!data && retries > 0)) {
    return (
      <div className="rounded-xl border border-blue-200 bg-blue-50/20 p-5 shadow-xs">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 text-blue-600 animate-spin shrink-0" />
          <div>
            <p className="text-sm font-bold text-blue-900">Validation &amp; Preprocessing Running…</p>
            <p className="text-xs text-blue-700 mt-0.5">Pipeline triggered automatically. This will update in a few seconds.</p>
          </div>
        </div>
      </div>
    );
  }
  if (!data) return null;

  const vs     = data.validationSummary ?? {};
  const cd     = data.clinicalData ?? {};
  const docs   = data.extractedDocuments ?? [];
  const issues = (data.validationIssues ?? []) as any[];
  const crits  = issues.filter((i: any) => i.severity === "critical");
  const warns  = issues.filter((i: any) => i.severity === "warning");
  const score  = vs.completenessScore ?? 0;
  const ready  = vs.readyForTriage === true;
  const pipe   = data.pipelineStatus ?? "unknown";

  const pipeColor = pipe === "passed"  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : pipe === "warning"               ? "bg-amber-50 text-amber-700 border-amber-200"
    :                                    "bg-rose-50 text-rose-700 border-rose-200";

  const strengthColor = (s: string) => s === "strong"   ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : s === "moderate"                                   ? "bg-amber-50 text-amber-700 border-amber-200"
    :                                                      "bg-rose-50 text-rose-700 border-rose-200";

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3 flex-wrap bg-slate-50/50">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-blue-600" />
          <h3 className="text-sm font-bold text-slate-900">Structured PA Preprocessing Data</h3>
        </div>
        <div className="flex items-center gap-2 ml-auto flex-wrap">
          <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${pipeColor}`}>
            Pipeline: {pipe.charAt(0).toUpperCase() + pipe.slice(1)}
          </span>
          {ready
            ? <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center gap-1"><CheckCircle className="h-3 w-3" />Ready for Triage</span>
            : <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 flex items-center gap-1"><AlertCircle className="h-3 w-3" />Needs Attention</span>
          }
          {data.ranAt && <span className="text-xs text-slate-400">{new Date(data.ranAt).toLocaleString()}</span>}
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Score + summary */}
        <div className="flex items-start gap-5">
          <div className="flex flex-col items-center gap-1 shrink-0">
            <ScoreRing score={score} size={72} />
            <span className="text-[10px] text-slate-500 font-bold uppercase">Completeness</span>
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            {cd.clinicalSummary && <p className="text-xs text-slate-700 leading-relaxed font-medium">{cd.clinicalSummary}</p>}
            <div className="flex flex-wrap gap-2">
              {cd.medicalNecessityStrength && (
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${strengthColor(cd.medicalNecessityStrength)}`}>
                  Medical Necessity: {cd.medicalNecessityStrength.charAt(0).toUpperCase() + cd.medicalNecessityStrength.slice(1)}
                </span>
              )}
              {cd.conservativeTxDocumented === true && (
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" /> Prior Conservative Treatment Documented
                </span>
              )}
              {cd.conservativeTxDocumented === false && (
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-rose-100 text-rose-700 border border-rose-200 flex items-center gap-1">
                  <XCircle className="h-3 w-3" /> No Conservative Treatment Found
                </span>
              )}
              {typeof cd.clinicalComplexityScore === "number" && (
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  Complexity: {cd.clinicalComplexityScore}/100
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ICD-10 + CPT codes */}
        {((cd.icd10CodesExtracted?.length ?? 0) > 0 || (cd.cptCodesExtracted?.length ?? 0) > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(cd.icd10CodesExtracted?.length ?? 0) > 0 && (
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <FlaskConical className="h-3.5 w-3.5 text-blue-500" /> ICD-10 Extracted
                </p>
                <div className="space-y-1.5">
                  {cd.icd10CodesExtracted.map((c: any, i: number) => (
                    <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="font-mono text-xs font-bold text-blue-600 whitespace-nowrap">{c.code}</span>
                      <span className="text-xs text-slate-700 flex-1 font-medium">{c.description}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0 ${c.type === "primary" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"}`}>{c.type}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {(cd.cptCodesExtracted?.length ?? 0) > 0 && (
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Code2 className="h-3.5 w-3.5 text-blue-500" /> CPT Extracted
                </p>
                <div className="space-y-1.5">
                  {cd.cptCodesExtracted.map((c: any, i: number) => (
                    <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="font-mono text-xs font-bold text-blue-600 whitespace-nowrap">{c.code}</span>
                      <span className="text-xs text-slate-700 flex-1 font-medium">{c.description}</span>
                      {c.valid === false && <span className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded font-bold shrink-0">Invalid</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Raw JSON toggle */}
        <div className="border-t border-slate-100 pt-3">
          <button onClick={() => setShowJson(v => !v)}
            className="flex items-center gap-2 text-xs text-slate-500 hover:text-blue-600 font-bold transition-colors">
            <Code2 className="h-3.5 w-3.5" />
            {showJson ? "Hide" : "View"} Raw Structured PA JSON
            {showJson ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          {showJson && (
            <pre className="mt-3 p-4 rounded-xl bg-slate-900 text-slate-100 text-[11px] leading-relaxed overflow-x-auto max-h-96 overflow-y-auto scrollbar-hide">
              {JSON.stringify(data, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Policy Evidence Panel ─────────────────────────────────────────────────────
type EvidenceData = Record<string, any>;

function PolicyEvidencePanel({ caseId, caseNumber }: { caseId: string; caseNumber: string }) {
  const navigate = useNavigate();
  const [data, setData]         = useState<EvidenceData | null>(null);
  const [pending, setPending]   = useState(false);
  const [retries, setRetries]   = useState(0);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const load = useCallback(async () => {
    try {
      const res = await api.getExplanation(caseId) as any;
      if (res?.status === "pending") {
        setPending(true);
        if (retries < 12) setTimeout(() => setRetries(r => r + 1), 4000);
      } else {
        setPending(false);
        setData(res as EvidenceData);
      }
    } catch { /* not ready yet */ }
  }, [caseId, retries]);

  useEffect(() => { load(); }, [load]);

  if (pending || (!data && retries > 0)) {
    return (
      <div className="rounded-xl border border-indigo-200 bg-indigo-50/20 p-5 shadow-xs">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 text-indigo-600 animate-spin shrink-0" />
          <div>
            <p className="text-sm font-bold text-indigo-900">Generating Policy Evidence &amp; LLM Rationale…</p>
            <p className="text-xs text-indigo-700 mt-0.5">Retrieving relevant policy chunks from Weaviate vector database. This takes ~10 seconds.</p>
          </div>
        </div>
      </div>
    );
  }
  if (!data) return null;

  const chunks   = (data.retrievedChunks ?? []) as any[];
  const decColor = data.ruleDecision === "Approved"
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : data.ruleDecision === "Not Approved"
    ? "bg-rose-50 text-rose-700 border-rose-200"
    : data.ruleDecision === "Nurse Review Required"
    ? "bg-indigo-50 text-indigo-700 border-indigo-200"
    : "bg-amber-50 text-amber-700 border-amber-200";

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs space-y-0">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3 bg-slate-50/50">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-indigo-600" />
          <h3 className="text-sm font-bold text-slate-900">Policy Evidence &amp; LLM Explanation</h3>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${decColor}`}>
            {data.ruleDecision}
          </span>
          <button
            onClick={() => navigate(`/reviewer/policy-companion?caseId=${caseNumber || caseId}`)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded-lg border border-indigo-200 transition-colors"
          >
            Ask Companion <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* LLM Explanation */}
        {data.explanation && (
          <div className="rounded-xl bg-indigo-50/60 border border-indigo-100 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="h-4 w-4 text-indigo-600 shrink-0" />
              <p className="text-xs font-bold text-indigo-900 uppercase tracking-wide">AI-Generated Rationale</p>
            </div>
            <p className="text-xs text-slate-800 leading-relaxed font-medium">{data.explanation}</p>
          </div>
        )}

        {/* Call to action to open full Policy Companion */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 p-3.5 rounded-xl border border-blue-100">
          <div>
            <p className="text-xs font-bold text-blue-950">Interactive Policy Companion</p>
            <p className="text-[11px] text-blue-700 font-medium">Ask specific policy criteria questions for case {caseNumber}</p>
          </div>
          <button
            onClick={() => navigate(`/reviewer/policy-companion?caseId=${caseNumber || caseId}`)}
            className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 shrink-0"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Launch Companion
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Factor row ───────────────────────────────────────────────────────────────
function FactorRow({ factor }: { factor: AIFactor }) {
  const ImpactIcon = factor.impact === "positive" ? TrendingUp : factor.impact === "negative" ? TrendingDown : Minus;
  const color    = factor.impact === "positive" ? "text-emerald-600" : factor.impact === "negative" ? "text-rose-600" : "text-slate-500";
  const barColor = factor.impact === "positive" ? "bg-emerald-500" : factor.impact === "negative" ? "bg-rose-500" : "bg-slate-400";
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
      <ImpactIcon className={`h-4 w-4 mt-0.5 shrink-0 ${color}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <p className="text-xs font-bold text-slate-900">{factor.name}</p>
          <span className="text-xs text-slate-500 font-bold whitespace-nowrap">{Math.round(factor.weight * 100)}%</span>
        </div>
        <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden mb-1.5">
          <div className={`h-full ${barColor} rounded-full`} style={{ width: `${factor.weight * 100}%` }} />
        </div>
        <p className="text-[11px] text-slate-500 font-medium">{factor.description}</p>
      </div>
    </div>
  );
}

export default function ReviewerRequestDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [request, setRequest]   = useState<AuthorizationRequest | null>(null);
  const [loading, setLoading]   = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [decision, setDecision] = useState<Decision>(null);
  const [rationale, setRationale] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<ClinicalDocument | null>(null);

  useEffect(() => {
    if (!id) return;
    api.getAuthorization(id)
      .then(d => setRequest(d as AuthorizationRequest))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDecisionSubmit = async () => {
    if (!decision || !request) return;
    setSubmitting(true);
    try {
      const result = await api.submitDecision(request.id, { decision, rationale }) as any;
      if (result?.case) setRequest(result.case as AuthorizationRequest);
    } catch (e) {
      console.error(e);
    }
    setSubmitting(false);
    setSubmitted(true);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="h-8 w-8 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
    </div>
  );

  if (notFound || !request) return (
    <div className="text-center py-20 bg-white rounded-xl border border-slate-200 max-w-2xl mx-auto shadow-sm">
      <AlertCircle className="h-12 w-12 text-slate-300 mx-auto mb-4" />
      <h2 className="text-lg font-semibold text-slate-900">Request Not Found</h2>
      <button onClick={() => navigate("/reviewer/review-queue")} className="btn-secondary mt-4">
        ← Back to Queue
      </button>
    </div>
  );

  const cfg = STATUS_CONFIG[request.status as AuthorizationStatus] ?? {
    label: request.status, bg: "bg-slate-50", text: "text-slate-700",
    border: "border-slate-200", icon: AlertCircle,
  };
  const StatusIcon = cfg.icon;
  const ai = request.aiRecommendation;
  const isPending = ["Pending Review", "More Information Required", "Under Review", "Nurse Review Required"].includes(request.status);
  const aiDecisionColor = ai?.decision === "Approve"
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : ai?.decision === "Deny"
    ? "bg-rose-50 text-rose-700 border-rose-200"
    : "bg-amber-50 text-amber-700 border-amber-200";

  return (
    <div className="space-y-6">
      {/* Document Preview Modal */}
      {previewDoc && request && (
        <DocumentPreviewModal
          doc={previewDoc}
          request={request}
          onClose={() => setPreviewDoc(null)}
        />
      )}

      {/* Header with Top Policy Companion Button */}
      <div className="flex items-start justify-between gap-4 flex-wrap bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-start gap-3">
          <button
            onClick={() => navigate(-1)}
            className="mt-0.5 p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-slate-900 font-mono">{request.caseNumber}</h1>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                <StatusIcon className="h-3.5 w-3.5" />{cfg.label}
              </span>
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${PRIORITY_COLORS[getMappedPriority(request.priority)] ?? ""}`}>
                {getMappedPriority(request.priority).charAt(0).toUpperCase() + getMappedPriority(request.priority).slice(1)} Priority
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Submitted {new Date(request.submittedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
              {request.assignedTo && ` · Assigned to ${request.assignedTo}`}
            </p>
          </div>
        </div>

        {/* Open Policy Companion Action Button */}
        <button
          onClick={() => navigate(`/reviewer/policy-companion?caseId=${request.caseNumber || request.id}`)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer shrink-0"
        >
          <Sparkles className="h-4 w-4" />
          Ask Policy Companion ✨
        </button>
      </div>

      {/* ── Structured PA Preprocessing Panel ── */}
      <StructuredPAPanel caseId={request.id} />

      {/* ── Spacious 2-Column Workspace ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT MAIN COLUMN (Clinical Data, Procedures, Rules & Evidence) - 7 cols */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Patient & Requesting Provider Cards Side by Side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Patient Card */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex items-center gap-2 mb-4">
                <User className="h-4 w-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Patient Information</h3>
              </div>
              <div className="space-y-2">
                <InfoRow label="Name"      value={request.patient?.name ?? ""} bold />
                <InfoRow label="DOB"       value={`${request.patient?.dob ?? ""} (${new Date().getFullYear() - new Date(request.patient?.dob ?? "").getFullYear()} yrs)`} />
                <InfoRow label="Member ID" value={request.patient?.memberId ?? ""} mono />
                <InfoRow label="Group ID"  value={request.patient?.groupId ?? ""} mono />
                <InfoRow label="Payer"     value={request.patient?.payer ?? ""} />
                <InfoRow label="Plan"      value={request.patient?.plan ?? ""} />
                {request.patient?.primaryCare && <InfoRow label="PCP" value={request.patient.primaryCare} />}
              </div>
            </div>

            {/* Requesting Provider Card */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex items-center gap-2 mb-4">
                <Building className="h-4 w-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Requesting Provider</h3>
              </div>
              <div className="space-y-2">
                <InfoRow label="Physician"    value={request.provider?.name ?? ""} bold />
                <InfoRow label="Specialty"    value={request.provider?.specialty ?? ""} />
                <InfoRow label="Organization" value={request.provider?.organization ?? ""} />
                <InfoRow label="NPI"          value={request.provider?.npi ?? ""} mono />
                <InfoRow label="Tax ID"       value={request.provider?.taxId ?? ""} mono />
                <InfoRow label="Phone"        value={request.provider?.phone ?? ""} />
              </div>
            </div>
          </div>

          {/* Requested Procedures Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Requested Procedures</h3>
            <div className="space-y-2">
              {(request.procedures ?? []).map((p, i) => (
                <div key={i} className="p-3.5 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-bold text-slate-900">{p.description}</p>
                    <span className="font-mono text-xs font-bold text-blue-600 whitespace-nowrap">{p.code}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 font-medium">
                    {p.modifier ? `Modifier: ${p.modifier} · ` : ""}Qty: {p.quantity} · {p.serviceDate ? new Date(p.serviceDate).toLocaleDateString() : "—"} · {p.placeOfService}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Diagnoses Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Diagnoses</h3>
            <div className="space-y-2">
              {(request.diagnoses ?? []).map((d, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="font-mono text-xs font-bold text-blue-600 whitespace-nowrap">{d.code}</span>
                  <span className="text-xs text-slate-800 flex-1 font-medium">{d.description}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold shrink-0 ${d.type === "primary" ? "bg-blue-50 text-blue-700 border border-blue-200" : "bg-slate-100 text-slate-500 border border-slate-200"}`}>{d.type}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Clinical Notes Card */}
          {request.clinicalNotes && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 mb-2">Clinical Notes</h3>
              <p className="text-xs text-slate-700 leading-relaxed font-medium bg-slate-50 p-4 rounded-lg border border-slate-100 whitespace-pre-wrap">
                {request.clinicalNotes}
              </p>
            </div>
          )}

          {/* Supporting Documents Card */}
          {(request.documents?.length ?? 0) > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 mb-3">Supporting Documents ({request.documents.length})</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {request.documents.map(doc => {
                  const docTypeCfg = DOC_TYPE_CONFIG[doc.type] ?? DOC_TYPE_CONFIG.other;
                  const DocIcon = docTypeCfg.icon;
                  return (
                    <div key={doc.id} className="flex items-start gap-3 p-3.5 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/10 transition-all">
                      <div className={`p-2.5 rounded-lg ${docTypeCfg.bg} ${docTypeCfg.border} border shrink-0 mt-0.5`}>
                        <DocIcon className={`h-4 w-4 ${docTypeCfg.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate" title={doc.name}>{doc.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${docTypeCfg.bg} ${docTypeCfg.color} ${docTypeCfg.border}`}>{docTypeCfg.label}</span>
                          {doc.size && <span className="text-[11px] text-slate-400">· {doc.size}</span>}
                        </div>
                        {doc.uploadedBy && <p className="text-[11px] text-slate-400 mt-1">By {doc.uploadedBy}</p>}
                        <div className="flex items-center gap-2 mt-2.5">
                          <button
                            onClick={() => setPreviewDoc(doc)}
                            className="btn-primary px-3 py-1 text-xs shadow-none"
                          >
                            <Eye className="h-3.5 w-3.5" /> Preview
                          </button>
                          <button
                            onClick={() => { if (doc.url) { const a = document.createElement("a"); a.href = doc.url; a.download = doc.name; a.click(); } }}
                            className="btn-secondary px-3 py-1 text-xs border-slate-200 shadow-none"
                          >
                            <Download className="h-3.5 w-3.5" /> Download
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Rule-Based Evaluation Card */}
          {request.ruleEvaluation && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex items-center gap-2 mb-4">
                <FlaskConical className="h-4 w-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Rule-Based Evaluation</h3>
                {request.policyContext?.policyName && (
                  <span className="ml-auto text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                    {request.policyContext.policyName}
                  </span>
                )}
              </div>

              {/* Decision badge + reason */}
              <div className={`flex items-start justify-between gap-3 p-3.5 rounded-xl mb-3 border ${
                request.ruleEvaluation.decision === "Approved"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                  : request.ruleEvaluation.decision === "Not Approved"
                  ? "bg-rose-50 border-rose-200 text-rose-900"
                  : request.ruleEvaluation.decision === "Nurse Review Required"
                  ? "bg-indigo-50 border-indigo-200 text-indigo-900"
                  : "bg-amber-50 border-amber-200 text-amber-900"
              }`}>
                <span className="text-xs font-bold">{request.ruleEvaluation.decision}</span>
                <span className="text-xs font-medium text-right flex-1">{request.ruleEvaluation.reason}</span>
              </div>

              {/* Pathway results */}
              {(request.ruleEvaluation.pathways ?? []).length > 0 && (
                <div className="space-y-1.5 mb-3">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Pathways Evaluated</p>
                  {request.ruleEvaluation.pathways.slice(0, 6).map((p, i) => (
                    <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs border ${
                      p.passed ? "bg-emerald-50 text-emerald-700 border-emerald-100" : p.unknown ? "bg-amber-50 text-amber-700 border-amber-100" : "bg-slate-50 text-slate-600 border-slate-200"
                    }`}>
                      {p.passed ? <CheckCircle className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                        : p.unknown ? <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                        : <XCircle className="h-3.5 w-3.5 shrink-0 text-rose-600" />}
                      <span className="font-bold truncate">{p.pathwayId?.replace(/_/g, " ")}</span>
                      <span className="ml-auto shrink-0 font-bold">
                        {p.passed ? "Passed" : p.unknown ? "Unknown" : "Failed"}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Missing information */}
              {(request.ruleEvaluation.missingInformation ?? []).length > 0 && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200">
                  <p className="text-xs font-bold text-amber-900 mb-1.5">
                    Missing Information Required ({request.ruleEvaluation.missingInformation.length})
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {request.ruleEvaluation.missingInformation.map((item, i) => (
                      <span key={i} className="text-xs px-2.5 py-1 rounded-md border border-amber-200 bg-white text-amber-900 font-bold">
                        {item.replace(/_/g, " ")}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Policy Evidence & LLM Explanation Panel */}
          <PolicyEvidencePanel caseId={request.id} caseNumber={request.caseNumber} />
        </div>

        {/* RIGHT SIDEBAR COLUMN (Decision Workspace & AI Support) - 5 cols */}
        <div className="lg:col-span-5 space-y-6 sticky top-4">
          
          {/* AI Recommendation Context Card */}
          {ai && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex items-center gap-2 mb-4">
                <Brain className="h-4 w-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">AI Recommendation</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-bold uppercase">Rec. Decision</span>
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${aiDecisionColor}`}>{ai.decision}</span>
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1">
                    <span>Confidence Score</span>
                    <span>{ai.confidence}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full" style={{ width: `${ai.confidence}%` }} />
                  </div>
                </div>
                {ai.keyFactors && ai.keyFactors.length > 0 && (
                  <div className="space-y-2 pt-3 border-t border-slate-100">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Key Decision Factors</p>
                    <div className="space-y-2">
                      {ai.keyFactors.map((f, idx) => <FactorRow key={idx} factor={f} />)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Case Evaluation Decision Panel */}
          {isPending && !submitted && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Case Evaluation Decision</h3>
              <div className="flex flex-col gap-2">
                {(["Approved", "Not Approved", "More Information Required"] as const).map(d => {
                  const colors: Record<string, { active: string; inactive: string }> = {
                    "Approved":                  { active: "border-emerald-500 bg-emerald-500 text-white", inactive: "border-emerald-200 text-emerald-700 hover:bg-emerald-50/50" },
                    "Not Approved":              { active: "border-rose-500 bg-rose-500 text-white",     inactive: "border-rose-200 text-rose-700 hover:bg-rose-50/50" },
                    "More Information Required": { active: "border-amber-500 bg-amber-500 text-white", inactive: "border-amber-200 text-amber-700 hover:bg-amber-50/50" },
                  };
                  return (
                    <button
                      key={d}
                      onClick={() => setDecision(d)}
                      className={`py-2.5 px-3.5 rounded-xl border text-xs font-bold transition-all text-left flex items-center justify-between ${decision === d ? colors[d].active : `bg-white ${colors[d].inactive}`}`}
                    >
                      <span>{d}</span>
                      {decision === d && <CheckCircle className="h-4 w-4 text-white" />}
                    </button>
                  );
                })}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                  Decision Rationale <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={rationale}
                  onChange={e => setRationale(e.target.value)}
                  placeholder="Document clinical evidence, policy guidelines satisfied or missing, and logic for this prior authorization decision..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
                />
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                <button onClick={() => navigate(-1)} className="btn-secondary flex-1 py-2 text-xs">Cancel</button>
                <button
                  onClick={handleDecisionSubmit}
                  disabled={!decision || !rationale.trim() || submitting}
                  className="btn-primary flex-1 py-2 text-xs shadow-sm"
                >
                  {submitting && <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />}
                  {submitting ? "Submitting..." : "Submit Decision"}
                </button>
              </div>
            </div>
          )}

          {submitted && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 flex items-start gap-3 shadow-xs">
              <CheckCircle className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-bold text-emerald-900">Decision Submitted</p>
                <p className="text-xs text-emerald-700 mt-0.5 font-medium">
                  Your decision of <strong>{decision}</strong> has been recorded and saved to the database.
                </p>
              </div>
            </div>
          )}

          {/* Audit Activity Log */}
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
            <button
              onClick={() => setShowAuditLog(v => !v)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
            >
              <h3 className="text-sm font-bold text-slate-900">Activity Log ({request.auditLog?.length ?? 0})</h3>
              {showAuditLog ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
            </button>
            {showAuditLog && (
              <div className="border-t border-slate-200 p-5 space-y-3 bg-slate-50/50">
                {(request.auditLog ?? []).map(entry => (
                  <div key={entry.id} className="flex gap-3 text-xs">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                    <div className="flex-1">
                      <p className="font-bold text-slate-800">{entry.action}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 font-medium">{entry.performedBy} · {entry.role} · {new Date(entry.timestamp).toLocaleString()}</p>
                      {entry.details && <p className="text-[11px] text-slate-500 mt-1 leading-relaxed font-medium">{entry.details}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, bold, mono }: { label: string; value: string; bold?: boolean; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-3 text-xs">
      <span className="text-slate-500 shrink-0 font-medium">{label}</span>
      <span className={`text-right ${bold ? "font-bold text-slate-900" : "text-slate-700 font-medium"} ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}
