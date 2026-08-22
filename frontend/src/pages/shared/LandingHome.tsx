import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  Shield,
  CheckCircle,
  FileText,
  Cpu,
  Search,
  ArrowRight,
  Sparkles,
  ChevronRight,
  Users,
  Lock,
  BarChart3,
  BookOpen,
  AlertTriangle,
  ChevronDown,
  ShieldAlert,
} from "lucide-react";

export default function LandingHome() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const handleGetStarted = () => {
    if (isAuthenticated) {
      if (user?.role === "provider") navigate("/provider/dashboard");
      else navigate("/reviewer/dashboard");
    } else {
      navigate("/login");
    }
  };

  const handlePortalRedirect = (role: "provider" | "reviewer") => {
    navigate("/login", { state: { defaultRole: role } });
  };

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const capabilities = [
    {
      icon: Cpu,
      title: "AI Triage",
      desc: "Prioritize authorization requests automatically and surface complex clinical cases requiring manual review.",
    },
    {
      icon: FileText,
      title: "Intelligent Document Processing",
      desc: "Advanced OCR and clinical NLP extraction engines parse patient notes and imaging reports into structured data.",
    },
    {
      icon: BookOpen,
      title: "Policy Evidence Retrieval",
      desc: "Instant policy matching against Weaviate vector collections retrieves exact citations and evidence mappings.",
    },
    {
      icon: Sparkles,
      title: "Policy Companion",
      desc: "Provides clinical review staff with an interactive, policy-grounded assistant for necessity evaluations.",
    },
  ];

  const workflowSteps = [
    { num: "01", name: "Submit", desc: "Provider uploads request metadata and clinical files." },
    { num: "02", name: "Extract", desc: "OCR parsing extracts patient, CPT, and ICD-10 codes." },
    { num: "03", name: "Evaluate", desc: "Rule engine runs eligibility and symptom checkpoints." },
    { num: "04", name: "Review", desc: "AI-triage determines risk scores and pulls RAG evidence." },
    { num: "05", name: "Decide", desc: "Human reviewer logs a structured, audited necessity decision." },
  ];

  const faqs = [
    {
      q: "How does the Rule Engine differ from RAG Policy Intelligence?",
      a: "The Rule Engine is deterministic and evaluates explicit coverage criteria (diagnosis, duration, conservative treatment) with 100% precision and zero hallucination. RAG searches Weaviate vector collections to retrieve the exact policy text and citation as evidence for the human reviewer.",
    },
    {
      q: "What does the ML Complexity Score predict?",
      a: "The ML model (trained on 10,000 synthetic clinical records) scores request processing complexity from 0 to 100 based on comorbidities, prior treatment conflicts, and documentation completeness to prioritize review queue triage.",
    },
    {
      q: "What triggers a 'Nurse Review Required' outcome?",
      a: "Cases with conflicting clinical documentation, complex surgical indications, or borderline policy criteria automatically route to Nurse Review triage, where the Policy Companion highlights the exact conflict.",
    },
    {
      q: "How does Request Understanding extract unstructured clinical records?",
      a: "Uploaded PDFs, scan reports, and clinical notes pass through OCR and structured NLP extraction to pull diagnosis codes, past treatments, and therapy durations into standardized FHIR-compliant fields.",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col antialiased">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center shadow-md">
              <ShieldAlert className="w-5 h-5 text-white" strokeWidth={2.2} />
            </div>
            <div>
              <span className="text-base font-bold text-slate-900 tracking-tight">CareAuth <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest ml-0.5">AI</span></span>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider -mt-1">Enterprise Prior Auth</p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            <a href="#platform" className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors">Platform</a>
            <a href="#how-it-works" className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors">How It Works</a>
            <a href="#capabilities" className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors">AI Capabilities</a>
            <a href="#security" className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors">Security</a>
            <a href="#faq" className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors">FAQ</a>
          </nav>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <button
                onClick={handleGetStarted}
                className="btn-primary"
              >
                Go to Dashboard <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <>
                <Link to="/login" className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-2 rounded-lg">Sign In</Link>
                <button
                  onClick={handleGetStarted}
                  className="btn-primary"
                >
                  Get Started
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-white border-b border-slate-200 py-16 lg:py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px] opacity-40 -z-10" />
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              Production-Grade Enterprise Platform
            </div>
            <div className="space-y-3">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-tight">
                Smarter Prior Authorization.<br />
                <span className="text-blue-600">Better Clinical Decisions.</span>
              </h1>
              <p className="text-slate-500 text-base lg:text-lg max-w-xl leading-relaxed">
                CareAuth AI helps healthcare organizations streamline prior authorization through intelligent document processing, clinical triage, policy evidence retrieval, and human-centered review workflows.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button onClick={handleGetStarted} className="btn-primary text-sm px-6 py-2.5">
                Get Started
              </button>
              <button onClick={() => navigate("/login")} className="btn-secondary text-sm px-6 py-2.5">
                Sign In
              </button>
            </div>
          </div>

          <div className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-xl p-6 shadow-sm">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Enterprise Authorization Workflow</h3>
            <div className="space-y-3">
              {[
                { label: "Request Submitted", desc: "Structured patient clinical ingestion", color: "bg-blue-600 text-white" },
                { label: "Document Processing", desc: "Advanced file format parsing & OCR", color: "bg-slate-100 text-slate-700 border border-slate-200" },
                { label: "Clinical Extraction", desc: "ICD-10 / CPT clinical mapping", color: "bg-slate-100 text-slate-700 border border-slate-200" },
                { label: "Policy Matching", desc: "Vector search checks policies & guidelines", color: "bg-slate-100 text-slate-700 border border-slate-200" },
                { label: "AI Triage Score", desc: "ML model scores request complexity", color: "bg-slate-100 text-slate-700 border border-slate-200" },
                { label: "Human Review", desc: "Clinician reviews matched policy evidence", color: "bg-slate-100 text-slate-700 border border-slate-200" },
                { label: "Audited Decision", desc: "Final determination logged for compliance", color: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
              ].map((step, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500 shrink-0">
                    {idx + 1}
                  </div>
                  <div className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between ${step.color}`}>
                    <span>{step.label}</span>
                    <span className="text-[10px] font-normal opacity-85">{step.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Capabilities Section */}
      <section id="capabilities" className="py-16 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Advanced AI Capabilities</h2>
            <p className="text-sm text-slate-500 mt-2">Built-in clinical engines designed specifically for healthcare administrators and clinical review operations.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {capabilities.map((cap, idx) => (
              <div key={idx} className="p-6 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-white transition-all shadow-sm">
                <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center mb-4">
                  <cap.icon className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 mb-2">{cap.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{cap.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="py-16 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Clinical Processing Flow</h2>
            <p className="text-sm text-slate-500 mt-2">A clean, transparent, and step-by-step prior authorization evaluation process.</p>
          </div>

          {/* Desktop flow chart */}
          <div className="hidden lg:grid grid-cols-5 gap-4 relative">
            {workflowSteps.map((step, idx) => (
              <div key={idx} className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm relative">
                <div className="text-xs font-bold text-blue-600 mb-1">{step.num}</div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">{step.name}</h4>
                <p className="text-xs text-slate-500 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>

          {/* Mobile vertical flow */}
          <div className="lg:hidden space-y-4">
            {workflowSteps.map((step, idx) => (
              <div key={idx} className="flex gap-4 bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
                <div className="text-xs font-extrabold text-blue-600 shrink-0">{step.num}</div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1">{step.name}</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Role Selection Section */}
      <section id="platform" className="py-16 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Access Your Portal Workspace</h2>
            <p className="text-sm text-slate-500 mt-2">Log in with role-based access control systems optimized for your workflow.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Provider Card */}
            <div className="bg-slate-50/50 border border-slate-200 rounded-lg p-8 flex flex-col justify-between shadow-sm">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Healthcare Provider</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Submit treatment authorization requests, upload medical charts for OCR text extraction, resolve document checklist items, and track approval decisions in real time.
                </p>
              </div>
              <button onClick={() => handlePortalRedirect("provider")} className="btn-primary mt-6 text-xs justify-center w-full">
                Enter Provider Portal <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Reviewer Card */}
            <div className="bg-slate-50/50 border border-slate-200 rounded-lg p-8 flex flex-col justify-between shadow-sm">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-lg bg-teal-50 border border-teal-200 text-teal-600 flex items-center justify-center">
                  <Shield className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Payer Reviewer</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Manage the Clinical Review Queue, inspect RAG policy matched evidence citations, interact with the Policy AI chat assistant, and record audited approval determinations.
                </p>
              </div>
              <button onClick={() => handlePortalRedirect("reviewer")} className="btn-secondary mt-6 text-xs justify-center w-full border-slate-200">
                Enter Reviewer Portal <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section id="security" className="py-16 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Enterprise Compliance & Safety</h2>
            <p className="text-sm text-slate-500 mt-2">Ensuring secure operations and granular tracking for medical necessity evaluations.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { title: "Role-Based Access Control", desc: "Strict division of clinical privileges between hospital and insurance workflows." },
              { title: "Controlled Workflows", desc: "Determinations are grounded strictly on explicit policy rulesets with zero hallucination." },
              { title: "Audited Decisions & Logs", desc: "Granular system logging captures every event, recommendation, rationale, and login timestamp." },
            ].map((item, idx) => (
              <div key={idx} className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
                <div className="w-8 h-8 rounded bg-slate-50 border border-slate-100 flex items-center justify-center mb-3">
                  <Lock className="w-4 h-4 text-slate-600" />
                </div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">{item.title}</h4>
                <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-16 bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Frequently Asked Questions</h2>
            <p className="text-sm text-slate-500 mt-2">Details on how deterministic rules, RAG evidence, and triage queues run together.</p>
          </div>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50/20">
                <button
                  onClick={() => toggleFaq(i)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 transition-colors"
                >
                  <span className="text-xs font-bold text-slate-800">{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${activeFaq === i ? "rotate-180" : ""}`} />
                </button>
                {activeFaq === i && (
                  <div className="p-4 border-t border-slate-200 bg-white text-xs text-slate-500 leading-relaxed">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 mt-auto border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded bg-blue-600 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4 text-white" strokeWidth={2.2} />
            </div>
            <span className="text-xs font-bold text-white tracking-tight">CareAuth AI — Enterprise Decision Support</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-slate-500">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Controlled Audits</a>
            <span>© 2026 CareAuth AI Inc.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
