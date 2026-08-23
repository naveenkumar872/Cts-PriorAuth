import { useState, useRef, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Check, ChevronRight, User, Stethoscope, ClipboardList,
  FileText, Eye, Plus, Trash2, AlertCircle, CheckCircle, CheckCircle2, XCircle, AlertTriangle, Loader2, Sparkles, ShieldCheck,
  Upload, FileUp, Image as ImageIcon, FileSpreadsheet, X, ExternalLink, Info,
  ChevronDown, Search,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { PREDEFINED_POLICIES, isValidPolicyId } from "@/lib/predefined-policies";

const STEPS = [
  { id: 1, label: "Patient",     icon: User },
  { id: 2, label: "Clinical",    icon: ClipboardList },
  { id: 3, label: "Procedure",   icon: Stethoscope },
  { id: 4, label: "Documents",   icon: FileText },
  { id: 5, label: "Review",      icon: Eye },
];

// ─── Constants ───────────────────────────────────────────────────────────────
const SERVICE_TYPES = [
  "Diagnostic Imaging", "Laboratory / Pathology", "Physical Therapy",
  "Occupational Therapy", "Surgery / Procedure", "Specialist Consultation",
  "Durable Medical Equipment", "Home Health Services", "Mental Health",
  "Infusion / Injection Therapy", "Radiation Therapy", "Other",
];

const CODING_SYSTEMS = ["CPT", "HCPCS", "ICD-10-PCS", "NDC", "Other"];

const POLICY_TIERS = [
  "Bronze", "Silver", "Gold", "Platinum", "HMO", "PPO", "EPO", "POS", "HDHP",
];

const DOC_CATEGORIES = [
  { value: "clinical_note",        label: "Clinical Notes" },
  { value: "lab_result",           label: "Lab Reports" },
  { value: "imaging",              label: "Test / Scan Reports" },
  { value: "previous_treatment",   label: "Previous Treatment Records" },
  { value: "prescription",         label: "Prescription / Treatment Plan" },
  { value: "referral",             label: "Referral Documents" },
  { value: "other",                label: "Other Supporting Document" },
];

// ─── Types ────────────────────────────────────────────────────────────────────
type FormDiagnosis = {
  code: string; description: string; type: "primary" | "secondary";
};

type ClinicalMeasurement = {
  id: string; name: string; value: string; unit: string;
};

type TestResult = {
  id: string; name: string; date: string; finding: string;
};

type PreviousTreatment = {
  id: string; name: string; duration: string; outcome: string;
};

export interface FormDoc {
  id: string; name: string; type: string; size: string;
  file?: File; previewUrl?: string; fileType?: string; uploadedAt: string;
}

interface FormData {
  // Step 1 — Patient
  patient: {
    patientId: string; name: string; dob: string; gender: string;
    memberId: string; policyId: string; policyTier: string;
  };
  // Step 2 — Treatment
  treatment: {
    serviceType: string; serviceName: string;
    serviceCode: string; codingSystem: string;
    quantity: string; frequency: string; duration: string;
  };
  // Step 3 — Clinical
  diagnoses: FormDiagnosis[];
  clinicalIndication: string;
  symptoms: string;
  previousTreatments: PreviousTreatment[];
  measurements: ClinicalMeasurement[];
  testResults: TestResult[];
  // Step 4 — Documents
  documents: FormDoc[];
  clinicalJustification: string;
  // Meta
  priority: "urgent" | "high" | "normal" | "low";
}

const uid = () => Math.random().toString(36).slice(2, 9);

const emptyForm: FormData = {
  patient: { patientId: "", name: "", dob: "", gender: "Male", memberId: "", policyId: "", policyTier: "" },
  treatment: { serviceType: "", serviceName: "", serviceCode: "", codingSystem: "CPT", quantity: "1", frequency: "", duration: "" },
  diagnoses: [{ code: "", description: "", type: "primary" }],
  clinicalIndication: "", symptoms: "",
  previousTreatments: [],
  measurements: [],
  testResults: [],
  documents: [],
  clinicalJustification: "",
  priority: "normal",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  return bytes < k * 1024 ? `${Math.round(bytes / k)} KB` : `${(bytes / (k * k)).toFixed(2)} MB`;
}

function detectDocCategory(filename: string): string {
  const l = filename.toLowerCase();
  if (l.includes("mri") || l.includes("ct") || l.includes("xray") || l.includes("scan") || l.includes("imaging") || l.includes("ultrasound")) return "imaging";
  if (l.includes("lab") || l.includes("blood") || l.includes("panel") || l.includes("pathology") || l.includes("biopsy")) return "lab_result";
  if (l.includes("referral") || l.includes("consult")) return "referral";
  if (l.includes("rx") || l.includes("prescript") || l.includes("medication")) return "prescription";
  if (l.includes("history") || l.includes("treatment") || l.includes("therapy")) return "previous_treatment";
  return "clinical_note";
}

function getFileIcon(type?: string, name?: string) {
  const ext = name?.split(".").pop()?.toLowerCase();
  if (type?.startsWith("image/") || ext === "png" || ext === "jpg" || ext === "jpeg") return <ImageIcon className="h-5 w-5 text-teal-600" />;
  if (ext === "csv" || ext === "xlsx" || ext === "xls") return <FileSpreadsheet className="h-5 w-5 text-emerald-600" />;
  return <FileText className="h-5 w-5 text-teal-600" />;
}

const inputClass = "w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 text-sm";
const labelClass = "block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5";

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({ title, onAdd, addLabel }: { title: string; onAdd?: () => void; addLabel?: string }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">{title}</h3>
      {onAdd && (
        <button type="button" onClick={onAdd}
          className="flex items-center gap-1.5 text-xs font-semibold text-teal-600 hover:text-teal-700 transition-colors">
          <Plus className="h-3.5 w-3.5" />{addLabel ?? "Add"}
        </button>
      )}
    </div>
  );
}

// ─── Custom Policy ID Select / Combobox Component ─────────────────────────────
function PolicyIdSelect({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (val: string) => void;
  error?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const isValid = isValidPolicyId(value);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return PREDEFINED_POLICIES;
    const q = search.toLowerCase();
    return PREDEFINED_POLICIES.filter(
      p =>
        p.id.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.codes.some(c => c.toLowerCase().includes(q))
    );
  }, [search]);

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center justify-between mb-1">
        <label className={labelClass}>Policy ID *</label>
        {value.trim() && isValid && (
          <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
            <CheckCircle className="h-3 w-3" /> Valid Ruleset Policy
          </span>
        )}
      </div>

      <div className="relative">
        <input
          type="text"
          className={`${inputClass} pr-10 ${
            error || (value.trim() && !isValid)
              ? "border-rose-400 focus:ring-rose-500/20 focus:border-rose-500"
              : value.trim() && isValid
              ? "border-emerald-400 focus:ring-emerald-500/20 focus:border-emerald-500"
              : ""
          }`}
          placeholder="Search or select Policy ID (e.g. ACU-75891551, MRI-12493019, POL-001)"
          value={value}
          onFocus={() => setIsOpen(true)}
          onChange={e => {
            const val = e.target.value;
            onChange(val);
            setSearch(val);
            setIsOpen(true);
          }}
        />
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange("");
                setSearch("");
              }}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsOpen(o => !o)}
            className="p-1 text-slate-400 hover:text-slate-600"
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 max-h-72 overflow-y-auto rounded-xl bg-white border border-slate-200 shadow-2xl divide-y divide-slate-100 font-sans text-xs">
          <div className="p-2 bg-slate-50 sticky top-0 z-10 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-1.5 px-2 text-slate-600 font-semibold text-[11px]">
              <Search className="h-3.5 w-3.5 text-teal-600" />
              <span>Select Predefined Policy ({filtered.length} available)</span>
            </div>
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="text-[10px] text-teal-600 hover:underline font-bold px-1"
              >
                Clear Search
              </button>
            )}
          </div>

          <div className="py-1">
            {filtered.length === 0 ? (
              <div className="p-4 text-center text-slate-500">
                <p className="font-semibold text-slate-700">No policy matched "{search}"</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Please check the policy ID code or name.</p>
              </div>
            ) : (
              filtered.map(p => {
                const isSelected = p.id.toUpperCase() === value.trim().toUpperCase();
                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      onChange(p.id);
                      setIsOpen(false);
                    }}
                    className={`px-3.5 py-2.5 cursor-pointer flex items-center justify-between transition-colors ${
                      isSelected
                        ? "bg-teal-50 text-teal-900 font-semibold"
                        : "hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-teal-700 bg-teal-50/80 px-2 py-0.5 rounded border border-teal-200/60 text-[11px]">
                          {p.id}
                        </span>
                        <span className="font-semibold text-slate-900 truncate text-xs">{p.name}</span>
                      </div>
                      {p.codes.length > 0 && (
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">
                          CPT: {p.codes.slice(0, 5).join(", ")}
                          {p.codes.length > 5 ? ` +${p.codes.length - 5} more` : ""}
                        </p>
                      )}
                    </div>
                    {isSelected && <Check className="h-4 w-4 text-teal-600 shrink-0 ml-2" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="mt-1.5 p-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-1.5 font-medium">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-rose-500" />
          <span>{error}</span>
        </div>
      )}
      {value.trim() && !isValid && !error && (
        <div className="mt-1.5 p-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-1.5 font-medium">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-rose-500" />
          <span>Invalid Policy ID. This policy ID does not match any predefined ruleset policy. Please select or enter a valid policy ID before proceeding.</span>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function CreateAuthorization() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep]           = useState(1);
  const [form, setForm]           = useState<FormData>(emptyForm);
  const [errors, setErrors]       = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [caseNumber, setCaseNumber] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<FormDoc | null>(null);

  // ── Validation Modal State ──
  const [validationModalOpen, setValidationModalOpen] = useState(false);
  const [validationPhase, setValidationPhase] = useState<"processing" | "failed" | "passed">("processing");
  const [validationSteps, setValidationSteps] = useState<Array<{
    id: "verify_member" | "preprocess_data" | "rule_pipeline";
    title: string;
    sublabel: string;
    status: "idle" | "running" | "passed" | "failed";
    errorDetail?: string;
  }>>([
    {
      id: "verify_member",
      title: "1. Database & Member ID Verification",
      sublabel: "Checking patient Member ID in database...",
      status: "idle",
    },
    {
      id: "preprocess_data",
      title: "2. Input Preprocessing & Attachment Parsing",
      sublabel: "Formatting PA request payload & uploading clinical files...",
      status: "idle",
    },
    {
      id: "rule_pipeline",
      title: "3. Automated Rules Engine Evaluation",
      sublabel: "Running Module 3 clinical evaluation and policy mapping...",
      status: "idle",
    },
  ]);
  const [createdAuthId, setCreatedAuthId] = useState<string>("");

  const [memberVerifyStatus, setMemberVerifyStatus] = useState<{
    checking: boolean;
    checked: boolean;
    exists: boolean;
    patient?: any;
    message?: string;
  }>({ checking: false, checked: false, exists: false });

  const handleMemberIdBlur = async () => {
    const mid = form.patient.memberId.trim();
    if (!mid) {
      setMemberVerifyStatus({ checking: false, checked: false, exists: false });
      return;
    }
    setMemberVerifyStatus(p => ({ ...p, checking: true }));
    try {
      const res = await api.verifyMemberId(mid);
      setMemberVerifyStatus({
        checking: false,
        checked: true,
        exists: res.exists,
        patient: res.patient,
        message: res.message,
      });
    } catch {
      setMemberVerifyStatus({ checking: false, checked: true, exists: false, message: "Member verification failed." });
    }
  };

  // ── Patient helpers ──
  const setPatient = (f: keyof FormData["patient"], v: string) =>
    setForm(p => ({ ...p, patient: { ...p.patient, [f]: v } }));

  // ── Treatment helpers ──
  const setTreatment = (f: keyof FormData["treatment"], v: string) =>
    setForm(p => ({ ...p, treatment: { ...p.treatment, [f]: v } }));

  // ── Diagnosis helpers ──
  const setDiagnosis = (i: number, f: keyof FormDiagnosis, v: string) =>
    setForm(p => { const d = [...p.diagnoses]; d[i] = { ...d[i], [f]: v as any }; return { ...p, diagnoses: d }; });
  const addDiagnosis = () =>
    setForm(p => ({ ...p, diagnoses: [...p.diagnoses, { code: "", description: "", type: "secondary" }] }));
  const removeDiagnosis = (i: number) =>
    setForm(p => ({ ...p, diagnoses: p.diagnoses.filter((_, idx) => idx !== i) }));

  // ── Measurement helpers ──
  const addMeasurement = () =>
    setForm(p => ({ ...p, measurements: [...p.measurements, { id: uid(), name: "", value: "", unit: "" }] }));
  const setMeasurement = (id: string, f: keyof ClinicalMeasurement, v: string) =>
    setForm(p => ({ ...p, measurements: p.measurements.map(m => m.id === id ? { ...m, [f]: v } : m) }));
  const removeMeasurement = (id: string) =>
    setForm(p => ({ ...p, measurements: p.measurements.filter(m => m.id !== id) }));

  // ── Test result helpers ──
  const addTestResult = () =>
    setForm(p => ({ ...p, testResults: [...p.testResults, { id: uid(), name: "", date: "", finding: "" }] }));
  const setTestResult = (id: string, f: keyof TestResult, v: string) =>
    setForm(p => ({ ...p, testResults: p.testResults.map(t => t.id === id ? { ...t, [f]: v } : t) }));
  const removeTestResult = (id: string) =>
    setForm(p => ({ ...p, testResults: p.testResults.filter(t => t.id !== id) }));

  // ── Previous treatment helpers ──
  const addPrevTreatment = () =>
    setForm(p => ({ ...p, previousTreatments: [...p.previousTreatments, { id: uid(), name: "", duration: "", outcome: "" }] }));
  const setPrevTreatment = (id: string, f: keyof PreviousTreatment, v: string) =>
    setForm(p => ({ ...p, previousTreatments: p.previousTreatments.map(t => t.id === id ? { ...t, [f]: v } : t) }));
  const removePrevTreatment = (id: string) =>
    setForm(p => ({ ...p, previousTreatments: p.previousTreatments.filter(t => t.id !== id) }));

  // ── Document helpers ──
  const handleFilesAdded = (files: FileList | File[]) => {
    const newDocs: FormDoc[] = Array.from(files).map(file => ({
      id: `doc-${uid()}`,
      name: file.name,
      type: detectDocCategory(file.name),
      size: formatFileSize(file.size),
      file,
      previewUrl: URL.createObjectURL(file),
      fileType: file.type,
      uploadedAt: new Date().toISOString(),
    }));
    setForm(p => ({ ...p, documents: [...p.documents, ...newDocs] }));
  };
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) { handleFilesAdded(e.target.files); e.target.value = ""; }
  };
  const handleDragOver  = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop      = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    if (e.dataTransfer.files?.length) handleFilesAdded(e.dataTransfer.files);
  };
  const removeDoc = (id: string) =>
    setForm(p => {
      const d = p.documents.find(d => d.id === id);
      if (d?.previewUrl) URL.revokeObjectURL(d.previewUrl);
      return { ...p, documents: p.documents.filter(d => d.id !== id) };
    });
  const updateDocCategory = (id: string, t: string) =>
    setForm(p => ({ ...p, documents: p.documents.map(d => d.id === id ? { ...d, type: t } : d) }));

  // ── Validation ──
  const validateStep = () => {
    const e: Record<string, string> = {};
    if (step === 1) {
      if (!form.patient.name.trim())     e.name     = "Patient name is required";
      if (!form.patient.dob)             e.dob      = "Date of birth is required";
      if (!form.patient.memberId.trim()) e.memberId = "Member ID is required";
      if (!form.patient.policyId.trim()) {
        e.policyId = "Policy ID is required";
      } else if (!isValidPolicyId(form.patient.policyId)) {
        e.policyId = `Invalid Policy ID: "${form.patient.policyId}". Policy ID must match a predefined ruleset policy (e.g. ACU-75891551, MRI-12493019, POL-001).`;
      }
    }
    if (step === 2) {
      if (!form.diagnoses[0]?.code.trim())        e.diag_code = "Primary diagnosis code is required";
      if (!form.diagnoses[0]?.description.trim()) e.diag_desc = "Primary diagnosis description is required";
    }
    if (step === 3) {
      if (!form.treatment.serviceType)        e.serviceType = "Service type is required";
      if (!form.treatment.serviceName.trim()) e.serviceName = "Service / procedure name is required";
      if (!form.treatment.serviceCode.trim()) e.serviceCode = "Service code is required";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => { if (validateStep()) setStep(s => Math.min(s + 1, 5)); };
  const back = () => { setErrors({}); setStep(s => Math.max(s - 1, 1)); };

  // ── Submit with Step-by-Step Validation & Processing Modal ──
  const handleSubmit = async () => {
    setSubmitting(true);
    setValidationModalOpen(true);
    setValidationPhase("processing");
    setErrors({});

    const initialSteps: Array<{
      id: "verify_member" | "preprocess_data" | "rule_pipeline";
      title: string;
      sublabel: string;
      status: "idle" | "running" | "passed" | "failed";
      errorDetail?: string;
    }> = [
      {
        id: "verify_member",
        title: "1. Database & Member ID Verification",
        sublabel: "Checking patient Member ID in database...",
        status: "running",
      },
      {
        id: "preprocess_data",
        title: "2. Input Preprocessing & Attachment Parsing",
        sublabel: "Formatting PA request payload & uploading clinical files...",
        status: "idle",
      },
      {
        id: "rule_pipeline",
        title: "3. Automated Rules Engine Evaluation",
        sublabel: "Running Module 3 clinical evaluation and policy mapping...",
        status: "idle",
      },
    ];
    setValidationSteps(initialSteps);

    // ── STEP 1: Verify Member ID against Database ──
    const mid = form.patient.memberId.trim();
    let isMemberValid = false;
    let verifyMsg = "";

    try {
      if (!mid) {
        verifyMsg = "Member ID is required for patient verification.";
      } else {
        const vRes = await api.verifyMemberId(mid);
        if (vRes.exists) {
          isMemberValid = true;
          verifyMsg = vRes.message || `Member ID '${mid}' verified in database.`;
        } else {
          verifyMsg = vRes.message || `Member ID '${mid}' was not found in the patient database. Please verify patient records.`;
        }
      }
    } catch (err: any) {
      verifyMsg = err?.message || "Failed to connect to database for member verification.";
    }

    if (!isMemberValid) {
      setValidationSteps(prev =>
        prev.map(s =>
          s.id === "verify_member"
            ? { ...s, status: "failed", errorDetail: verifyMsg }
            : s
        )
      );
      setValidationPhase("failed");
      setSubmitting(false);
      return;
    }

    // Step 1 Passed -> Mark Passed & Start Step 2
    setValidationSteps(prev =>
      prev.map(s =>
        s.id === "verify_member"
          ? { ...s, status: "passed" }
          : s.id === "preprocess_data"
          ? { ...s, status: "running" }
          : s
      )
    );

    await new Promise(r => setTimeout(r, 400));

    // ── STEP 2: Create Authorization & Upload Documents ──
    const payload = {
      patient: {
        name:         form.patient.name,
        dob:          form.patient.dob,
        gender:       form.patient.gender,
        memberId:     form.patient.memberId,
        groupId:      form.patient.patientId,
        plan:         form.patient.policyTier,
        payer:        "",
        phone:        "",
        address:      "",
        primaryCare:  "",
        policyId:     form.patient.policyId,
      },
      provider: {
        id:           "prov-001",
        name:         user?.name,
        npi:          "1234567890",
        specialty:    "General Practice",
        organization: user?.organization,
        phone:        "",
        fax:          "",
        address:      "",
        taxId:        "",
      },
      diagnoses: form.diagnoses.map(d => ({ code: d.code, description: d.description, type: d.type })),
      procedures: [{
        code:           form.treatment.serviceCode,
        description:    form.treatment.serviceName,
        modifier:       "",
        codingSystem:   form.treatment.codingSystem,
        quantity:       parseInt(form.treatment.quantity || "1", 10),
        serviceDate:    "",
        placeOfService: form.treatment.serviceType,
      }],
      clinicalNotes: [
        form.clinicalIndication && `Clinical Indication: ${form.clinicalIndication}`,
        form.symptoms           && `Symptoms: ${form.symptoms}`,
        form.previousTreatments.length > 0 && `Previous Treatments: ${form.previousTreatments.map(t => `${t.name} (${t.duration}, outcome: ${t.outcome})`).join("; ")}`,
        form.measurements.length > 0       && `Clinical Measurements: ${form.measurements.map(m => `${m.name}: ${m.value} ${m.unit}`).join(", ")}`,
        form.testResults.length > 0        && `Test Results: ${form.testResults.map(t => `${t.name} (${t.date}): ${t.finding}`).join("; ")}`,
        form.clinicalJustification         && `Provider Justification: ${form.clinicalJustification}`,
      ].filter(Boolean).join("\n\n"),
      priority: form.priority,
      documents: form.documents.map(d => ({
        id: d.id, name: d.name, type: d.type, size: d.size,
        uploadedAt: d.uploadedAt, uploadedBy: user?.name || "Provider",
      })),
    };

    let authId = "";
    let caseNum = "";

    try {
      const res = await api.createAuthorization(payload) as { id: string; caseNumber: string };
      authId = res.id;
      caseNum = res.caseNumber;

      const docsWithFiles = form.documents.filter(d => d.file instanceof File);
      if (docsWithFiles.length > 0 && authId) {
        const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:8000/api/v1";
        await Promise.all(docsWithFiles.map(async doc => {
          const fd = new FormData();
          fd.append("authorization_id", authId);
          fd.append("document_type",    doc.type);
          fd.append("uploaded_by",      user?.name || "Provider");
          fd.append("file",             doc.file as File, doc.name);
          await fetch(`${API_BASE}/documents/upload`, { method: "POST", body: fd });
        }));
      }
    } catch (err: any) {
      const errMsg = err?.message || "Failed to format request or upload clinical documents.";
      setValidationSteps(prev =>
        prev.map(s =>
          s.id === "preprocess_data"
            ? { ...s, status: "failed", errorDetail: errMsg }
            : s
        )
      );
      setValidationPhase("failed");
      setSubmitting(false);
      return;
    }

    // Step 2 Passed -> Mark Passed & Start Step 3
    setValidationSteps(prev =>
      prev.map(s =>
        s.id === "preprocess_data"
          ? { ...s, status: "passed" }
          : s.id === "rule_pipeline"
          ? { ...s, status: "running" }
          : s
      )
    );

    await new Promise(r => setTimeout(r, 400));

    // ── STEP 3: Automated Pipeline & Policy Evaluation ──
    try {
      if (authId) {
        await api.processAuthorization(authId);
      }
    } catch (err: any) {
      const errMsg = err?.message || "Rule evaluation pipeline encountered an error.";
      setValidationSteps(prev =>
        prev.map(s =>
          s.id === "rule_pipeline"
            ? { ...s, status: "failed", errorDetail: errMsg }
            : s
        )
      );
      setValidationPhase("failed");
      setSubmitting(false);
      return;
    }

    // Step 3 Passed -> Complete Success!
    setValidationSteps(prev =>
      prev.map(s => (s.id === "rule_pipeline" ? { ...s, status: "passed" } : s))
    );

    setCaseNumber(caseNum);
    setCreatedAuthId(authId);
    setSubmitting(false);
    setValidationPhase("passed");
    setSubmitted(true);
  };

  // ── Success screen ──
  if (submitted) {
    return (
      <div className="max-w-lg mx-auto mt-16 text-center space-y-6">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-emerald-100 mx-auto">
          <CheckCircle className="h-8 w-8 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Request Submitted</h2>
          <p className="mt-2 text-slate-600">Your prior authorization request has been submitted successfully.</p>
        </div>
        <div className="rounded-xl border border-slate-200 border-l-4 border-l-teal-500 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Case Number</p>
          <p className="text-2xl font-bold text-teal-600 mt-1 font-mono">{caseNumber}</p>
          <p className="text-sm text-slate-500 mt-3">Patient: <span className="font-medium text-slate-900">{form.patient.name}</span></p>
          <p className="text-sm text-slate-500 mt-1">Service: <span className="font-medium text-slate-900">{form.treatment.serviceName || "—"}</span></p>
          <p className="text-sm text-slate-500 mt-1">Documents: <span className="font-medium text-slate-900">{form.documents.length} file{form.documents.length !== 1 ? "s" : ""}</span></p>
        </div>
        <div className="flex gap-3 justify-center">
          <button onClick={() => navigate("/provider/requests", { state: { refresh: Date.now() } })}
            className="px-5 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-medium text-sm transition-colors shadow-sm">
            View My Requests
          </button>
          <button onClick={() => { setForm(emptyForm); setStep(1); setSubmitted(false); }}
            className="px-5 py-2.5 rounded-lg border border-slate-200 text-slate-700 font-medium text-sm hover:bg-slate-50 transition-colors">
            Submit Another Request
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="w-full space-y-6">
      <input type="file" ref={fileInputRef} onChange={handleFileInputChange}
        multiple accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.tiff,.txt,.csv,.xlsx" className="hidden" />

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">New Authorization Request</h1>
        <p className="text-sm text-slate-500 mt-1">Submit a prior authorization request for your patient</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center max-w-4xl mx-auto py-2">
        {STEPS.map((s, idx) => {
          const Icon = s.icon;
          const done = step > s.id;
          const active = step === s.id;
          return (
            <div key={s.id} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center border text-xs font-bold transition-all ${
                  done ? "bg-blue-600 border-blue-600 text-white" : active ? "border-blue-600 bg-blue-50 text-blue-600" : "border-slate-200 bg-white text-slate-400"
                }`}>
                  {done ? <Check className="h-4.5 w-4.5" /> : <Icon className="h-3.5 w-3.5" />}
                </div>
                <span className={`text-[10px] mt-1.5 uppercase font-bold tracking-wider ${
                  active ? "text-blue-600" : done ? "text-slate-600" : "text-slate-400"
                }`}>
                  {`0${s.id}`} {s.label}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div className={`flex-1 h-[2px] mx-3 mb-4 transition-all duration-350 ${
                  done ? "bg-blue-600" : "bg-slate-200"
                }`} />
              )}
            </div>
          );
        })}
      </div>

      {/* ═══ STEP CONTENT ═══ */}
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm space-y-6">

        {/* ── STEP 1: Patient Info ── */}
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-base font-semibold text-slate-900">Patient Information</h2>

            {/* Patient Details */}
            <div>
              <SectionHeader title="Patient Details" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Patient ID *</label>
                  <input className={inputClass} placeholder="e.g. PT-00123" value={form.patient.patientId}
                    onChange={e => setPatient("patientId", e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Patient Name *</label>
                  <input className={inputClass} placeholder="Full legal name" value={form.patient.name}
                    onChange={e => setPatient("name", e.target.value)} />
                  {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                </div>
                <div>
                  <label className={labelClass}>Date of Birth *</label>
                  <input type="date" className={inputClass} value={form.patient.dob}
                    onChange={e => setPatient("dob", e.target.value)} />
                  {errors.dob && <p className="text-xs text-red-500 mt-1">{errors.dob}</p>}
                </div>
                <div>
                  <label className={labelClass}>Gender</label>
                  <select className={inputClass} value={form.patient.gender}
                    onChange={e => setPatient("gender", e.target.value)}>
                    <option>Male</option><option>Female</option><option>Other</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Insurance Details */}
            <div>
              <SectionHeader title="Insurance Details" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between">
                    <label className={labelClass}>Member ID *</label>
                    {memberVerifyStatus.checking && (
                      <span className="text-[11px] text-teal-600 font-semibold animate-pulse">Checking DB...</span>
                    )}
                  </div>
                  <input
                    className={inputClass}
                    placeholder="e.g. MEM-1001 or BCB-4821-001"
                    value={form.patient.memberId}
                    onChange={e => {
                      setPatient("memberId", e.target.value);
                      setMemberVerifyStatus({ checking: false, checked: false, exists: false });
                    }}
                    onBlur={handleMemberIdBlur}
                  />
                  {errors.memberId && <p className="text-xs text-red-500 mt-1">{errors.memberId}</p>}

                  {/* Member Database Verification Banner */}
                  {memberVerifyStatus.checked && (
                    <div className={`mt-2 p-2.5 rounded-lg border text-xs flex items-start justify-between gap-2 transition-all ${
                      memberVerifyStatus.exists ? "bg-emerald-50 border-emerald-200 text-emerald-900" : "bg-amber-50 border-amber-200 text-amber-900"
                    }`}>
                      <div className="flex items-start gap-1.5 min-w-0">
                        {memberVerifyStatus.exists ? (
                          <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                        )}
                        <div className="min-w-0">
                          <p className="font-bold text-xs">
                            {memberVerifyStatus.exists ? "Member Verified in Database" : "Member Not Found in DB Registry"}
                          </p>
                          <p className="text-[11px] mt-0.5 leading-snug">
                            {memberVerifyStatus.message}
                          </p>
                        </div>
                      </div>
                      {memberVerifyStatus.exists && memberVerifyStatus.patient && (
                        <button
                          type="button"
                          onClick={() => {
                            const p = memberVerifyStatus.patient;
                            if (p.name) setPatient("name", p.name);
                            if (p.dob) setPatient("dob", p.dob);
                            if (p.gender) setPatient("gender", p.gender);
                          }}
                          className="text-[10px] font-bold px-2 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shrink-0 shadow-2xs cursor-pointer"
                        >
                          Auto-fill Details
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <PolicyIdSelect
                    value={form.patient.policyId}
                    onChange={val => {
                      setPatient("policyId", val);
                      if (errors.policyId) {
                        setErrors(prev => { const n = { ...prev }; delete n.policyId; return n; });
                      }
                    }}
                    error={errors.policyId}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Policy Tier</label>
                  <select className={inputClass} value={form.patient.policyTier}
                    onChange={e => setPatient("policyTier", e.target.value)}>
                    <option value="">Select tier...</option>
                    {POLICY_TIERS.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <p className="mt-3 flex items-start gap-1.5 text-xs text-slate-500 font-medium">
                <Info className="h-3.5 w-3.5 text-teal-600 shrink-0 mt-0.5" />
                Policy ID must match an active predefined policy ruleset in the engine. Select from the dropdown or type a valid Policy ID.
              </p>
            </div>
          </div>
        )}

        {/* ── STEP 3: Procedure ── */}
        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-base font-semibold text-slate-900">Treatment Information</h2>

            <div>
              <SectionHeader title="Requested Service" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className={labelClass}>Service Type *</label>
                  <select className={inputClass} value={form.treatment.serviceType}
                    onChange={e => setTreatment("serviceType", e.target.value)}>
                    <option value="">Select service type...</option>
                    {SERVICE_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                  {errors.serviceType && <p className="text-xs text-red-500 mt-1">{errors.serviceType}</p>}
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Treatment / Procedure / Service Name *</label>
                  <input className={inputClass} placeholder="e.g. MRI Knee, Total Knee Replacement, Physical Therapy"
                    value={form.treatment.serviceName} onChange={e => setTreatment("serviceName", e.target.value)} />
                  {errors.serviceName && <p className="text-xs text-red-500 mt-1">{errors.serviceName}</p>}
                </div>
                <div>
                  <label className={labelClass}>Service Code *</label>
                  <input className={inputClass} placeholder="e.g. 73721" value={form.treatment.serviceCode}
                    onChange={e => setTreatment("serviceCode", e.target.value)} />
                  {errors.serviceCode && <p className="text-xs text-red-500 mt-1">{errors.serviceCode}</p>}
                </div>
                <div>
                  <label className={labelClass}>Coding System</label>
                  <select className={inputClass} value={form.treatment.codingSystem}
                    onChange={e => setTreatment("codingSystem", e.target.value)}>
                    {CODING_SYSTEMS.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div>
              <SectionHeader title="Quantity / Frequency / Duration" />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>Quantity</label>
                  <input type="number" min={1} className={inputClass} placeholder="1"
                    value={form.treatment.quantity} onChange={e => setTreatment("quantity", e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Frequency</label>
                  <input className={inputClass} placeholder="e.g. 3x per week" value={form.treatment.frequency}
                    onChange={e => setTreatment("frequency", e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Duration</label>
                  <input className={inputClass} placeholder="e.g. 6 weeks" value={form.treatment.duration}
                    onChange={e => setTreatment("duration", e.target.value)} />
                </div>
              </div>
            </div>

            <div>
              <label className={labelClass}>Request Priority</label>
              <div className="flex gap-3 flex-wrap">
                {(["urgent","high","normal","low"] as const).map(p => {
                  const colors: Record<string,string> = {
                    urgent: "border-rose-400 bg-rose-50 text-rose-700",
                    high:   "border-amber-400 bg-amber-50 text-amber-700",
                    normal: "border-blue-400 bg-blue-50 text-blue-700",
                    low:    "border-slate-300 bg-slate-50 text-slate-700",
                  };
                  return (
                    <button key={p} type="button" onClick={() => setForm(f => ({ ...f, priority: p }))}
                      className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${form.priority === p ? colors[p] : "border-slate-200 text-slate-500 hover:border-slate-300"}`}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2: Clinical ── */}
        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-base font-semibold text-slate-900">Clinical Information</h2>

            {/* Diagnosis */}
            <div>
              <SectionHeader title="Diagnosis" onAdd={addDiagnosis} addLabel="Add Secondary Diagnosis" />
              <div className="space-y-3">
                {form.diagnoses.map((diag, i) => (
                  <div key={i} className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-slate-600">
                        {i === 0 ? "Primary Diagnosis" : `Secondary Diagnosis ${i}`}
                      </span>
                      {i > 0 && (
                        <button onClick={() => removeDiagnosis(i)} className="text-red-400 hover:text-red-600 p-1">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className={labelClass}>Diagnosis Code *</label>
                        <input className={inputClass} placeholder="e.g. M17.11" value={diag.code}
                          onChange={e => setDiagnosis(i, "code", e.target.value)} />
                        {i === 0 && errors.diag_code && <p className="text-xs text-red-500 mt-1">{errors.diag_code}</p>}
                      </div>
                      <div className="sm:col-span-2">
                        <label className={labelClass}>Diagnosis Description *</label>
                        <input className={inputClass} placeholder="e.g. Primary osteoarthritis, right knee"
                          value={diag.description} onChange={e => setDiagnosis(i, "description", e.target.value)} />
                        {i === 0 && errors.diag_desc && <p className="text-xs text-red-500 mt-1">{errors.diag_desc}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Clinical Indication + Symptoms */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Clinical Indication</label>
                <textarea rows={3} className={inputClass} placeholder="Why is this treatment medically necessary?"
                  value={form.clinicalIndication} onChange={e => setForm(f => ({ ...f, clinicalIndication: e.target.value }))} />
              </div>
              <div>
                <label className={labelClass}>Symptoms</label>
                <textarea rows={3} className={inputClass} placeholder="Describe the patient's current symptoms..."
                  value={form.symptoms} onChange={e => setForm(f => ({ ...f, symptoms: e.target.value }))} />
              </div>
            </div>

            {/* Previous Treatments */}
            <div>
              <SectionHeader title="Previous Treatments" onAdd={addPrevTreatment} addLabel="Add Treatment" />
              {form.previousTreatments.length === 0 && (
                <p className="text-xs text-slate-400 italic">No previous treatments added. Click "Add Treatment" to document prior attempts.</p>
              )}
              <div className="space-y-3">
                {form.previousTreatments.map(t => (
                  <div key={t.id} className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-slate-600">Previous Treatment</span>
                      <button onClick={() => removePrevTreatment(t.id)} className="text-red-400 hover:text-red-600 p-1">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className={labelClass}>Treatment Name</label>
                        <input className={inputClass} placeholder="e.g. Physical Therapy" value={t.name}
                          onChange={e => setPrevTreatment(t.id, "name", e.target.value)} />
                      </div>
                      <div>
                        <label className={labelClass}>Duration</label>
                        <input className={inputClass} placeholder="e.g. 6 weeks" value={t.duration}
                          onChange={e => setPrevTreatment(t.id, "duration", e.target.value)} />
                      </div>
                      <div>
                        <label className={labelClass}>Outcome</label>
                        <input className={inputClass} placeholder="e.g. No improvement" value={t.outcome}
                          onChange={e => setPrevTreatment(t.id, "outcome", e.target.value)} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Clinical Measurements */}
            <div>
              <SectionHeader title="Clinical Measurements" onAdd={addMeasurement} addLabel="Add Measurement" />
              {form.measurements.length === 0 && (
                <p className="text-xs text-slate-400 italic">No measurements added. Click "Add Measurement" to include BMI, HbA1c, blood pressure, etc.</p>
              )}
              <div className="space-y-3">
                {form.measurements.map(m => (
                  <div key={m.id} className="flex items-end gap-3 p-4 rounded-lg border border-slate-200 bg-slate-50/50">
                    <div className="flex-1">
                      <label className={labelClass}>Measurement Name</label>
                      <input className={inputClass} placeholder="e.g. BMI" value={m.name}
                        onChange={e => setMeasurement(m.id, "name", e.target.value)} />
                    </div>
                    <div className="w-28">
                      <label className={labelClass}>Value</label>
                      <input className={inputClass} placeholder="32" value={m.value}
                        onChange={e => setMeasurement(m.id, "value", e.target.value)} />
                    </div>
                    <div className="w-28">
                      <label className={labelClass}>Unit</label>
                      <input className={inputClass} placeholder="kg/m²" value={m.unit}
                        onChange={e => setMeasurement(m.id, "unit", e.target.value)} />
                    </div>
                    <button onClick={() => removeMeasurement(m.id)} className="mb-0.5 p-1.5 text-red-400 hover:text-red-600">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Test / Scan Results */}
            <div>
              <SectionHeader title="Test / Scan Results" onAdd={addTestResult} addLabel="Add Result" />
              {form.testResults.length === 0 && (
                <p className="text-xs text-slate-400 italic">No results added. Click "Add Result" to include MRI, X-ray, lab findings, etc.</p>
              )}
              <div className="space-y-3">
                {form.testResults.map(t => (
                  <div key={t.id} className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-slate-600">Test / Scan Result</span>
                      <button onClick={() => removeTestResult(t.id)} className="text-red-400 hover:text-red-600 p-1">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className={labelClass}>Test / Scan Name</label>
                        <input className={inputClass} placeholder="e.g. MRI Knee" value={t.name}
                          onChange={e => setTestResult(t.id, "name", e.target.value)} />
                      </div>
                      <div>
                        <label className={labelClass}>Test Date</label>
                        <input type="date" className={inputClass} value={t.date}
                          onChange={e => setTestResult(t.id, "date", e.target.value)} />
                      </div>
                      <div>
                        <label className={labelClass}>Result / Finding</label>
                        <input className={inputClass} placeholder="e.g. Grade IV osteoarthritis" value={t.finding}
                          onChange={e => setTestResult(t.id, "finding", e.target.value)} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 4: Documents ── */}
        {step === 4 && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Supporting Documents</h2>
                <p className="text-sm text-slate-500 mt-0.5">Upload clinical records, lab reports, imaging, and other supporting evidence.</p>
              </div>
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm">
                <Upload className="h-4 w-4" /> Browse Files
              </button>
            </div>

            {/* Drag & Drop Zone */}
            <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                isDragging ? "border-teal-500 bg-teal-50/70" : "border-slate-300 hover:border-teal-400 hover:bg-teal-50/20 bg-slate-50/50"
              }`}>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-100 text-teal-600 mx-auto mb-3">
                <FileUp className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-slate-900">{isDragging ? "Drop files here" : "Click to select or drag & drop"}</p>
              <p className="text-xs text-slate-500 mt-1">PDF, JPG, PNG, DOCX, XLSX, TXT — up to 25 MB each</p>
            </div>

            {/* Document types checklist hint */}
            <div className="rounded-xl border border-teal-100 bg-teal-50/50 p-4">
              <p className="text-xs font-semibold text-teal-800 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Info className="h-4 w-4 text-teal-600" /> Recommended Document Types
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-teal-900/80">
                {["Clinical Notes", "Lab Reports", "Test / Scan Reports", "Previous Treatment Records",
                  "Prescription / Treatment Plan", "Referral Documents", "Other Supporting Documents"].map(t => (
                  <div key={t} className="flex items-center gap-1.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-teal-500" /><span>{t}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Uploaded files list */}
            {form.documents.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Attached Files ({form.documents.length})</h3>
                  <button type="button" onClick={() => { form.documents.forEach(d => { if (d.previewUrl) URL.revokeObjectURL(d.previewUrl); }); setForm(f => ({ ...f, documents: [] })); }}
                    className="text-xs text-red-500 hover:text-red-700 font-medium">Clear All</button>
                </div>
                {form.documents.map(doc => (
                  <div key={doc.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-white gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-50 border border-teal-100">
                        {getFileIcon(doc.fileType, doc.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{doc.name}</p>
                        <span className="text-xs text-slate-500 font-mono">{doc.size}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <select value={doc.type} onChange={e => updateDocCategory(doc.id, e.target.value)}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20">
                        {DOC_CATEGORIES.map(cat => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
                      </select>
                      {doc.previewUrl && (
                        <button type="button" onClick={() => setPreviewDoc(doc)}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-teal-50 hover:text-teal-600 transition-colors">
                          <Eye className="h-4 w-4" />
                        </button>
                      )}
                      <button type="button" onClick={() => removeDoc(doc.id)}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Provider Clinical Justification */}
            <div>
              <label className={labelClass}>Provider Clinical Justification</label>
              <textarea rows={5} className={inputClass}
                placeholder="Explain in your own words why this treatment is medically necessary for this patient. Include any relevant clinical reasoning, urgency, and why alternatives are not appropriate..."
                value={form.clinicalJustification}
                onChange={e => setForm(f => ({ ...f, clinicalJustification: e.target.value }))} />
              <p className="text-xs text-slate-400 mt-1">This narrative supports your request and is reviewed alongside the uploaded documents.</p>
            </div>
          </div>
        )}

        {/* ── STEP 5: Review ── */}
        {step === 5 && (
          <div className="space-y-5">
            <h2 className="text-base font-semibold text-slate-900">Review & Submit</h2>

            {/* Patient */}
            <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 space-y-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Patient</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-2 gap-x-6 text-sm">
                <ReviewRow label="Patient Name"  value={form.patient.name} />
                <ReviewRow label="Patient ID"    value={form.patient.patientId} />
                <ReviewRow label="Date of Birth" value={form.patient.dob} />
                <ReviewRow label="Gender"        value={form.patient.gender} />
                <ReviewRow label="Member ID"     value={form.patient.memberId} mono />
                <ReviewRow label="Policy ID"     value={form.patient.policyId} mono />
                <ReviewRow label="Policy Tier"   value={form.patient.policyTier} />
              </div>
            </div>

            {/* Treatment */}
            <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 space-y-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Treatment</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-2 gap-x-6 text-sm">
                <ReviewRow label="Service Type"   value={form.treatment.serviceType} />
                <ReviewRow label="Service Name"   value={form.treatment.serviceName} />
                <ReviewRow label="Service Code"   value={form.treatment.serviceCode} mono />
                <ReviewRow label="Coding System"  value={form.treatment.codingSystem} />
                <ReviewRow label="Quantity"       value={form.treatment.quantity} />
                <ReviewRow label="Frequency"      value={form.treatment.frequency || "—"} />
                <ReviewRow label="Duration"       value={form.treatment.duration || "—"} />
                <ReviewRow label="Priority"       value={form.priority.charAt(0).toUpperCase() + form.priority.slice(1)} />
              </div>
            </div>

            {/* Clinical */}
            <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 space-y-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Clinical</p>
              <div className="space-y-1.5 text-sm">
                {form.diagnoses.map((d, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="font-mono text-xs font-bold text-teal-600 whitespace-nowrap mt-0.5">{d.code}</span>
                    <span className="text-slate-800 flex-1">{d.description}</span>
                    <span className="text-xs text-slate-400 shrink-0">{d.type}</span>
                  </div>
                ))}
                {form.clinicalIndication && <p className="text-xs text-slate-600"><span className="font-semibold">Indication:</span> {form.clinicalIndication}</p>}
                {form.symptoms          && <p className="text-xs text-slate-600"><span className="font-semibold">Symptoms:</span> {form.symptoms}</p>}
                {form.previousTreatments.length > 0 && (
                  <p className="text-xs text-slate-600">
                    <span className="font-semibold">Previous Treatments:</span> {form.previousTreatments.map(t => `${t.name} (${t.duration})`).join(", ")}
                  </p>
                )}
                {form.measurements.length > 0 && (
                  <p className="text-xs text-slate-600">
                    <span className="font-semibold">Measurements:</span> {form.measurements.map(m => `${m.name}: ${m.value} ${m.unit}`).join(", ")}
                  </p>
                )}
                {form.testResults.length > 0 && (
                  <p className="text-xs text-slate-600">
                    <span className="font-semibold">Test Results:</span> {form.testResults.map(t => `${t.name} — ${t.finding}`).join("; ")}
                  </p>
                )}
              </div>
            </div>

            {/* Documents */}
            <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 space-y-2">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Documents ({form.documents.length})</p>
              {form.documents.length === 0
                ? <p className="text-sm text-slate-400 italic">No documents attached</p>
                : <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {form.documents.map(doc => {
                      const catLabel = DOC_CATEGORIES.find(c => c.value === doc.type)?.label ?? doc.type;
                      return (
                        <div key={doc.id} className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 bg-white">
                          {getFileIcon(doc.fileType, doc.name)}
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-slate-900 truncate">{doc.name}</p>
                            <p className="text-[11px] text-slate-500">{catLabel} · {doc.size}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
              }
              {form.clinicalJustification && (
                <div className="mt-2 pt-2 border-t border-slate-200">
                  <p className="text-xs font-semibold text-slate-500 mb-1">Provider Clinical Justification</p>
                  <p className="text-xs text-slate-600 leading-relaxed">{form.clinicalJustification}</p>
                </div>
              )}
            </div>

            {errors.submit && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{errors.submit}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button type="button" onClick={back} disabled={step === 1}
          className="px-5 py-2.5 rounded-lg border border-slate-200 text-slate-700 font-medium text-sm hover:bg-teal-50 hover:text-teal-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          Back
        </button>
        {step < 5 ? (
          <button type="button" onClick={next}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-medium text-sm transition-colors shadow-sm">
            Next <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button type="button" onClick={handleSubmit} disabled={submitting}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm transition-colors shadow-sm disabled:opacity-60">
            {submitting
              ? <><span className="inline-block h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Submitting...</>
              : <><CheckCircle className="h-4 w-4" />Submit PA Request</>
            }
          </button>
        )}
      </div>

      {/* ── Simple Minimal Validation & Processing Modal ── */}
      {validationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md bg-white rounded-xl border border-slate-200 shadow-xl p-5 space-y-4">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                {validationPhase === "processing" && "Processing Request..."}
                {validationPhase === "failed"     && "Validation Error"}
                {validationPhase === "passed"     && "Request Submitted Successfully"}
              </h3>
              {validationPhase !== "processing" && (
                <button
                  type="button"
                  onClick={() => setValidationModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors p-1"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Step list */}
            <div className="space-y-3">
              {validationSteps.map((stepInfo) => (
                <div key={stepInfo.id} className="flex items-start gap-2.5 text-xs">
                  <div className="mt-0.5 shrink-0">
                    {stepInfo.status === "running" && <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />}
                    {stepInfo.status === "passed"  && <Check className="h-4 w-4 text-emerald-600 font-bold" />}
                    {stepInfo.status === "failed"  && <X className="h-4 w-4 text-rose-600 font-bold" />}
                    {stepInfo.status === "idle"    && <div className="h-3.5 w-3.5 rounded-full border border-slate-300 flex items-center justify-center text-[8px] font-bold text-slate-300">•</div>}
                  </div>

                  <div className="flex-1">
                    <p className={`font-medium ${
                      stepInfo.status === "failed"  ? "text-rose-700" :
                      stepInfo.status === "passed"  ? "text-slate-800" :
                      stepInfo.status === "running" ? "text-blue-700 font-semibold" : "text-slate-400"
                    }`}>
                      {stepInfo.title}
                    </p>

                    {stepInfo.status === "failed" && stepInfo.errorDetail && (
                      <div className="mt-2 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-1">
                        <p className="font-semibold">Error Details:</p>
                        <p className="leading-normal">{stepInfo.errorDetail}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Success info card */}
            {validationPhase === "passed" && (
              <div className="p-3 rounded-lg bg-emerald-50/80 border border-emerald-200 text-xs text-emerald-900 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-emerald-700 font-medium">Case Number:</span>
                  <span className="font-mono font-bold text-emerald-800 text-sm">{caseNumber}</span>
                </div>
                <p className="text-[11px] text-emerald-700">
                  Patient: <span className="font-semibold text-emerald-900">{form.patient.name}</span> ({form.patient.memberId})
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              {validationPhase === "failed" && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setValidationModalOpen(false);
                      setStep(1); // Return to Step 1 to edit Member ID
                    }}
                    className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 text-xs font-medium hover:bg-slate-50 transition-colors"
                  >
                    Fix Patient Info
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium transition-colors"
                  >
                    Retry
                  </button>
                </>
              )}

              {validationPhase === "passed" && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setForm(emptyForm);
                      setStep(1);
                      setSubmitted(false);
                      setValidationModalOpen(false);
                    }}
                    className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 text-xs font-medium hover:bg-slate-50 transition-colors"
                  >
                    New Request
                  </button>
                  {createdAuthId && (
                    <button
                      type="button"
                      onClick={() => navigate(`/provider/requests/${createdAuthId}`)}
                      className="px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium transition-colors"
                    >
                      View Case
                    </button>
                  )}
                </>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-teal-50 text-teal-600">
                  {getFileIcon(previewDoc.fileType, previewDoc.name)}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 truncate max-w-md">{previewDoc.name}</h3>
                  <p className="text-xs text-slate-500">{DOC_CATEGORIES.find(c => c.value === previewDoc.type)?.label} · {previewDoc.size}</p>
                </div>
              </div>
              <button type="button" onClick={() => setPreviewDoc(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 max-h-[65vh] overflow-y-auto rounded-xl bg-slate-50 p-4 text-center">
              {previewDoc.fileType?.startsWith("image/") ? (
                <img src={previewDoc.previewUrl} alt={previewDoc.name}
                  className="max-h-[50vh] mx-auto rounded-lg shadow-sm object-contain" />
              ) : previewDoc.fileType === "application/pdf" || previewDoc.name.endsWith(".pdf") ? (
                <iframe src={previewDoc.previewUrl} title={previewDoc.name}
                  className="w-full h-96 rounded-lg border border-slate-200" />
              ) : (
                <div className="py-12 text-center">
                  <FileText className="h-16 w-16 text-teal-500 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-slate-900">{previewDoc.name}</p>
                  <p className="text-xs text-slate-500 mt-1">{previewDoc.size}</p>
                  {previewDoc.previewUrl && (
                    <a href={previewDoc.previewUrl} download={previewDoc.name}
                      className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 text-white rounded-lg text-xs font-semibold hover:bg-teal-700 transition-colors">
                      <ExternalLink className="h-3.5 w-3.5" /> Download / Open
                    </a>
                  )}
                </div>
              )}
            </div>
            <div className="mt-4 flex justify-end">
              <button type="button" onClick={() => setPreviewDoc(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Review row helper ────────────────────────────────────────────────────────
function ReviewRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wide">{label}</span>
      <span className={`text-sm text-slate-800 font-medium ${mono ? "font-mono text-xs" : ""}`}>{value || "—"}</span>
    </div>
  );
}
