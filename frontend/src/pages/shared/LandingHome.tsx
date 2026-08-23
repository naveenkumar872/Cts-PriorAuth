import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  Shield,
  CheckCircle2,
  FileText,
  Cpu,
  ArrowRight,
  Sparkles,
  ChevronRight,
  Users,
  Lock,
  BarChart3,
  BookOpen,
  ChevronDown,
  ShieldAlert,
  Database,
  Building2,
  Stethoscope,
  Check,
  UserPlus,
  Network,
  Briefcase,
  Search,
  Activity,
  FileCheck,
  Award,
  Layers,
  FileSearch,
  ShieldCheck
} from "lucide-react";

export default function LandingHome() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [activeFaq, setActiveFaq] = useState<number | null>(0);
  const [activeTab, setActiveTab] = useState<number>(0);

  const handleGetStarted = () => {
    if (isAuthenticated) {
      if (user?.role === "provider") navigate("/provider/dashboard");
      else navigate("/reviewer/dashboard");
    } else {
      navigate("/signup");
    }
  };

  const handlePortalRedirect = (role: "provider" | "reviewer") => {
    navigate("/signup", { state: { defaultRole: role } });
  };

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const pillars = [
    {
      title: "Data Engineering",
      desc: "Ingesting & parsing multi-format EHR files, scan PDFs, and clinical notes for AI evaluation.",
      icon: Database,
    },
    {
      title: "Rule Engine",
      desc: "Deterministic, zero-hallucination policy execution matching health plan criteria.",
      icon: Network,
    },
    {
      title: "RAG Architecture",
      desc: "Semantic vector search retrieving verbatim policy paragraphs and exact citations.",
      icon: Search,
    },
    {
      title: "ML Complexity Triage",
      desc: "Predictive scoring (0–100) to prioritize urgent or complex review workloads.",
      icon: BarChart3,
    },
    {
      title: "Clinical Decisioning",
      desc: "Audited clinician oversight ensuring evidence-based approval or denial outcomes.",
      icon: Shield,
    },
  ];

  const features = [
    {
      id: 0,
      title: "Clinical Document OCR & NLP",
      tag: "Module 3 Ingestion",
      headline: "Automated Medical Chart Ingestion & Entity Extraction",
      desc: "Converts unstructured physician notes, MRI scans, and lab reports into FHIR-standard CPT, ICD-10, and clinical history JSON schemas.",
      bullets: ["Multi-page PDF & Scan OCR text extraction", "Automated ICD-10 & CPT clinical code mapping", "Clinical documentation checklist validation"],
      previewContent: {
        title: "Extracted Clinical Entities",
        badge: "OCR Status: Verified",
        items: [
          { key: "CPT Procedure", val: "72148 — MRI Lumbar Spine w/o Contrast" },
          { key: "ICD-10 Diagnosis", val: "M54.5 — Low back pain (duration: 8 weeks)" },
          { key: "Prior Conservative Care", val: "Physical Therapy (12 sessions completed)" },
        ],
      },
    },
    {
      id: 1,
      title: "Deterministic Rule Verification",
      tag: "Module 5 Rules Engine",
      headline: "Verifiable Medical Necessity Logic Execution",
      desc: "Executes 100% precise, zero-hallucination coverage rule pipelines derived directly from health plan coverage guidelines.",
      bullets: ["Deterministic criteria validation", "Zero LLM hallucination guarantee", "Automated approval path execution"],
      previewContent: {
        title: "Rule Engine Verification Result",
        badge: "Outcome: APPROVED",
        items: [
          { key: "Criterion 1", val: "Severe back pain > 6 weeks — PASSED" },
          { key: "Criterion 2", val: "Failed conservative therapy — PASSED" },
          { key: "Criterion 3", val: "Documented neurological deficit — PASSED" },
        ],
      },
    },
    {
      id: 2,
      title: "Weaviate Vector RAG Evidence",
      tag: "Module 6A Vector Search",
      headline: "Semantic Policy Vector Search & Citation Citations",
      desc: "Queries Weaviate vector collections to retrieve exact medical policy paragraphs, attaching citations to every case file.",
      bullets: ["Semantic vector similarity search", "Exact policy section citations", "Ground truth reference evidence"],
      previewContent: {
        title: "Retrieved Policy Citation",
        badge: "Match: 94.8% Similarity",
        items: [
          { key: "Policy Document", val: "BCBS-SPINE-2026.pdf (Section 4.2)" },
          { key: "Policy Text Citation", val: "'MRI is indicated after 6 weeks of conservative care with documented radiculopathy...'" },
          { key: "Match Score", val: "0.948 Cosine Similarity" },
        ],
      },
    },
    {
      id: 3,
      title: "Grounded Policy Companion",
      tag: "Interactive AI Chat",
      headline: "Policy-Grounded Q&A for Clinical Reviewers",
      desc: "Enables payer clinical reviewers to query medical necessity guidelines with full context of patient clinical records.",
      bullets: ["Ground-truth policy answers", "Interactive clinical Q&A", "Complete decision audit logs"],
      previewContent: {
        title: "Policy Companion Dialogue",
        badge: "Grounded AI Chat",
        items: [
          { key: "Reviewer Query", val: "Does 6 weeks of physical therapy fulfill the conservative care requirement?" },
          { key: "AI Companion", val: "Yes. Policy Section 4.2 line 14 explicitly confirms 6 weeks of supervised PT meets criteria." },
        ],
      },
    },
  ];

  const workflowSteps = [
    { num: "01", title: "Ingest & Extract", desc: "Patient clinical notes & PDFs pass through OCR & NLP code extraction.", icon: FileText },
    { num: "02", title: "Context Mapping", desc: "System maps provider CPT codes to the governing health plan policy.", icon: Building2 },
    { num: "03", title: "Rule Engine Run", desc: "Deterministic evaluation verifies conservative treatment & clinical criteria.", icon: Cpu },
    { num: "04", title: "RAG Policy Match", desc: "Weaviate vector database retrieves exact policy evidence citations.", icon: Database },
    { num: "05", title: "ML Triage Scoring", desc: "ML model calculates complexity score to prioritize reviewer queue.", icon: BarChart3 },
    { num: "06", title: "Audited Decision", desc: "Final determination logged in TiDB with complete audit trail history.", icon: Shield },
  ];

  const faqs = [
    {
      q: "How does the Rule Engine guarantee zero hallucination?",
      a: "The Rule Engine evaluates explicit coverage criteria using deterministic code logic. It never uses LLM text generation to decide approval or denial. LLMs are strictly limited to vector RAG evidence retrieval and clinical chat.",
    },
    {
      q: "What is the difference between Healthcare Provider and Payer Workspaces?",
      a: "The Provider Workspace allows clinical staff to submit prior auth requests, upload charts, and track authorization progress. The Payer Workspace provides queue triage, Weaviate RAG evidence inspection, and compliant decision logging.",
    },
    {
      q: "How does the ML Complexity Model prioritize the queue?",
      a: "Our ML model calculates a complexity score (0–100) based on clinical comorbidities, missing documentation, and policy friction, surfacing complex cases to medical directors while fast-tracking standard requests.",
    },
    {
      q: "Is the platform HIPAA compliant?",
      a: "Yes. Prioris includes role-based access controls (RBAC), end-to-end encryption in transit (TLS 1.3), and audited TiDB database execution logs.",
    },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans flex flex-col antialiased text-base">
      {/* ── HEADER (LOGO AT FAR TOP LEFT, LOGIN/SIGNUP AT FAR TOP RIGHT) ──── */}
      <header className="sticky top-0 z-50 bg-white/98 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="w-full px-6 sm:px-10 h-20 flex items-center justify-between">
          
          {/* Logo at Far Top Left */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-600/25">
              <Briefcase className="w-5.5 h-5.5" />
            </div>
            <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Prior<span className="text-blue-600">is</span>
            </span>
          </div>

          {/* Center Navigation Links (Updated Copy) */}
          <nav className="hidden md:flex items-center gap-9 text-sm font-semibold text-slate-600">
            <a href="#platform" className="text-blue-600 border-b-2 border-blue-600 pb-1 font-bold">Overview</a>
            <a href="#pillars" className="hover:text-blue-600 transition-colors">Core Pillars</a>
            <a href="#features" className="hover:text-blue-600 transition-colors">AI Capabilities</a>
            <a href="#compliance" className="hover:text-blue-600 transition-colors">Security & Compliance</a>
            <a href="#faq" className="hover:text-blue-600 transition-colors">FAQs</a>
          </nav>

          {/* Login / Sign Up at Far Top Right */}
          <div className="flex items-center gap-3 sm:gap-4">
            {isAuthenticated ? (
              <button onClick={handleGetStarted} className="btn-primary py-2.5 px-5 text-sm bg-blue-600 hover:bg-blue-700 shadow-sm">
                Go to Workspace <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm font-bold text-slate-700 hover:text-blue-600 px-4 py-2.5 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className="py-2.5 px-5.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm shadow-md shadow-blue-600/25 transition-all transform hover:-translate-y-0.5"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── HERO SECTION (UPDATED COPY & MATCHING SCREENSHOT) ─────────────── */}
      <section className="pt-14 pb-20 md:pt-20 md:pb-28 bg-gradient-to-b from-blue-50/50 via-white to-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
          
          {/* Left Hero Content */}
          <div className="lg:col-span-6 space-y-7">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-100/80 border border-blue-200 text-blue-800 text-xs sm:text-sm font-bold shadow-xs">
              <span>Prioris — Prior Authorization Intelligence System</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.12]">
              Intelligent Policy Evaluation & Triage
            </h1>

            {/* Subtitle */}
            <p className="text-slate-600 text-base sm:text-lg leading-relaxed max-w-xl">
              Prioris connects healthcare provider systems and insurance payers with 100% deterministic rule verification, clinical document OCR, and Weaviate vector policy evidence.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                onClick={handleGetStarted}
                className="py-3.5 px-7 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm sm:text-base tracking-wide shadow-md shadow-blue-600/25 flex items-center gap-2.5 transition-all transform hover:-translate-y-0.5"
              >
                <span>Request Enterprise Demo</span>
                <ArrowRight className="w-4.5 h-4.5" />
              </button>
              <button
                onClick={() => navigate("/login")}
                className="py-3.5 px-7 rounded-lg bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-bold text-sm sm:text-base shadow-xs transition-all"
              >
                Explore Platform Capabilities
              </button>
            </div>
          </div>

          {/* Right Hero Graphic Mockup */}
          <div className="lg:col-span-6">
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xl overflow-hidden p-5 relative">
              {/* Browser Header Bar */}
              <div className="flex items-center gap-2 pb-4 mb-4 border-b border-slate-200">
                <div className="w-3 h-3 rounded-full bg-slate-300" />
                <div className="w-3 h-3 rounded-full bg-slate-300" />
                <div className="w-3 h-3 rounded-full bg-slate-300" />
                <span className="text-xs font-mono font-medium text-slate-400 ml-2">authai.medical/triage-dashboard</span>
              </div>

              {/* Graphic Card Content */}
              <div className="bg-gradient-to-br from-blue-50/90 to-cyan-50/70 rounded-xl p-7 border border-blue-100 flex flex-col justify-between min-h-[340px]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-md bg-blue-600 text-white flex items-center justify-center text-xs font-extrabold">
                      ⊕
                    </div>
                    <span className="text-sm font-bold text-slate-900">Health Insurance Triage Portal</span>
                  </div>
                  <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Live Status: Active Triage
                  </span>
                </div>

                {/* Center Illustration Graphic Box */}
                <div className="my-6 bg-white rounded-xl p-6 border border-slate-200 shadow-md grid grid-cols-12 gap-4 items-center">
                  <div className="col-span-7 space-y-2.5">
                    <h4 className="text-base font-extrabold text-slate-900">Health Insurance Prior Auth Triage</h4>
                    <p className="text-xs text-slate-600 leading-snug">
                      Automated clinical document parsing, Weaviate vector policy matching, and deterministic decision trees.
                    </p>
                    <div className="pt-2 flex items-center gap-2">
                      <span className="px-3 py-1 bg-blue-600 text-white rounded-md text-xs font-bold shadow-xs">Approved Request</span>
                      <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-semibold border border-slate-200">View RAG Evidence</span>
                    </div>
                  </div>
                  <div className="col-span-5 flex justify-center">
                    <div className="w-28 h-28 rounded-full bg-blue-100/90 border-4 border-white shadow-lg flex flex-col items-center justify-center text-center p-2">
                      <ShieldCheck className="w-10 h-10 text-blue-600 mb-1" />
                      <span className="text-[10px] font-extrabold text-blue-900 uppercase tracking-wider">100% Precision</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Bar */}
                <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                  </div>
                  <span className="font-mono text-slate-700">Case ID: #AUTH-88294</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PORTAL WORKSPACES (UPDATED COPY) ─────────────────────────────── */}
      <section id="platform" className="py-20 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Dual Workspace Portals
            </h2>
            <p className="text-sm sm:text-base text-slate-600 mt-2">
              Tailored clinical operations centers for healthcare providers and health plan reviewers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Provider Card */}
            <div className="bg-slate-50 border border-teal-200/90 rounded-2xl p-8 flex flex-col justify-between shadow-sm hover:shadow-md transition-all">
              <div className="space-y-5">
                <div className="w-12 h-12 rounded-xl bg-teal-100 border border-teal-300 text-teal-700 flex items-center justify-center shadow-xs">
                  <Stethoscope className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-teal-800 bg-teal-100 px-2.5 py-1 rounded">Hospital / Clinic Workspace</span>
                  <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-2">Healthcare Provider Portal</h3>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Upload medical records, extract CPT/ICD-10 codes, resolve missing checklist requirements, and monitor real-time authorization status.
                </p>
              </div>

              <div className="pt-8 space-y-3">
                <button
                  onClick={() => handlePortalRedirect("provider")}
                  className="w-full py-3 px-5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-sm transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  <UserPlus className="w-4 h-4" />
                  Sign Up as Provider
                </button>
                <button
                  onClick={() => navigate("/login", { state: { defaultRole: "provider" } })}
                  className="w-full py-2.5 px-5 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-sm font-bold transition-colors text-center"
                >
                  Provider Sign In →
                </button>
              </div>
            </div>

            {/* Payer Card */}
            <div className="bg-slate-50 border border-blue-200/90 rounded-2xl p-8 flex flex-col justify-between shadow-sm hover:shadow-md transition-all">
              <div className="space-y-5">
                <div className="w-12 h-12 rounded-xl bg-blue-100 border border-blue-300 text-blue-700 flex items-center justify-center shadow-xs">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-800 bg-blue-100 px-2.5 py-1 rounded">Health Plan Operations</span>
                  <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-2">Insurance Payer Portal</h3>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Review prioritized clinical queues, inspect Weaviate RAG policy evidence, interact with the Policy Companion, and log audited determinations.
                </p>
              </div>

              <div className="pt-8 space-y-3">
                <button
                  onClick={() => handlePortalRedirect("reviewer")}
                  className="w-full py-3 px-5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  <UserPlus className="w-4 h-4" />
                  Sign Up as Payer
                </button>
                <button
                  onClick={() => navigate("/login", { state: { defaultRole: "reviewer" } })}
                  className="w-full py-2.5 px-5 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-sm font-bold transition-colors text-center"
                >
                  Payer Sign In →
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── THE 5 PILLARS OF INTELLIGENT TRIAGE (UPDATED COPY) ─────────────── */}
      <section id="pillars" className="py-24 bg-slate-50/80 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              The 5 Pillars of Clinical Triage
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              An end-to-end framework for evaluating complex prior authorization requests with absolute accuracy and HIPAA compliance.
            </p>
          </div>

          {/* 5 White Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {pillars.map((pillar, idx) => {
              const Icon = pillar.icon;
              return (
                <div
                  key={idx}
                  className="bg-white border border-slate-200/90 rounded-2xl p-7 text-center shadow-xs hover:shadow-md transition-all flex flex-col items-center justify-between"
                >
                  <div className="w-14 h-14 rounded-full bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center mb-5 shadow-xs">
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 mb-2.5">{pillar.title}</h3>
                    <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">{pillar.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── FEATURES & MODULE SHOWCASE ────────────────────────────────────── */}
      <section id="features" className="py-24 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Clinical Decision Support Features
            </h2>
            <p className="text-sm sm:text-base text-slate-600">
              High-precision engines engineered specifically for prior authorization workflows.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            {/* Left Tab Buttons */}
            <div className="lg:col-span-5 space-y-3.5">
              {features.map((feat) => {
                const isSelected = activeTab === feat.id;
                return (
                  <button
                    key={feat.id}
                    onClick={() => setActiveTab(feat.id)}
                    className={`w-full text-left p-5 rounded-2xl border transition-all ${
                      isSelected
                        ? "bg-blue-50/60 border-blue-600 shadow-md ring-1 ring-blue-600/20"
                        : "bg-white border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">{feat.tag}</span>
                    <h4 className="text-base font-extrabold text-slate-900 mt-1">{feat.title}</h4>
                    <p className="text-xs sm:text-sm text-slate-600 mt-1.5 line-clamp-2">{feat.desc}</p>
                  </button>
                );
              })}
            </div>

            {/* Right Interactive Preview */}
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-7 shadow-md">
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6">
                <span className="text-xs font-mono font-bold text-slate-500">AuthAI Execution Engine</span>
                <span className="text-xs font-bold px-3 py-1 rounded-md bg-blue-50 border border-blue-200 text-blue-700">
                  {features[activeTab].previewContent.badge}
                </span>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-900">
                  {features[activeTab].headline}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {features[activeTab].desc}
                </p>

                <div className="space-y-2.5 pt-2">
                  {features[activeTab].bullets.map((b, i) => (
                    <div key={i} className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-700">
                      <CheckCircle2 className="w-4.5 h-4.5 text-blue-600 shrink-0" />
                      <span>{b}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-5 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs sm:text-sm space-y-3 shadow-inner">
                  <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">
                    {features[activeTab].previewContent.title}
                  </div>
                  {features[activeTab].previewContent.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-start gap-4 border-b border-slate-800 pb-2 last:border-0 last:pb-0">
                      <span className="text-slate-400 shrink-0">{item.key}:</span>
                      <span className="text-cyan-300 font-semibold text-right">{item.val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ACCORDION ────────────────────────────────────────────────── */}
      <section id="faq" className="py-24 bg-slate-50 border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6 sm:px-8">
          <div className="text-center mb-16 space-y-3">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-sm sm:text-base text-slate-600">
              Common questions about clinical decision support and prior authorization.
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs"
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-6 text-left flex items-center justify-between gap-4 font-bold text-sm sm:text-base text-slate-900 hover:text-blue-600 transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-slate-400 shrink-0 transition-transform ${
                      activeFaq === idx ? "rotate-180 text-blue-600" : ""
                    }`}
                  />
                </button>
                {activeFaq === idx && (
                  <div className="px-6 pb-6 pt-0 text-sm text-slate-600 leading-relaxed border-t border-slate-100">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER & SECURITY (MATCHING REFERENCE IMAGE EXACTLY) ─────────── */}
      <footer id="compliance" className="bg-slate-50/80 pt-20 pb-10 border-t border-slate-200 text-sm text-slate-600">
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 pb-16 border-b border-slate-200">
            {/* Left Brand Column */}
            <div className="lg:col-span-4 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                  <Briefcase className="w-4 h-4" />
                </div>
                <span className="text-xl font-extrabold text-slate-900 tracking-tight">
                  Auth<span className="text-blue-600">AI</span>
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-sm">
                Empowering healthcare administration with institutional-grade artificial intelligence and rigorous clinical oversight.
              </p>
            </div>

            {/* Center Policy Links */}
            <div className="lg:col-span-3 space-y-3">
              <h5 className="text-sm font-bold text-slate-900 mb-4">Legal & Compliance</h5>
              <ul className="space-y-2.5 text-xs sm:text-sm text-slate-600">
                <li><a href="#compliance" className="hover:text-blue-600 transition-colors">Privacy Policy</a></li>
                <li><a href="#compliance" className="hover:text-blue-600 transition-colors">Terms of Service</a></li>
                <li><a href="#compliance" className="hover:text-blue-600 transition-colors">HIPAA Compliance</a></li>
                <li><a href="#compliance" className="hover:text-blue-600 transition-colors">Contact Security</a></li>
              </ul>
            </div>

            {/* Right Enterprise Security Card */}
            <div className="lg:col-span-5 bg-blue-50/70 border border-blue-150 rounded-2xl p-6 space-y-3.5 shadow-xs">
              <div className="flex items-center gap-2 text-blue-700 font-extrabold text-sm sm:text-base">
                <ShieldCheck className="w-5 h-5" />
                <span>Enterprise Grade Security</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Our infrastructure is built to exceed HIPAA and SOC2 Type II requirements, ensuring your PHI data remains encrypted in transit and at rest.
              </p>
              <a href="#compliance" className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-blue-600 hover:text-blue-700">
                <span>View Compliance Documentation</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Bottom Copyright Line */}
          <div className="pt-8 text-center text-xs text-slate-500 font-medium">
            © 2026 AuthAI Medical Systems. All clinical reviews are verified by board-certified professionals.
          </div>
        </div>
      </footer>
    </div>
  );
}
