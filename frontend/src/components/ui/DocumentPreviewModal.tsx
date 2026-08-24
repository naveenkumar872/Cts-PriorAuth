/**
 * Shared DocumentPreviewModal + DOC_TYPE_CONFIG
 * Used by both provider/RequestDetails and reviewer/RequestDetails.
 */
import { useState } from "react";
import {
  X, ZoomIn, ZoomOut, RotateCw, Printer,
  FileText, FlaskConical, Microscope, Mail, FileSpreadsheet,
} from "lucide-react";
import type { ClinicalDocument, AuthorizationRequest } from "@/types";

// ── Document type config ──────────────────────────────────────────────────────

export const DOC_TYPE_CONFIG: Record<string, {
  icon: React.ComponentType<{ className?: string }>;
  label: string; color: string; bg: string; border: string;
}> = {
  imaging:        { icon: Microscope,      label: "Imaging Report",    color: "text-teal-700",    bg: "bg-teal-50",    border: "border-teal-200" },
  lab_result:     { icon: FlaskConical,    label: "Lab / Pathology",   color: "text-purple-700",  bg: "bg-purple-50",  border: "border-purple-200" },
  clinical_note:  { icon: FileText,        label: "Clinical Note",     color: "text-slate-700",   bg: "bg-slate-50",   border: "border-slate-200" },
  referral:       { icon: Mail,            label: "Referral Letter",   color: "text-amber-700",   bg: "bg-amber-50",   border: "border-amber-200" },
  prescription:   { icon: FileSpreadsheet, label: "Prescription",      color: "text-rose-700",    bg: "bg-rose-50",    border: "border-rose-200" },
  medical_history:{ icon: FileText,        label: "Medical History",   color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" },
  prior_auth:     { icon: FileText,        label: "Prior Auth",        color: "text-teal-700",    bg: "bg-teal-50",    border: "border-teal-200" },
  insurance_card: { icon: FileText,        label: "Insurance Card",    color: "text-blue-700",    bg: "bg-blue-50",    border: "border-blue-200" },
  other:          { icon: FileText,        label: "Document",          color: "text-slate-700",   bg: "bg-slate-50",   border: "border-slate-200" },
};

// ── Simulated document preview ────────────────────────────────────────────────

function getPreviewContent(doc: ClinicalDocument, request: AuthorizationRequest) {
  const patientName  = request.patient?.name ?? "Patient";
  const patientDob   = request.patient?.dob  ?? "N/A";
  const patientId    = request.patient?.memberId ?? "N/A";
  const providerName = request.provider?.name ?? "Provider";
  const providerOrg  = request.provider?.organization ?? "";
  const uploadDate   = doc.uploadedAt
    ? new Date(doc.uploadedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : "N/A";
  const primaryDiag = request.diagnoses?.[0];
  const procedure   = request.procedures?.[0];

  switch (doc.type) {
    case "imaging":
      return {
        title: doc.name.replace(".pdf", ""),
        sections: [
          { heading: "Patient Information", rows: [["Name", patientName], ["DOB", patientDob], ["Member ID", patientId], ["Exam Date", uploadDate]] },
          { heading: "Referring Physician", rows: [["Name", providerName], ["Organization", providerOrg], ["NPI", request.provider?.npi ?? "N/A"]] },
          { heading: "Examination", rows: [
            ["Procedure", procedure?.description ?? "Imaging Procedure"],
            ["CPT Code", procedure?.code ?? "N/A"],
            ["Clinical Indication", primaryDiag?.description ?? "See clinical notes"],
            ["ICD-10 Code", primaryDiag?.code ?? "N/A"],
          ]},
          { heading: "Imaging Findings", body:
            `Examination demonstrates findings consistent with the clinical indication. Structural changes observed warrant clinical correlation.\n\nNo acute abnormality identified in the primary region of interest. Visualized structures appear within normal limits for patient age. Areas of signal/density abnormality are consistent with the provided clinical history.\n\nContrast enhancement pattern (where applicable) is noted in the affected anatomical region. Surrounding structures appear intact.`
          },
          { heading: "Impression", body:
            `1. Findings consistent with ${primaryDiag?.description ?? "the documented clinical indication"}.\n2. Clinical correlation with patient symptoms recommended.\n3. Follow-up imaging may be warranted based on clinical progression.\n4. No acute or emergent findings identified on this examination.`
          },
          { heading: "Radiologist Attestation", rows: [["Interpreting Physician", "Board-Certified Radiologist, MD"], ["Facility", providerOrg || "ACR-Accredited Imaging Center"], ["Report Date", uploadDate], ["Report Status", "FINAL"]] },
        ],
      };

    case "lab_result":
      return {
        title: doc.name.replace(".pdf", ""),
        sections: [
          { heading: "Specimen Information", rows: [["Patient", patientName], ["DOB", patientDob], ["Member ID", patientId], ["Collection Date", uploadDate], ["Ordering Physician", providerName]] },
          { heading: "Test Results", table: {
            headers: ["Test", "Result", "Reference Range", "Flag"],
            rows: [
              ["Complete Blood Count (CBC)", "Within normal limits", "See individual values", "—"],
              ["Hemoglobin", "13.8 g/dL", "13.5–17.5 g/dL", "—"],
              ["Hematocrit", "41.2%", "41–53%", "—"],
              ["WBC Count", "7.2 × 10³/µL", "4.5–11.0 × 10³/µL", "—"],
              ["Platelets", "225 × 10³/µL", "150–400 × 10³/µL", "—"],
              ["Creatinine", "1.1 mg/dL", "0.7–1.3 mg/dL", "—"],
              ["eGFR", "72 mL/min/1.73m²", "> 60 mL/min", "—"],
              ["Relevant Marker", "Elevated", "See reference", "H"],
            ],
          }},
          { heading: "Clinical Interpretation", body:
            `Results reviewed in context of clinical presentation. Findings support the documented medical indication for the requested prior authorization for ${procedure?.description ?? "the requested procedure"}.\n\nAbnormal values flagged (H/L) should be correlated with clinical findings and patient treatment history. No critical values identified.`
          },
          { heading: "Authorized By", rows: [["Pathologist", "Board-Certified Pathologist, MD"], ["Lab Facility", "CLIA-Certified Reference Laboratory"], ["Report Status", "FINAL"], ["Report Date", uploadDate]] },
        ],
      };

    case "clinical_note":
      return {
        title: doc.name.replace(".pdf", ""),
        sections: [
          { heading: "Visit Information", rows: [
            ["Patient", patientName], ["DOB", patientDob],
            ["Visit Date", uploadDate], ["Provider", providerName], ["Facility", providerOrg],
          ]},
          { heading: "Chief Complaint", body: primaryDiag?.description ?? "Patient presents for clinical evaluation per documented indication." },
          { heading: "History of Present Illness", body:
            `${patientName} presents with ${primaryDiag?.description?.toLowerCase() ?? "the documented condition"} (ICD-10: ${primaryDiag?.code ?? "N/A"}). The patient reports progressive onset of symptoms with course unresponsive to initial conservative management.\n\nPrior treatment modalities including medication trials and conservative care have been attempted with limited therapeutic response. Current symptom burden significantly impacts functional status and quality of life. Clinical presentation warrants escalation of care as documented.`
          },
          { heading: "Physical Examination", body:
            `Vital signs: Stable. Patient is alert and oriented ×3, in no acute distress.\n\nRelevant system examination reveals findings consistent with the documented diagnosis. Functional assessment demonstrates measurable limitations consistent with the clinical indication for the requested procedure.\n\nPain score: 7/10 at rest, 9/10 with exertion. Range of motion limited. Neurovascular status intact distally. No signs of acute infection or systemic illness.`
          },
          { heading: "Assessment & Plan", body:
            `Assessment: ${primaryDiag?.description ?? "As documented"}. ICD-10: ${primaryDiag?.code ?? "N/A"}.\n\nPlan: Proceed with requested ${procedure?.description ?? "procedure"} (CPT ${procedure?.code ?? "N/A"}). Conservative management has been exhausted as documented. Medical necessity criteria met per applicable clinical guidelines and insurance plan policy.`
          },
          { heading: "Physician Attestation", rows: [["Signature", providerName], ["Date", uploadDate], ["NPI", request.provider?.npi ?? "N/A"], ["License", request.provider?.taxId ?? "On file"]] },
        ],
      };

    case "referral":
      return {
        title: doc.name.replace(".pdf", ""),
        sections: [
          { heading: "Referral Information", rows: [
            ["Date", uploadDate], ["Referring Provider", providerName],
            ["Organization", providerOrg], ["Patient", patientName], ["Member ID", patientId],
          ]},
          { heading: "Reason for Referral", body:
            `Patient ${patientName} is referred for evaluation and management of ${primaryDiag?.description?.toLowerCase() ?? "the documented condition"} (ICD-10: ${primaryDiag?.code ?? "N/A"}).\n\nThe patient has been under my care and treated conservatively. Given persistent symptoms and functional limitations, specialist evaluation is warranted for further assessment and treatment planning, specifically for ${procedure?.description ?? "the requested service"}.`
          },
          { heading: "Requested Service", rows: [
            ["Procedure", procedure?.description ?? "Specialist Evaluation"],
            ["CPT Code", procedure?.code ?? "N/A"],
            ["Urgency", request.priority.charAt(0).toUpperCase() + request.priority.slice(1)],
            ["Insurance", `${request.patient?.payer} — ${request.patient?.plan}`],
          ]},
          { heading: "Clinical Summary", body: request.clinicalNotes ?? "See attached clinical documentation for complete history and physical examination findings." },
          { heading: "Referring Provider", rows: [["Provider", providerName], ["NPI", request.provider?.npi ?? "N/A"], ["Organization", providerOrg], ["Date", uploadDate]] },
        ],
      };

    default:
      return {
        title: doc.name.replace(".pdf", ""),
        sections: [
          { heading: "Document Information", rows: [
            ["Document", doc.name],
            ["Type", (DOC_TYPE_CONFIG[doc.type] ?? DOC_TYPE_CONFIG.other).label],
            ["File Size", doc.size ?? "N/A"],
            ["Uploaded By", doc.uploadedBy ?? providerName],
            ["Upload Date", uploadDate],
            ["Patient", patientName],
            ["Case Number", request.caseNumber],
          ]},
          { heading: "Content Summary", body: `This document has been submitted as supporting evidence for prior authorization request ${request.caseNumber} for patient ${patientName}.\n\nRelated clinical indication: ${primaryDiag?.description ?? "As documented"}.\n\nPlease refer to the original file for complete information.` },
        ],
      };
  }
}

// ── Modal Component ───────────────────────────────────────────────────────────

export function DocumentPreviewModal({
  doc, request, onClose,
}: {
  doc: ClinicalDocument;
  request: AuthorizationRequest;
  onClose: () => void;
}) {
  const [zoom, setZoom] = useState(100);
  const cfg     = DOC_TYPE_CONFIG[doc.type] ?? DOC_TYPE_CONFIG.other;
  const Icon    = cfg.icon;
  const content = getPreviewContent(doc, request);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col w-full max-w-3xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`p-2 rounded-lg ${cfg.bg} ${cfg.border} border`}>
              <Icon className={`h-5 w-5 ${cfg.color}`} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">{doc.name}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                <span className={`font-semibold ${cfg.color}`}>{cfg.label}</span>
                {doc.size ? ` · ${doc.size}` : ""}
                {doc.uploadedBy ? ` · ${doc.uploadedBy}` : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0 ml-3">
            <button onClick={() => setZoom(z => Math.max(70, z - 10))} title="Zoom out"
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-200 transition-colors">
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="text-xs font-mono text-slate-600 w-10 text-center">{zoom}%</span>
            <button onClick={() => setZoom(z => Math.min(150, z + 10))} title="Zoom in"
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-200 transition-colors">
              <ZoomIn className="h-4 w-4" />
            </button>
            <button onClick={() => setZoom(100)} title="Reset zoom"
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-200 transition-colors">
              <RotateCw className="h-4 w-4" />
            </button>
            <button onClick={onClose} title="Close"
              className="p-2 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Document body */}
        <div className="flex-1 overflow-y-auto bg-slate-100 p-6">
          <div
            className="bg-white rounded-xl shadow-md mx-auto border border-slate-200 overflow-hidden transition-all duration-200"
            style={{ maxWidth: `${zoom}%`, minWidth: "400px" }}
          >
            {/* Document title bar */}
            <div className={`px-8 py-6 border-b-2 ${cfg.border} ${cfg.bg}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className={`inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest ${cfg.color} mb-2`}>
                    <Icon className="h-3 w-3" />{cfg.label}
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">{content.title}</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Case: <span className="font-mono font-semibold text-teal-600">{request.caseNumber}</span>
                    {" · "}Patient: <span className="font-medium text-slate-700">{request.patient?.name}</span>
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-bold text-teal-700 bg-white px-3 py-1.5 rounded-lg border border-teal-200 shadow-sm">
                    CONFIDENTIAL
                  </span>
                  <p className="text-[10px] text-slate-400 mt-1.5">PHI — Handle per HIPAA</p>
                </div>
              </div>
            </div>

            {/* Sections */}
            <div className="px-8 py-6 space-y-7">
              {content.sections.map((section, si) => (
                <div key={si}>
                  <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3 pb-1.5 border-b border-slate-100">
                    {section.heading}
                  </h3>

                  {/* Key-value rows */}
                  {'rows' in section && section.rows && (
                    <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                      {section.rows.map(([label, value], ri) => (
                        <div key={ri}>
                          <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wide">{label}</p>
                          <p className="text-sm text-slate-800 font-semibold mt-0.5">{value}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Body text */}
                  {'body' in section && section.body && (
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50/60 rounded-xl p-4 border border-slate-100">
                      {section.body}
                    </p>
                  )}

                  {/* Table */}
                  {'table' in section && section.table && (
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-slate-100 border-b border-slate-200">
                            {section.table.headers.map(h => (
                              <th key={h} className="px-4 py-2.5 text-left font-semibold text-slate-600 uppercase tracking-wide">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {section.table.rows.map((row, ri) => (
                            <tr key={ri} className={row[3] && row[3] !== "—" ? "bg-rose-50/40" : "hover:bg-slate-50"}>
                              {row.map((cell, ci) => (
                                <td key={ci} className={`px-4 py-2.5 ${ci === 3 && cell !== "—" ? "font-bold text-rose-600" : "text-slate-700"}`}>
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}

              {/* Document footer */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span>PA Request: {request.caseNumber}</span>
                <span>CareAuth Platform · Confidential Medical Record</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 bg-slate-50 shrink-0">
          <p className="text-xs text-slate-500">
            <span className="text-amber-600 font-semibold">⚠ Simulated preview</span>
            {" "}— actual file is stored securely. Contact your administrator for direct file access.
          </p>
          <button onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold transition-colors">
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
}
