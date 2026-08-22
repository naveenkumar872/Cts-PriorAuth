import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, CheckCircle, XCircle, Clock, AlertCircle,
  User, Building, Calendar, Eye, Download, FileText, Upload, X, Plus, Trash2, Sparkles, CheckCircle2
} from "lucide-react";
import { api } from "@/lib/api";
import type { AuthorizationRequest, AuthorizationStatus, ClinicalDocument } from "@/types";
import { DocumentPreviewModal, DOC_TYPE_CONFIG } from "@/components/ui/DocumentPreviewModal";

const PRIORITY_CONFIG: Record<string, string> = {
  urgent: "bg-red-100 text-red-700 border border-red-200",
  high:   "bg-orange-100 text-orange-700 border border-orange-200",
  normal: "bg-blue-100 text-blue-700 border border-blue-200",
  low:    "bg-slate-100 text-slate-600 border border-slate-200",
};

export default function ProviderRequestDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [request, setRequest]   = useState<AuthorizationRequest | null>(null);
  const [loading, setLoading]   = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<ClinicalDocument | null>(null);
  const [showReapplyModal, setShowReapplyModal] = useState(false);
  const [resubmitSuccessMsg, setResubmitSuccessMsg] = useState("");

  const loadRequest = () => {
    if (!id) return;
    setLoading(true);
    api.getAuthorization(id)
      .then(d => setRequest(d as AuthorizationRequest))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!id) return;
    api.getAuthorization(id)
      .then(d => setRequest(d as AuthorizationRequest))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="h-8 w-8 rounded-full border-4 border-teal-500 border-t-transparent animate-spin" />
    </div>
  );

  if (notFound || !request) return (
    <div className="text-center py-20 bg-white rounded-xl border border-slate-200 max-w-2xl mx-auto shadow-sm">
      <AlertCircle className="h-12 w-12 text-slate-300 mx-auto mb-4" />
      <h2 className="text-lg font-semibold text-slate-900">Request Not Found</h2>
      <button onClick={() => navigate("/provider/requests")} className="mt-4 text-sm text-teal-600 hover:text-teal-700 font-medium">
        ← Back to Requests
      </button>
    </div>
  );

  // Normalize status for provider view
  const isPending = ["Pending Review", "Under Review", "Nurse Review Required"].includes(request.status);
  const isApproved = request.status === "Approved";
  const isRejected = ["Denied", "Rejected", "Not Approved"].includes(request.status);
  const isMoreInfo = request.status === "More Information Required";

  const statusLabel = isApproved
    ? "Approved"
    : isRejected
    ? "Rejected"
    : isMoreInfo
    ? "More Info Required"
    : "Pending";

  const statusBadgeStyle = isApproved
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : isRejected
    ? "bg-rose-50 text-rose-700 border-rose-200"
    : isMoreInfo
    ? "bg-amber-50 text-amber-700 border-amber-200"
    : "bg-amber-50 text-amber-700 border-amber-200";

  const StatusBadgeIcon = isApproved
    ? CheckCircle
    : isRejected
    ? XCircle
    : isMoreInfo
    ? AlertCircle
    : Clock;

  const reasoning = request.aiRecommendation?.reasoning || request.ruleEvaluation?.reason;
  const missingInfoList = request.aiRecommendation?.missingInfo || request.ruleEvaluation?.missingInformation || [];

  return (
    <div className="space-y-6">
      {previewDoc && (
        <DocumentPreviewModal doc={previewDoc} request={request} onClose={() => setPreviewDoc(null)} />
      )}

      {/* Header */}
      <div className="flex items-start gap-3">
        <button
          onClick={() => navigate("/provider/requests")}
          className="mt-0.5 p-1.5 rounded-lg text-slate-500 hover:text-teal-600 hover:bg-teal-50 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-slate-900 font-mono">{request.caseNumber}</h1>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${statusBadgeStyle}`}>
              <StatusBadgeIcon className="h-3.5 w-3.5" />
              {statusLabel}
            </span>
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${PRIORITY_CONFIG[request.priority] ?? ""}`}>
              {request.priority.charAt(0).toUpperCase() + request.priority.slice(1)} Priority
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Submitted {new Date(request.submittedAt).toLocaleDateString("en-US", {
              weekday: "long", year: "numeric", month: "long", day: "numeric",
            })}
          </p>
        </div>
      </div>

      {/* ── Status Banner & LLM Reasoning ── */}
      {isPending && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-100 text-amber-700 shrink-0">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-900">Request Pending Review</h3>
              <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                The reviewer is currently reviewing your prior authorization claim. No further action is required from you at this time.
              </p>
            </div>
          </div>
        </div>
      )}

      {isApproved && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-sm space-y-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700 shrink-0">
              <CheckCircle className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-emerald-900">Prior Authorization Approved</h3>
              <p className="text-xs text-emerald-800 mt-1">
                Your prior authorization request has been officially approved by the payer clinical operations team.
              </p>
            </div>
          </div>

          {/* LLM Reasoning */}
          {reasoning && (
            <div className="mt-3 pt-3 border-t border-emerald-200/60">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-900 mb-1">
                LLM Determination Reasoning
              </p>
              <p className="text-xs text-emerald-800 leading-relaxed bg-white/60 p-3 rounded-lg border border-emerald-200/50">
                {reasoning}
              </p>
            </div>
          )}
        </div>
      )}

      {isRejected && (
        <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-5 shadow-sm space-y-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-rose-100 text-rose-700 shrink-0">
              <XCircle className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-rose-900">Prior Authorization Rejected</h3>
              <p className="text-xs text-rose-800 mt-1">
                Your prior authorization request was not approved based on clinical policy review.
              </p>
            </div>
          </div>

          {/* LLM Reasoning */}
          {reasoning && (
            <div className="mt-3 pt-3 border-t border-rose-200/60">
              <p className="text-xs font-bold uppercase tracking-wider text-rose-900 mb-1">
                LLM Determination Reasoning
              </p>
              <p className="text-xs text-rose-800 leading-relaxed bg-white/60 p-3 rounded-lg border border-rose-200/50">
                {reasoning}
              </p>
            </div>
          )}
        </div>
      )}

      {resubmitSuccessMsg && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <p className="text-xs font-bold text-emerald-900">{resubmitSuccessMsg}</p>
          </div>
          <button onClick={() => setResubmitSuccessMsg("")} className="text-xs text-emerald-700 hover:text-emerald-900 font-bold">
            Dismiss
          </button>
        </div>
      )}

      {isMoreInfo && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-5 shadow-sm space-y-4 font-sans">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-3 flex-1 min-w-[260px]">
              <div className="p-2 rounded-lg bg-amber-100 text-amber-700 shrink-0 mt-0.5">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-900">Additional Information Required by Reviewer</h3>
                <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                  The reviewer requested additional documentation before a final decision can be made. Upload missing documents below to continue this prior authorization evaluation.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowReapplyModal(true)}
              className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer shrink-0"
            >
              <Upload className="h-4 w-4" />
              Upload Missing Docs &amp; Resubmit
            </button>
          </div>

          {/* LLM Reasoning & Missing Info */}
          {reasoning && (
            <div className="mt-3 pt-3 border-t border-amber-200/60">
              <p className="text-[11px] font-bold uppercase tracking-wider text-amber-900 mb-1">
                Reviewer / Rule Engine Note:
              </p>
              <p className="text-xs text-amber-800 leading-relaxed bg-white/70 p-3 rounded-lg border border-amber-200/50">
                {reasoning}
              </p>
            </div>
          )}

          {missingInfoList.length > 0 && (
            <div className="mt-2 bg-white/70 p-3.5 rounded-xl border border-amber-200/60 space-y-1.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-amber-900">
                Requested Documents / Missing Information:
              </p>
              <ul className="space-y-1 pl-4 list-disc text-xs text-amber-900 font-medium">
                {missingInfoList.map((item, idx) => (
                  <li key={idx}>{item.replace(/_/g, " ")}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ── Input Provided by Provider ── */}
      {/* Patient + Provider Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <User className="h-4 w-4 text-teal-600" />
            <h3 className="text-sm font-semibold text-slate-900">Patient Information</h3>
          </div>
          <div className="space-y-2.5">
            <Row label="Full Name"      value={request.patient?.name ?? ""} bold />
            <Row label="Date of Birth"  value={`${request.patient?.dob ?? ""} (${new Date().getFullYear() - new Date(request.patient?.dob ?? "").getFullYear()} yrs)`} />
            <Row label="Gender"         value={request.patient?.gender ?? ""} />
            <Row label="Member ID"      value={request.patient?.memberId ?? ""} mono />
            <Row label="Group ID"       value={request.patient?.groupId ?? ""} mono />
            <Row label="Insurance Plan" value={`${request.patient?.payer} — ${request.patient?.plan}`} />
            {request.patient?.phone       && <Row label="Phone"        value={request.patient.phone} />}
            {request.patient?.primaryCare && <Row label="Primary Care" value={request.patient.primaryCare} />}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Building className="h-4 w-4 text-teal-600" />
            <h3 className="text-sm font-semibold text-slate-900">Requesting Provider</h3>
          </div>
          <div className="space-y-2.5">
            <Row label="Physician"    value={request.provider?.name ?? ""} bold />
            <Row label="Specialty"    value={request.provider?.specialty ?? ""} />
            <Row label="Organization" value={request.provider?.organization ?? ""} />
            <Row label="NPI"          value={request.provider?.npi ?? ""} mono />
            <Row label="Tax ID"       value={request.provider?.taxId ?? ""} mono />
            <Row label="Phone"        value={request.provider?.phone ?? ""} />
          </div>
        </div>
      </div>

      {/* Requested Procedures */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-teal-600" />
          <h3 className="text-sm font-semibold text-slate-900">Requested Procedures</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                {["CPT Code", "Description", "Modifier", "Qty", "Service Date", "Place of Service"].map(h => (
                  <th key={h} className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(request.procedures ?? []).map((p, i) => (
                <tr key={i}>
                  <td className="px-5 py-3 font-mono text-xs font-bold text-teal-600">{p.code}</td>
                  <td className="px-5 py-3 text-slate-800">{p.description}</td>
                  <td className="px-5 py-3 text-slate-600">{p.modifier || "—"}</td>
                  <td className="px-5 py-3 text-slate-600">{p.quantity}</td>
                  <td className="px-5 py-3 text-slate-600">{p.serviceDate ? new Date(p.serviceDate).toLocaleDateString() : "—"}</td>
                  <td className="px-5 py-3 text-slate-600 text-xs">{p.placeOfService}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Diagnoses */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Diagnoses</h3>
        <div className="space-y-2">
          {(request.diagnoses ?? []).map((d, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
              <span className="font-mono text-xs font-bold text-teal-600 whitespace-nowrap">{d.code}</span>
              <span className="text-xs text-slate-800 flex-1">{d.description}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded font-medium shrink-0 ${d.type === "primary" ? "bg-teal-50 text-teal-700 border border-teal-200" : "bg-slate-100 text-slate-600 border border-slate-200"}`}>
                {d.type}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Clinical Notes */}
      {request.clinicalNotes && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Clinical Notes</h3>
          <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-100 whitespace-pre-wrap">
            {request.clinicalNotes}
          </p>
        </div>
      )}

      {/* Supporting Documents */}
      {(request.documents?.length ?? 0) > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">
            Supporting Documents ({request.documents.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {request.documents.map(doc => {
              const docCfg = DOC_TYPE_CONFIG[doc.type] ?? DOC_TYPE_CONFIG.other;
              const DocIcon = docCfg.icon;
              return (
                <div key={doc.id} className="flex items-start gap-3 p-4 rounded-lg border border-slate-200 hover:border-teal-300 hover:bg-teal-50/10 transition-all">
                  <div className={`p-2.5 rounded-lg ${docCfg.bg} ${docCfg.border} border shrink-0 mt-0.5`}>
                    <DocIcon className={`h-4 w-4 ${docCfg.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-900 truncate" title={doc.name}>{doc.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${docCfg.bg} ${docCfg.color} ${docCfg.border}`}>{docCfg.label}</span>
                      {doc.size && <span className="text-[11px] text-slate-400">· {doc.size}</span>}
                    </div>
                    {doc.uploadedBy && <p className="text-[11px] text-slate-400 mt-1">Uploaded by {doc.uploadedBy}</p>}
                    <div className="flex items-center gap-2 mt-3">
                      <button onClick={() => setPreviewDoc(doc)}
                        className="btn-primary px-3 py-1 text-xs shadow-none">
                        <Eye className="h-3.5 w-3.5" /> Preview
                      </button>
                      <button
                        onClick={() => { if (doc.url) { const a = document.createElement("a"); a.href = doc.url; a.download = doc.name; a.click(); } }}
                        className="btn-secondary px-3 py-1 text-xs border-slate-200 shadow-none">
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

      {/* Modal for uploading missing documents */}
      {showReapplyModal && (
        <ResubmitMissingDocsModal
          request={request}
          onClose={() => setShowReapplyModal(false)}
          onSuccess={() => {
            setShowReapplyModal(false);
            setResubmitSuccessMsg("Missing documentation attached! Request continued and returned to review queue.");
            loadRequest();
          }}
        />
      )}
    </div>
  );
}

function Row({ label, value, bold, mono }: { label: string; value: string; bold?: boolean; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className="text-slate-500 shrink-0">{label}</span>
      <span className={`text-right ${bold ? "font-semibold text-slate-900" : "text-slate-700"} ${mono ? "font-mono text-xs" : ""}`}>
        {value}
      </span>
    </div>
  );
}

interface ResubmitMissingDocsModalProps {
  request: AuthorizationRequest;
  onClose: () => void;
  onSuccess: () => void;
}

function ResubmitMissingDocsModal({ request, onClose, onSuccess }: ResubmitMissingDocsModalProps) {
  const [newFiles, setNewFiles] = useState<Array<{ name: string; type: string; size: string; url: string }>>([]);
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const missingInfoList = request.aiRecommendation?.missingInfo || request.ruleEvaluation?.missingInformation || [];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    const added = files.map(f => ({
      name: f.name,
      type: f.name.toLowerCase().includes("pt") ? "pt_notes" : f.name.toLowerCase().includes("ortho") || f.name.toLowerCase().includes("specialist") ? "specialist_consultation" : "clinical_notes",
      size: `${(f.size / (1024 * 1024)).toFixed(1)} MB`,
      url: URL.createObjectURL(f),
    }));
    setNewFiles(prev => [...prev, ...added]);
  };

  const handleRemoveFile = (index: number) => {
    setNewFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (newFiles.length === 0 && !additionalNotes.trim()) {
      setErrorMsg("Please upload at least one missing document or provide additional clinical notes.");
      return;
    }
    setSubmitting(true);
    setErrorMsg("");

    try {
      await api.reapplyAuthorization(request.caseNumber || request.id, {
        newDocuments: newFiles,
        additionalNotes,
      });
      onSuccess();
    } catch (err: any) {
      console.error("Re-apply submission failed:", err);
      setErrorMsg(err?.message || "Failed to update authorization request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 font-sans overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Upload className="h-5 w-5 text-amber-100" />
            <div>
              <h3 className="text-base font-bold">Resubmit Missing Documentation</h3>
              <p className="text-xs text-amber-100 font-mono">Case {request.caseNumber} — {request.patient?.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-amber-100 hover:text-white hover:bg-white/10 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          
          {/* Missing Criteria Banner */}
          {missingInfoList.length > 0 && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs space-y-1.5">
              <span className="font-bold text-amber-900 uppercase tracking-wider block">
                Payer Requested Missing Information:
              </span>
              <ul className="list-disc list-inside text-amber-800 font-medium space-y-0.5">
                {missingInfoList.map((item: string, idx: number) => (
                  <li key={idx}>{item.replace(/_/g, " ")}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Existing Uploaded Documents */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
              Previously Uploaded Documents ({request.documents?.length || 0}):
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(request.documents || []).map((doc) => (
                <div key={doc.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
                  <div className="truncate">
                    <p className="font-bold text-slate-800 truncate" title={doc.name}>{doc.name}</p>
                    <span className="text-[10px] text-slate-500 font-mono">{doc.type} · {doc.size || "1.2 MB"}</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 shrink-0">Attached</span>
                </div>
              ))}
            </div>
          </div>

          {/* New Document Upload Zone */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Upload New Missing Documents:
            </label>
            
            <label className="flex flex-col items-center justify-center p-5 rounded-xl border-2 border-dashed border-teal-300 bg-teal-50/40 hover:bg-teal-50 hover:border-teal-400 cursor-pointer transition-all text-center">
              <Upload className="h-6 w-6 text-teal-600 mb-2" />
              <span className="text-xs font-bold text-teal-900">Click or drag missing PDF/DOCX clinical files here</span>
              <span className="text-[11px] text-slate-500 mt-0.5">Supports Orthopedic Notes, PT Logs, Lab Reports, Radiology</span>
              <input type="file" multiple onChange={handleFileSelect} className="hidden" accept=".pdf,.docx,.doc,.png,.jpg,.jpeg" />
            </label>

            {/* Added New Files List */}
            {newFiles.length > 0 && (
              <div className="space-y-2 pt-2">
                <p className="text-[11px] font-bold text-slate-600 uppercase">New Documents to Attach ({newFiles.length}):</p>
                {newFiles.map((file, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-teal-50 border border-teal-200 text-xs flex items-center justify-between gap-3">
                    <div className="flex-1 truncate">
                      <p className="font-bold text-teal-950 truncate">{file.name}</p>
                      <span className="text-[10px] text-teal-700">{file.size}</span>
                    </div>
                    
                    <select
                      value={file.type}
                      onChange={(e) => {
                        const updated = [...newFiles];
                        updated[idx].type = e.target.value;
                        setNewFiles(updated);
                      }}
                      className="px-2.5 py-1 rounded-lg border border-teal-300 bg-white text-[11px] font-bold text-teal-900 focus:outline-none"
                    >
                      <option value="specialist_consultation">Specialist Consultation Note</option>
                      <option value="pt_notes">Physical Therapy Progress Log</option>
                      <option value="radiology">Radiology / MRI Report</option>
                      <option value="clinical_notes">Clinical Notes</option>
                      <option value="lab_results">Lab Results</option>
                    </select>

                    <button onClick={() => handleRemoveFile(idx)} className="p-1 rounded text-rose-500 hover:bg-rose-100 transition-colors">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Additional Notes */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Additional Provider Resubmission Notes (Optional):
            </label>
            <textarea
              rows={3}
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              placeholder="Provide any additional clinical explanations or notes regarding the missing documentation..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
            />
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
              {errorMsg}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          <button onClick={onClose} disabled={submitting} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {submitting ? (
              <>
                <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                <span>Running Pipeline &amp; Updating...</span>
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                <span>Submit Missing Documents &amp; Resubmit</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
