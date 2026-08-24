/**
 * Module 3: Validation & Preprocessing
 * Runs the 4-step pipeline and displays results for a single authorization request.
 *
 * Steps:
 *   1. Validate Required Information
 *   2. Extract Text from Documents
 *   3. Process Clinical Notes & Results
 *   4. Convert to Structured PA Data
 */
import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft, Play, RefreshCw, CheckCircle, XCircle,
  AlertTriangle, Info, ChevronDown, ChevronUp,
  FileSearch, FileText, Brain, Database,
  ShieldCheck, Clock, Loader2, ExternalLink,
  Activity, Tag, Pill, Calendar, BarChart2,
} from "lucide-react";
import { api } from "@/lib/api";
import type { AuthorizationRequest } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type StepStatus = "pending" | "passed" | "warning" | "failed" | "running";
type PipelineStatus = "pending" | "running" | "passed" | "warning" | "failed";

interface ValidationIssue {
  id: string;
  field: string;
  severity: "critical" | "warning" | "info";
  message: string;
  resolution: string;
}

interface ExtractedDoc {
  docId: string;
  docName: string;
  docType: string;
  fileSize: string;
  uploadedBy: string;
  textPreview: string;
  extractedText: string;      // full OCR output from Gemini
  wordCount: number;
  keyTerms: string[];
  extractedAt: string;
  confidence: number;
  pages: number;
  ocrEngine: string;
  status: string;
}

interface ClinicalEntities {
  // Gemini NLP extracted entities (new real fields)
  icd10_codes:                    { code: string; description: string; type: string }[];
  cpt_codes:                      { code: string; description: string; valid: boolean }[];
  medications:                    string[];
  severity_indicators:            string[];
  duration_signals:               string[];
  conservative_treatment_documented: boolean;
  conservative_treatment_details: string[];
  key_clinical_findings:          string[];
  functional_limitations:         string[];
  relevant_history:               string[];
  dates_mentioned:                string[];
  clinical_complexity_score:      number;
  medical_necessity_strength:     string;
  summary:                        string;
  notesWordCount:                 number;
  totalTextWords:                 number;
  // Legacy simulated fields (kept for backwards compat)
  diagnosesFound?:         { code: string; description: string; type: string; valid: boolean }[];
  cptsFound?:              { code: string; description: string; serviceDate: string; valid: boolean }[];
  medicalTermsDetected?:   string[];
  medicationsDetected?:    string[];
  datesExtracted?:         string[];
  durationSignals?:        string[];
  severityIndicators?:     string[];
  conservativeTxDocumented?: boolean;
  keyPhrases?:             string[];
  clinicalComplexityScore?: number;
}

interface ValidationSummary {
  completenessScore: number;
  fieldBreakdown: Record<string, number>;
  criticalIssues: number;
  warningIssues: number;
  riskLevel: "low" | "medium" | "high";
  riskReason: string;
  readyForTriage: boolean;
}

interface ValidationResult {
  id: string;
  authorizationId: string;
  pipelineStatus: PipelineStatus;
  ranAt: string;
  durationMs: number;
  steps: {
    step1: { label: string; status: StepStatus; issues: ValidationIssue[]; summary: string };
    step2: { label: string; status: StepStatus; extracted: ExtractedDoc[]; summary: string };
    step3: { label: string; status: StepStatus; entities: ClinicalEntities; summary: string };
    step4: { label: string; status: StepStatus; structured: { validationSummary: ValidationSummary; clinicalData: any; paRequest: any }; summary: string };
  };
}

// ─── Step config ──────────────────────────────────────────────────────────────

const STEP_META = [
  {
    key:   "step1",
    num:   1,
    label: "File Parsing & Validation",
    icon:  ShieldCheck,
    desc:  "Verify demographic fields, provider identifiers, CPT codes, and initial documentation completeness.",
  },
  {
    key:   "step2",
    num:   2,
    label: "OCR Document Extraction",
    icon:  FileSearch,
    desc:  "Extract unstructured raw text layers from uploaded files including scan notes, imaging, and clinical charts.",
  },
  {
    key:   "step3",
    num:   3,
    label: "Clinical Entity Extraction",
    icon:  Brain,
    desc:  "Extract primary/secondary diagnoses, treatments, severity signals, and medication history using clinical models.",
  },
  {
    key:   "step4",
    num:   4,
    label: "Completeness & Triage Scoring",
    icon:  Database,
    desc:  "Consolidate extracted entities, calculate validation risk scores, and check authorization triage readiness.",
  },
];

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_CFG: Record<StepStatus | PipelineStatus, {
  icon: React.ComponentType<{ className?: string }>;
  label: string; bg: string; text: string; border: string; ring: string;
}> = {
  pending: { icon: Clock,         label: "Pending",  bg: "bg-slate-100",   text: "text-slate-600",   border: "border-slate-200",   ring: "ring-slate-200" },
  running: { icon: Loader2,       label: "Running",  bg: "bg-teal-50",     text: "text-teal-600",    border: "border-teal-200",    ring: "ring-teal-300" },
  passed:  { icon: CheckCircle,   label: "Passed",   bg: "bg-emerald-50",  text: "text-emerald-700", border: "border-emerald-200", ring: "ring-emerald-300" },
  warning: { icon: AlertTriangle, label: "Warning",  bg: "bg-amber-50",    text: "text-amber-700",   border: "border-amber-200",   ring: "ring-amber-300" },
  failed:  { icon: XCircle,       label: "Failed",   bg: "bg-rose-50",     text: "text-rose-700",    border: "border-rose-200",    ring: "ring-rose-300" },
};

const SEVERITY_CFG = {
  critical: { bg: "bg-rose-50",   text: "text-rose-700",   border: "border-rose-200",   icon: XCircle,       dot: "bg-rose-500" },
  warning:  { bg: "bg-amber-50",  text: "text-amber-700",  border: "border-amber-200",  icon: AlertTriangle, dot: "bg-amber-500" },
  info:     { bg: "bg-teal-50",   text: "text-teal-700",   border: "border-teal-200",   icon: Info,          dot: "bg-teal-500" },
};

const RISK_CFG = {
  low:    { bg: "bg-emerald-100", text: "text-emerald-800", label: "Low Risk" },
  medium: { bg: "bg-amber-100",   text: "text-amber-800",   label: "Medium Risk" },
  high:   { bg: "bg-rose-100",    text: "text-rose-800",    label: "High Risk" },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: StepStatus | PipelineStatus }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      <Icon className={`h-3 w-3 ${status === "running" ? "animate-spin" : ""}`} />
      {cfg.label}
    </span>
  );
}

function StepCard({
  meta, status, children, expanded, onToggle,
}: {
  meta: typeof STEP_META[0];
  status: StepStatus;
  children: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
}) {
  const cfg  = STATUS_CFG[status] ?? STATUS_CFG.pending;
  const Icon = meta.icon;

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Header — always visible */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-50/70 transition-colors text-left"
      >
        {/* Step number + icon */}
        <div className={`shrink-0 flex h-10 w-10 items-center justify-center rounded-xl ${cfg.bg} ${cfg.border} border`}>
          <Icon className={`h-5 w-5 ${cfg.text}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Step {meta.num}</span>
            <StatusBadge status={status} />
          </div>
          <p className="text-sm font-bold text-slate-900 mt-0.5">{meta.label}</p>
          <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{meta.desc}</p>
        </div>
        <div className="shrink-0 text-slate-400">
          {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </div>
      </button>

      {/* Collapsible content */}
      {expanded && (
        <div className="border-t border-slate-100 px-5 py-5 space-y-4">
          {children}
        </div>
      )}
    </div>
  );
}

function SummaryBar({ summary, status }: { summary: string; status: StepStatus }) {
  if (!summary) return null;
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.pending;
  return (
    <div className={`flex items-start gap-2.5 p-3.5 rounded-xl ${cfg.bg} border ${cfg.border}`}>
      <Activity className={`h-4 w-4 mt-0.5 shrink-0 ${cfg.text}`} />
      <p className={`text-sm leading-relaxed ${cfg.text}`}>{summary}</p>
    </div>
  );
}

// ─── Step 1 panel ─────────────────────────────────────────────────────────────

function Step1Panel({ step }: { step: ValidationResult["steps"]["step1"] }) {
  const crits = step.issues.filter(i => i.severity === "critical");
  const warns = step.issues.filter(i => i.severity === "warning");
  const infos = step.issues.filter(i => i.severity === "info");

  const groups = [
    { label: "Critical Issues", items: crits, sev: "critical" as const },
    { label: "Warnings",        items: warns, sev: "warning"  as const },
    { label: "Information",     items: infos, sev: "info"     as const },
  ].filter(g => g.items.length > 0);

  return (
    <div className="space-y-4">
      <SummaryBar summary={step.summary} status={step.status} />

      {step.issues.length === 0 ? (
        <div className="flex items-center gap-2.5 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
          <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
          <p className="text-sm font-semibold text-emerald-800">All required fields are valid. No issues found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Counts row */}
          <div className="flex gap-3 flex-wrap">
            {crits.length > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                <span className="text-xs font-bold text-rose-700">{crits.length} Critical</span>
              </div>
            )}
            {warns.length > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                <span className="text-xs font-bold text-amber-700">{warns.length} Warning{warns.length > 1 ? "s" : ""}</span>
              </div>
            )}
            {infos.length > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 border border-teal-200">
                <span className="h-2 w-2 rounded-full bg-teal-500" />
                <span className="text-xs font-bold text-teal-700">{infos.length} Info</span>
              </div>
            )}
          </div>

          {/* Issue groups */}
          {groups.map(group => {
            const cfg = SEVERITY_CFG[group.sev];
            const IssueIcon = cfg.icon;
            return (
              <div key={group.label}>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">{group.label}</p>
                <div className="space-y-2">
                  {group.items.map(issue => (
                    <div key={issue.id} className={`rounded-xl border ${cfg.border} ${cfg.bg} p-4`}>
                      <div className="flex items-start gap-3">
                        <IssueIcon className={`h-4 w-4 mt-0.5 shrink-0 ${cfg.text}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text} border ${cfg.border}`}>
                              {issue.severity.toUpperCase()}
                            </span>
                            <code className="text-[11px] font-mono bg-white/70 px-2 py-0.5 rounded border border-slate-200 text-slate-700">
                              {issue.field}
                            </code>
                          </div>
                          <p className={`text-sm font-semibold ${cfg.text}`}>{issue.message}</p>
                          {issue.resolution && (
                            <p className="text-xs text-slate-600 mt-1.5 flex gap-1.5">
                              <span className="font-semibold text-slate-500 shrink-0">Fix:</span>
                              {issue.resolution}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Step 2 panel ─────────────────────────────────────────────────────────────

const DOC_TYPE_COLORS: Record<string, string> = {
  imaging:         "text-teal-700 bg-teal-50 border-teal-200",
  lab_result:      "text-purple-700 bg-purple-50 border-purple-200",
  clinical_note:   "text-slate-700 bg-slate-100 border-slate-200",
  referral:        "text-amber-700 bg-amber-50 border-amber-200",
  prescription:    "text-rose-700 bg-rose-50 border-rose-200",
  medical_history: "text-emerald-700 bg-emerald-50 border-emerald-200",
  other:           "text-slate-600 bg-slate-50 border-slate-200",
};

function Step2Panel({ step }: { step: ValidationResult["steps"]["step2"] }) {
  return (
    <div className="space-y-4">
      <SummaryBar summary={step.summary} status={step.status} />

      {step.extracted.length === 0 ? (
        <div className="flex items-center gap-2.5 p-4 rounded-xl bg-amber-50 border border-amber-200">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
          <p className="text-sm font-semibold text-amber-800">No documents attached. Upload supporting documents to enable text extraction.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {step.extracted.map(doc => {
            const color = DOC_TYPE_COLORS[doc.docType] ?? DOC_TYPE_COLORS.other;
            const confPct = Math.round(doc.confidence * 100);
            return (
              <div key={doc.docId} className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                {/* Doc header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 text-slate-500 shrink-0" />
                    <p className="text-sm font-semibold text-slate-900 truncate">{doc.docName}</p>
                  </div>
                  <span className={`shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${color}`}>
                    {doc.docType.replace("_", " ")}
                  </span>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg bg-slate-50 p-2.5 text-center border border-slate-100">
                    <p className="text-lg font-bold text-slate-900">{doc.wordCount}</p>
                    <p className="text-[11px] text-slate-500">Words</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2.5 text-center border border-slate-100">
                    <p className="text-lg font-bold text-slate-900">{doc.pages}</p>
                    <p className="text-[11px] text-slate-500">Page{doc.pages !== 1 ? "s" : ""}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2.5 text-center border border-slate-100">
                    <p className={`text-lg font-bold ${confPct >= 90 ? "text-emerald-600" : "text-amber-600"}`}>{confPct}%</p>
                    <p className="text-[11px] text-slate-500">Confidence</p>
                  </div>
                </div>

                {/* Text preview */}
                <div className="bg-slate-50 rounded-lg border border-slate-100 p-3">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1">Extracted Text Preview</p>
                  <p className="text-xs text-slate-700 leading-relaxed italic">"{doc.textPreview}..."</p>
                </div>

                {/* Key terms */}
                {doc.keyTerms.length > 0 && (
                  <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2">Key Terms Identified</p>
                    <div className="flex flex-wrap gap-1.5">
                      {doc.keyTerms.map(term => (
                        <span key={term} className="px-2.5 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-xs font-medium">
                          {term}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Meta */}
                <p className="text-[11px] text-slate-400">
                  {doc.fileSize} · Uploaded by {doc.uploadedBy} · Extracted {new Date(doc.extractedAt).toLocaleString()}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Step 3 panel ─────────────────────────────────────────────────────────────

function ScoreRing({ value, max = 100, label }: { value: number; max?: number; label: string }) {
  const pct = Math.min(100, (value / max) * 100);
  const color = pct >= 70 ? "#10b981" : pct >= 40 ? "#f59e0b" : "#ef4444";
  const r = 36, circ = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="88" height="88" viewBox="0 0 88 88">
        <circle cx="44" cy="44" r={r} fill="none" stroke="#e2e8f0" strokeWidth="8" />
        <circle cx="44" cy="44" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - pct / 100)}
          strokeLinecap="round"
          transform="rotate(-90 44 44)"
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
        <text x="44" y="44" textAnchor="middle" dominantBaseline="middle"
          style={{ fontSize: "16px", fontWeight: 700, fill: color }}>
          {value}
        </text>
      </svg>
      <p className="text-[11px] font-semibold text-slate-500 text-center">{label}</p>
    </div>
  );
}

function Step3Panel({ step }: { step: ValidationResult["steps"]["step3"] }) {
  const e = step.entities;
  if (!e) return <SummaryBar summary={step.summary} status={step.status} />;

  // Support both new Gemini fields and legacy simulated fields
  const icd10      = e.icd10_codes      ?? e.diagnosesFound    ?? [];
  const cpts       = e.cpt_codes        ?? e.cptsFound         ?? [];
  const meds       = e.medications      ?? e.medicationsDetected ?? [];
  const severity   = e.severity_indicators ?? e.severityIndicators ?? [];
  const durations  = e.duration_signals ?? e.durationSignals   ?? [];
  const medTerms   = e.medicalTermsDetected ?? [];
  const complexity = e.clinical_complexity_score ?? e.clinicalComplexityScore ?? 0;
  const strength   = e.medical_necessity_strength ?? "unknown";
  const conservative = e.conservative_treatment_documented ?? e.conservativeTxDocumented ?? false;
  const conservativeDetails = e.conservative_treatment_details ?? [];
  const keyFindings = e.key_clinical_findings ?? [];
  const funcLimits  = e.functional_limitations ?? [];
  const nlpSummary  = e.summary ?? "";
  const notesWords  = e.notesWordCount ?? 0;
  const totalWords  = e.totalTextWords ?? notesWords;

  const strengthColors: Record<string, string> = {
    strong:   "bg-emerald-50 border-emerald-200 text-emerald-800",
    moderate: "bg-amber-50 border-amber-200 text-amber-800",
    weak:     "bg-rose-50 border-rose-200 text-rose-800",
    unknown:  "bg-slate-50 border-slate-200 text-slate-700",
  };

  return (
    <div className="space-y-5">
      <SummaryBar summary={step.summary} status={step.status} />

      {/* NLP Clinical Summary from Gemini */}
      {nlpSummary && (
        <div className="p-4 rounded-xl bg-teal-50 border border-teal-200">
          <p className="text-[11px] font-bold text-teal-600 uppercase tracking-wide mb-1.5">
            Gemini Clinical Summary
          </p>
          <p className="text-sm text-teal-900 leading-relaxed">{nlpSummary}</p>
        </div>
      )}

      {/* Score + key signals */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="sm:col-span-1 flex justify-center">
          <ScoreRing value={complexity} label="Complexity Score" />
        </div>
        <div className="sm:col-span-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: "ICD-10 Codes",  value: icd10.length,    icon: Tag },
            { label: "CPT Codes",     value: cpts.length,     icon: Tag },
            { label: "Medications",   value: meds.length,     icon: Pill },
            { label: "Severity Flags",value: severity.length, icon: Activity },
            { label: "Duration Signals", value: durations.length, icon: Calendar },
            { label: "Total Words",   value: totalWords,      icon: FileText },
          ].map(stat => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
                <Icon className="h-4 w-4 text-teal-500 mx-auto mb-1" />
                <p className="text-xl font-bold text-slate-900">{stat.value}</p>
                <p className="text-[11px] text-slate-500">{stat.label}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Medical Necessity Strength */}
      <div className={`flex items-center gap-3 p-3.5 rounded-xl border ${strengthColors[strength] ?? strengthColors.unknown}`}>
        <BarChart2 className="h-5 w-5 shrink-0" />
        <div>
          <p className="text-sm font-bold">
            Medical Necessity Strength: {strength.charAt(0).toUpperCase() + strength.slice(1)}
          </p>
          <p className="text-xs mt-0.5 opacity-80">
            {strength === "strong"   ? "Well-documented with complete evidence. High likelihood of approval." : ""}
            {strength === "moderate" ? "Partially documented. Some gaps that reviewers may question." : ""}
            {strength === "weak"     ? "Insufficient evidence. Additional documentation strongly recommended." : ""}
          </p>
        </div>
      </div>

      {/* Conservative treatment */}
      <div className={`flex items-start gap-3 p-3.5 rounded-xl border ${conservative ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
        {conservative
          ? <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          : <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />}
        <div>
          <p className={`text-sm font-semibold ${conservative ? "text-emerald-800" : "text-amber-800"}`}>
            {conservative ? "Prior Conservative Treatment Documented" : "No Prior Conservative Treatment Found"}
          </p>
          {conservativeDetails.length > 0 && (
            <ul className="mt-1.5 space-y-0.5">
              {conservativeDetails.map((d, i) => (
                <li key={i} className="text-xs text-emerald-700 flex gap-1.5">
                  <span className="shrink-0">•</span>{d}
                </li>
              ))}
            </ul>
          )}
          {!conservative && (
            <p className="text-xs text-amber-700 mt-0.5">
              Document prior non-surgical management (PT, medications, injections) to strengthen the case.
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* ICD-10 codes */}
        {icd10.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">ICD-10 Codes Extracted</p>
            <div className="space-y-2">
              {icd10.map((d, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${"valid" in d && d.valid === false ? "bg-amber-500" : "bg-emerald-500"}`} />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <code className="text-xs font-bold font-mono text-teal-700">{d.code}</code>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${d.type === "primary" ? "bg-teal-100 text-teal-700" : "bg-slate-100 text-slate-600"}`}>
                        {d.type}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">{d.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CPT codes */}
        {cpts.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">CPT Codes Extracted</p>
            <div className="space-y-2">
              {cpts.map((p, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${p.valid ? "bg-emerald-500" : "bg-amber-500"}`} />
                  <div>
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-bold font-mono text-teal-700">{p.code}</code>
                      {!p.valid && <span className="text-[10px] text-amber-600 font-medium">Format warning</span>}
                    </div>
                    <p className="text-xs text-slate-600">{p.description}</p>
                    {("serviceDate" in p) && !!(p as Record<string, unknown>)["serviceDate"] && (
                      <p className="text-[11px] text-slate-400">Date: {String((p as Record<string, unknown>)["serviceDate"])}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Key clinical findings */}
        {keyFindings.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Key Clinical Findings</p>
            <div className="space-y-1.5">
              {keyFindings.map((f, i) => (
                <div key={i} className="flex items-start gap-2">
                  <CheckCircle className="h-3.5 w-3.5 text-teal-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-700">{f}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Severity indicators */}
        {severity.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Severity Indicators</p>
            <div className="space-y-1.5">
              {severity.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
                  <p className="text-xs text-slate-700">{s}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Medications */}
      {meds.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Medications Identified ({meds.length})</p>
          <div className="flex flex-wrap gap-1.5">
            {meds.map((m, i) => (
              <span key={i} className="px-2.5 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-xs font-medium capitalize">
                {m}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Duration signals */}
      {durations.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Duration / Timeline Signals</p>
          <div className="flex flex-wrap gap-1.5">
            {durations.map((s, i) => (
              <span key={i} className="px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-200 text-teal-700 text-xs font-medium">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Functional limitations */}
      {funcLimits.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Functional Limitations</p>
          <div className="space-y-1.5">
            {funcLimits.map((f, i) => (
              <div key={i} className="flex items-start gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-700">{f}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legacy medical terms (simulated mode only) */}
      {medTerms.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
            Medical Terms Detected ({medTerms.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {medTerms.map(t => (
              <span key={t} className="px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium capitalize">
                {t}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Step 4 panel ─────────────────────────────────────────────────────────────

function Step4Panel({ step }: { step: ValidationResult["steps"]["step4"] }) {
  const vs = step.structured?.validationSummary;
  if (!vs) return <SummaryBar summary={step.summary} status={step.status} />;

  const riskCfg = RISK_CFG[vs.riskLevel] ?? RISK_CFG.medium;
  const fieldEntries = Object.entries(vs.fieldBreakdown || {});
  const maxScore = fieldEntries.reduce((s, [, v]) => s + v, 0);

  return (
    <div className="space-y-5">
      <SummaryBar summary={step.summary} status={step.status} />

      {/* Risk status */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 flex items-center justify-between">
        <span className="text-xs font-bold text-slate-700">Triage Risk Assessment</span>
        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${riskCfg.bg} ${riskCfg.text}`}>
          {riskCfg.label}
        </div>
      </div>

      {/* Ready for triage banner */}
      <div className={`flex items-center gap-3 p-4 rounded-xl border ${vs.readyForTriage ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
        {vs.readyForTriage
          ? <CheckCircle className="h-6 w-6 text-emerald-600 shrink-0" />
          : <AlertTriangle className="h-6 w-6 text-amber-600 shrink-0" />}
        <div>
          <p className={`text-sm font-bold ${vs.readyForTriage ? "text-emerald-900" : "text-amber-900"}`}>
            {vs.readyForTriage ? "Ready for AI Triage (Module 5)" : "Not Ready for AI Triage"}
          </p>
          <p className={`text-xs mt-0.5 ${vs.readyForTriage ? "text-emerald-700" : "text-amber-700"}`}>
            {vs.riskReason}
            {vs.criticalIssues > 0 && ` — ${vs.criticalIssues} critical issue(s) must be resolved.`}
            {vs.warningIssues > 0 && vs.criticalIssues === 0 && ` — ${vs.warningIssues} warning(s) noted.`}
          </p>
        </div>
      </div>

      {/* Issue counts */}
      {(vs.criticalIssues > 0 || vs.warningIssues > 0) && (
        <div className="flex gap-3">
          {vs.criticalIssues > 0 && (
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-50 border border-rose-200">
              <XCircle className="h-4 w-4 text-rose-600" />
              <p className="text-sm font-semibold text-rose-700">{vs.criticalIssues} Critical Issue{vs.criticalIssues > 1 ? "s" : ""}</p>
            </div>
          )}
          {vs.warningIssues > 0 && (
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <p className="text-sm font-semibold text-amber-700">{vs.warningIssues} Warning{vs.warningIssues > 1 ? "s" : ""}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ValidationPreprocessing() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [request, setRequest]     = useState<AuthorizationRequest | null>(null);
  const [result, setResult]       = useState<ValidationResult | null>(null);
  const [running, setRunning]     = useState(false);
  const [loadErr, setLoadErr]     = useState<string | null>(null);
  const [expanded, setExpanded]   = useState<Record<string, boolean>>({
    step1: true, step2: false, step3: false, step4: false,
  });

  // Load the auth request + any existing validation result
  useEffect(() => {
    if (!id) return;
    api.getAuthorization(id)
      .then(d => setRequest(d as AuthorizationRequest))
      .catch(() => setLoadErr("Authorization request not found."));

    api.getValidationResult(id)
      .then(d => setResult(d as ValidationResult))
      .catch(() => { /* no result yet — that's fine */ });
  }, [id]);

  const runPipeline = async () => {
    if (!id || running) return;
    setRunning(true);
    setLoadErr(null);

    // Expand all steps with "running" feel
    setExpanded({ step1: true, step2: true, step3: true, step4: true });

    try {
      const data = await api.runValidation(id) as ValidationResult;
      setResult(data);
      // Auto-expand failed/warning steps, collapse passed ones
      const newExpanded: Record<string, boolean> = {};
      Object.keys(data.steps).forEach(key => {
        const s = data.steps[key as keyof typeof data.steps].status;
        newExpanded[key] = s === "failed" || s === "warning";
      });
      // Always expand step4 to show the summary
      newExpanded["step4"] = true;
      setExpanded(newExpanded);
    } catch (e: any) {
      setLoadErr(e.message ?? "Pipeline failed. Please try again.");
    }
    setRunning(false);
  };

  const toggle = (key: string) =>
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loadErr && !request) return (
    <div className="max-w-2xl mx-auto mt-16 text-center">
      <XCircle className="h-12 w-12 text-rose-400 mx-auto mb-4" />
      <h2 className="text-lg font-bold text-slate-900">{loadErr}</h2>
      <button onClick={() => navigate("/provider/requests")}
        className="btn-secondary">
        ← Back to Requests
      </button>
    </div>
  );

  const overallStatus: PipelineStatus = result?.pipelineStatus ?? "pending";
  const overallCfg = STATUS_CFG[overallStatus];
  const OverallIcon = overallCfg.icon;

  return (
    <div className="w-full space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start gap-3">
        <button onClick={() => navigate(`/provider/requests/${id}`)}
          className="mt-0.5 p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Module 3</span>
            <span className="text-xs text-slate-300">·</span>
            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
              Validation &amp; Preprocessing
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">
            Validation &amp; Preprocessing Pipeline
          </h1>
          {request && (
            <p className="text-sm text-slate-500 mt-1">
              Case{" "}
              <Link to={`/provider/requests/${id}`}
                className="font-mono font-bold text-blue-600 hover:underline">
                {request.caseNumber}
              </Link>
              {" "}· {request.patient?.name ?? "Unknown patient"}
              {" "}· {request.procedures?.[0]?.description ?? ""}
            </p>
          )}
        </div>
      </div>

      {/* ── Status banner ──────────────────────────────────────────────── */}
      <div className={`rounded-2xl border-2 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${overallCfg.border} ${overallCfg.bg}`}>
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl bg-white/80 border ${overallCfg.border}`}>
            <OverallIcon className={`h-7 w-7 ${overallCfg.text} ${overallStatus === "running" ? "animate-spin" : ""}`} />
          </div>
          <div>
            <p className={`text-lg font-bold ${overallCfg.text}`}>
              {overallStatus === "pending"  ? "Pipeline Not Run"  : ""}
              {overallStatus === "running"  ? "Pipeline Running…" : ""}
              {overallStatus === "passed"   ? "All Steps Passed"  : ""}
              {overallStatus === "warning"  ? "Warnings Detected" : ""}
              {overallStatus === "failed"   ? "Validation Failed" : ""}
            </p>
            {result ? (
              <p className={`text-sm mt-0.5 ${overallCfg.text} opacity-80`}>
                Last run: {new Date(result.ranAt).toLocaleString()}
                {" "}· {result.durationMs}ms
              </p>
            ) : (
              <p className={`text-sm mt-0.5 ${overallCfg.text} opacity-80`}>
                Click "Run Pipeline" to start the 4-step validation and preprocessing.
              </p>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3 shrink-0">
          {result && (
            <Link to={`/provider/requests/${id}`}
              className="btn-secondary">
              <ExternalLink className="h-3.5 w-3.5" />
              View Request
            </Link>
          )}
          <button
            onClick={runPipeline}
            disabled={running}
            className="btn-primary"
          >
            {running
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Running…</>
              : result
              ? <><RefreshCw className="h-4 w-4" /> Re-run Pipeline</>
              : <><Play className="h-4 w-4" /> Run Pipeline</>}
          </button>
        </div>
      </div>

      {loadErr && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-rose-50 border border-rose-200">
          <XCircle className="h-4 w-4 text-rose-600 shrink-0" />
          <p className="text-sm text-rose-700">{loadErr}</p>
        </div>
      )}

      {/* ── Pipeline diagram ───────────────────────────────────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {STEP_META.map((step, idx) => {
          const stepKey = step.key as keyof ValidationResult["steps"];
          const status: StepStatus = result ? result.steps[stepKey]?.status ?? "pending" : running ? "running" : "pending";
          const cfg = STATUS_CFG[status];
          const StepIcon = step.icon;
          return (
            <div key={step.key} className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => toggle(step.key)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border-2 transition-all ${cfg.border} ${cfg.bg} hover:opacity-80`}
              >
                <StepIcon className={`h-4 w-4 ${cfg.text}`} />
                <div className="text-left">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Step {step.num}</p>
                  <p className={`text-xs font-semibold ${cfg.text}`}>{step.label}</p>
                </div>
                <StatusBadge status={status} />
              </button>
              {idx < STEP_META.length - 1 && (
                <div className="flex items-center gap-0.5 text-slate-300">
                  <div className="h-0.5 w-4 bg-slate-200 rounded-full" />
                  <div className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Step cards ─────────────────────────────────────────────────── */}
      {STEP_META.map(meta => {
        const stepKey = meta.key as keyof ValidationResult["steps"];
        const stepData = result?.steps[stepKey];
        const status: StepStatus = stepData?.status ?? (running ? "running" : "pending");

        return (
          <StepCard
            key={meta.key}
            meta={meta}
            status={status}
            expanded={expanded[meta.key] ?? false}
            onToggle={() => toggle(meta.key)}
          >
            {!result && !running && (
              <div className="py-6 text-center">
                <p className="text-slate-500 text-sm">
                  Click <span className="font-semibold text-teal-600">Run Pipeline</span> to execute this step.
                </p>
              </div>
            )}
            {running && !result && (
              <div className="flex items-center justify-center py-8 gap-3">
                <Loader2 className="h-5 w-5 text-teal-500 animate-spin" />
                <p className="text-sm text-slate-600 font-medium">Processing…</p>
              </div>
            )}
            {stepData && meta.key === "step1" && (
              <Step1Panel step={result!.steps.step1} />
            )}
            {stepData && meta.key === "step2" && (
              <Step2Panel step={result!.steps.step2} />
            )}
            {stepData && meta.key === "step3" && (
              <Step3Panel step={result!.steps.step3} />
            )}
            {stepData && meta.key === "step4" && (
              <Step4Panel step={result!.steps.step4} />
            )}
          </StepCard>
        );
      })}

      {/* ── Bottom action bar ──────────────────────────────────────────── */}
      {result && (
        <div className="flex items-center justify-between pt-2 border-t border-slate-200">
          <p className="text-xs text-slate-400">
            Pipeline v3.0 · Ran in {result.durationMs}ms · {new Date(result.ranAt).toLocaleString()}
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => navigate(`/provider/requests/${id}`)}
              className="btn-secondary"
            >
              ← Back to Request
            </button>
            <button
              onClick={runPipeline}
              disabled={running}
              className="btn-primary"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Re-run
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
