import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  Shield,
  FileText,
  Cpu,
  ArrowRight,
  ChevronRight,
  Database,
  Building2,
  Stethoscope,
  CheckCircle2,
  BookOpen,
  FileCheck,
  Search,
  Activity,
  Briefcase,
  Layers,
  ArrowDown,
  Lock,
  Check,
  Clock,
  Sparkles
} from "lucide-react";

export default function LandingHome() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // 1. Sequential Workflow Stage Loop Animation
  const workflowStages = [
    {
      id: "request",
      title: "Request",
      desc: "Provider submits prior authorization",
      icon: FileText,
    },
    {
      id: "context",
      title: "Patient Context",
      desc: "Patient history and clinical information",
      icon: Database,
    },
    {
      id: "rules",
      title: "Policy Rules",
      desc: "Coverage and medical-necessity rules",
      icon: Cpu,
    },
    {
      id: "triage",
      title: "AI Triage",
      desc: "Complexity and review prioritization",
      icon: Activity,
    },
    {
      id: "decision",
      title: "Decision",
      desc: "Recommendation with policy evidence",
      icon: Shield,
    },
  ];

  const [activeStageIdx, setActiveStageIdx] = useState(0);

  useEffect(() => {
    const stageTimer = setInterval(() => {
      setActiveStageIdx((prev) => (prev + 1) % workflowStages.length);
    }, 2500);
    return () => clearInterval(stageTimer);
  }, [workflowStages.length]);

  const handlePortalRedirect = (role: "provider" | "reviewer") => {
    if (isAuthenticated) {
      if (user?.role === "provider") navigate("/provider/dashboard");
      else navigate("/reviewer/dashboard");
    } else {
      navigate("/login", { state: { defaultRole: role } });
    }
  };

  const howItWorksSteps = [
    {
      step: "01",
      title: "Submit Request",
      desc: "Provider submits patient, procedure, and Policy ID.",
      icon: FileText,
    },
    {
      step: "02",
      title: "Evaluate",
      desc: "The platform retrieves patient context and evaluates configurable coverage rules.",
      icon: Cpu,
    },
    {
      step: "03",
      title: "Support the Decision",
      desc: "RAG retrieves relevant policy evidence and the AI provides grounded reasoning.",
      icon: BookOpen,
    },
    {
      step: "04",
      title: "Triage",
      desc: "Straightforward requests are prioritized for automated processing while complex cases are routed to a nurse for review.",
      icon: Activity,
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] font-sans flex flex-col antialiased">
      {/* ── 1. NAVBAR (CONSISTENT GLOBAL MAX-WIDTH) ────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-[#E2E8F0] shadow-xs">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 h-20 flex items-center justify-between">
          {/* Brand Identity */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
            <div className="w-10 h-10 rounded-xl bg-[#2563EB] flex items-center justify-center text-white shadow-md shadow-blue-600/20">
              <Briefcase className="w-5.5 h-5.5" />
            </div>
            <div>
              <span className="text-xl sm:text-2xl font-black text-[#0F172A] tracking-tight">
                Prior<span className="text-[#2563EB]">is</span>
              </span>
              <span className="hidden md:inline-block ml-3 text-xs font-semibold text-[#475569] border-l border-[#E2E8F0] pl-3">
                AI-Assisted Prior Authorization & Intelligent Clinical Triage
              </span>
            </div>
          </div>

          {/* Action Logins */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => handlePortalRedirect("provider")}
              className="py-2.5 px-4.5 rounded-lg bg-[#F8FAFC] hover:bg-slate-100 text-[#0F172A] font-bold text-sm transition-colors border border-[#E2E8F0]"
            >
              Provider Login
            </button>
            <button
              onClick={() => handlePortalRedirect("reviewer")}
              className="py-2.5 px-4.5 rounded-lg bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-sm shadow-sm transition-colors"
            >
              Payer Login
            </button>
          </div>
        </div>
      </header>

      {/* ── 2. HERO SECTION ──────────────────────────────────────────────── */}
      <section className="pt-10 pb-14 md:pt-14 md:pb-16 bg-white border-b border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 text-center space-y-6">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#EFF6FF] border border-blue-200 text-[#2563EB] text-xs font-bold uppercase tracking-wider mx-auto">
            PRIORIS PLATFORM
          </div>

          {/* Headline (Constrained to 900px) */}
          <h1 className="max-w-[900px] mx-auto text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#0F172A] tracking-tight leading-[1.15]">
            Intelligent Prior Authorization & Clinical Triage
          </h1>

          {/* Subtitle (Constrained to 750px) */}
          <p className="max-w-[750px] mx-auto text-[#475569] text-base sm:text-lg leading-relaxed font-normal">
            Prioris helps insurance teams process prior-authorization requests using patient context, configurable coverage rules, policy evidence, and intelligent case triage.
          </p>

          {/* Abstract Healthcare Data Flow Vector Diagram */}
          <div className="max-w-[800px] mx-auto pt-2 pb-1">
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-4 sm:p-5 shadow-xs">
              <div className="flex items-center justify-between gap-3 text-xs text-[#475569] font-medium">
                <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-[#E2E8F0] shadow-2xs">
                  <Database className="w-4 h-4 text-[#2563EB]" />
                  <span className="font-bold text-[#0F172A]">EHR Context</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-[#E2E8F0] shadow-2xs">
                  <Cpu className="w-4 h-4 text-[#0F9F8F]" />
                  <span className="font-bold text-[#0F172A]">Rule Verification</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-[#E2E8F0] shadow-2xs">
                  <BookOpen className="w-4 h-4 text-[#2563EB]" />
                  <span className="font-bold text-[#0F172A]">Vector RAG</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-[#E2E8F0] shadow-2xs">
                  <Shield className="w-4 h-4 text-emerald-600" />
                  <span className="font-bold text-[#0F172A]">Grounded Triage</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── 3. INTERACTIVE PRIOR-AUTHORIZATION WORKFLOW ───────────────── */}
          <div className="max-w-7xl mx-auto pt-6 space-y-4 text-left">
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-[#475569] text-center mb-4">
              Interactive Prior Authorization Pipeline
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-stretch">
              {workflowStages.map((st, idx) => {
                const isActive = activeStageIdx === idx;
                const Icon = st.icon;
                return (
                  <div key={st.id} className="relative flex flex-col h-full">
                    <div
                      className={`p-5 rounded-2xl border transition-all duration-500 flex flex-col justify-between h-full motion-reduce:transform-none motion-reduce:transition-none ${isActive
                          ? "bg-white border-[#2563EB] shadow-md ring-2 ring-blue-500/15 translate-y-[-2px]"
                          : "bg-white border-[#E2E8F0] hover:border-slate-300"
                        }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs transition-colors ${isActive ? "bg-[#2563EB] text-white" : "bg-[#EFF6FF] text-[#2563EB]"
                              }`}
                          >
                            <Icon className="w-4.5 h-4.5" />
                          </div>
                          {isActive && (
                            <span className="relative flex h-2.5 w-2.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75 motion-reduce:animate-none"></span>
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#2563EB]"></span>
                            </span>
                          )}
                        </div>

                        <div>
                          <div className={`text-sm font-extrabold ${isActive ? "text-[#2563EB]" : "text-[#0F172A]"}`}>
                            {st.title}
                          </div>
                          <p className="text-xs text-[#475569] leading-relaxed mt-1">{st.desc}</p>
                        </div>
                      </div>
                    </div>

                    {/* Progress Connecting Dot */}
                    {idx < workflowStages.length - 1 && (
                      <div className="hidden lg:block absolute -right-2.5 top-1/2 -translate-y-1/2 z-10">
                        <ChevronRight className="w-4 h-4 text-slate-300" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── 4. PROVIDER / PAYER PORTAL CARDS ─────────────────────────── */}
          <div className="max-w-[850px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 text-left">
            {/* Provider Card */}
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-6 sm:p-7 flex flex-col justify-between hover:border-[#0F9F8F] hover:-translate-y-1 hover:shadow-md transition-all duration-300 motion-reduce:transform-none motion-reduce:transition-none h-full group">
              <div className="space-y-3.5 flex-1 flex flex-col">
                <div className="w-10 h-10 rounded-xl bg-teal-100/80 text-[#0F9F8F] flex items-center justify-center border border-teal-200 shrink-0 group-hover:scale-105 transition-transform">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-extrabold text-[#0F172A]">Provider Portal</h3>
                <p className="text-xs sm:text-sm text-[#475569] leading-relaxed flex-1">
                  Submit prior-authorization requests and track their status.
                </p>
              </div>
              <button
                onClick={() => handlePortalRedirect("provider")}
                className="mt-6 w-full h-11 px-4 rounded-xl bg-[#0F9F8F] hover:bg-teal-700 text-white font-extrabold text-sm transition-colors flex items-center justify-center gap-2 shadow-xs shrink-0"
              >
                <span>Provider Login</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            {/* Payer Card */}
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-6 sm:p-7 flex flex-col justify-between hover:border-[#2563EB] hover:-translate-y-1 hover:shadow-md transition-all duration-300 motion-reduce:transform-none motion-reduce:transition-none h-full group">
              <div className="space-y-3.5 flex-1 flex flex-col">
                <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center border border-blue-200 shrink-0 group-hover:scale-105 transition-transform">
                  <Building2 className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-extrabold text-[#0F172A]">Payer Portal</h3>
                <p className="text-xs sm:text-sm text-[#475569] leading-relaxed flex-1">
                  Evaluate requests, manage policies, and review complex cases.
                </p>
              </div>
              <button
                onClick={() => handlePortalRedirect("reviewer")}
                className="mt-6 w-full h-11 px-4 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-extrabold text-sm transition-colors flex items-center justify-center gap-2 shadow-xs shrink-0"
              >
                <span>Payer Login</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. COMPACT "HOW IT WORKS" SECTION ───────────────────────────── */}
      <section className="py-16 bg-[#F8FAFC] border-b border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">
              How It Works
            </h2>
            <p className="text-sm text-[#475569]">
              Simplified platform execution breakdown in four key stages.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {howItWorksSteps.map((s) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.step}
                  className="bg-white border border-[#E2E8F0] rounded-2xl p-6 flex flex-col justify-between shadow-xs hover:shadow-md transition-shadow"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center border border-blue-100">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-mono font-bold text-slate-400">Step {s.step}</span>
                    </div>
                    <h3 className="text-base font-extrabold text-[#0F172A]">{s.title}</h3>
                    <p className="text-xs sm:text-sm text-[#475569] leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 6. PRODUCT VISUAL / REAL ENTERPRISE UI MOCKUP ───────────────── */}
      <section className="py-16 bg-white border-b border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">
              Real-World Clinical Triage Interface
            </h2>
            <p className="text-sm text-[#475569]">
              Polished enterprise review console for insurance clinicians and medical directors.
            </p>
          </div>

          {/* Real Product UI Mockup */}
          <div className="max-w-[950px] mx-auto bg-white rounded-2xl border border-[#E2E8F0] shadow-xl overflow-hidden">
            {/* Header bar */}
            <div className="bg-[#F8FAFC] px-6 py-3.5 border-b border-[#E2E8F0] flex items-center justify-between text-xs text-[#475569] font-mono">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-slate-300" />
                <div className="w-3 h-3 rounded-full bg-slate-300" />
                <div className="w-3 h-3 rounded-full bg-slate-300" />
                <span className="ml-2 font-medium text-slate-600">prioris.medical/payer/triage#POL-MRI-001</span>
              </div>
              <span className="font-bold text-[#2563EB]">Payer Clinical Review</span>
            </div>

            {/* Mockup Body Content */}
            <div className="p-6 sm:p-8 space-y-6">
              {/* Header Details */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#E2E8F0] gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-extrabold text-[#0F172A]">Prior Authorization Request</h3>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold border border-slate-200">#AUTH-9021</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 mt-1 text-xs text-[#475569]">
                    <span><strong>Patient:</strong> John Doe</span>
                    <span>•</span>
                    <span><strong>Procedure:</strong> Lumbar Spine MRI (CPT 72148)</span>
                    <span>•</span>
                    <span><strong>Policy ID:</strong> <code className="text-[#2563EB] font-bold">POL-MRI-001</code></span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-bold uppercase text-slate-400">Recommendation:</span>
                  <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-extrabold border border-emerald-200 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    AUTO PROCESS
                  </span>
                </div>
              </div>

              {/* Grid 2 Columns: Rules & Evidence */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* Coverage Rules Column */}
                <div className="md:col-span-7 space-y-4">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#475569] flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-[#2563EB]" />
                    Coverage Rules Verification
                  </h4>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-50/70 text-emerald-950 border border-emerald-200">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Diagnosis requirement met:</span>
                        <p className="text-emerald-800 text-[11px] mt-0.5">ICD-10 M54.5 (Low back pain &gt; 6 weeks) verified in clinical history.</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-50/70 text-emerald-950 border border-emerald-200">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Prior treatment requirement met:</span>
                        <p className="text-emerald-800 text-[11px] mt-0.5">12 completed sessions of conservative Physical Therapy documented.</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-50/70 text-emerald-950 border border-emerald-200">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Documentation complete:</span>
                        <p className="text-emerald-800 text-[11px] mt-0.5">Physician clinical progress notes & physical exam attached.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Score & RAG Column */}
                <div className="md:col-span-5 space-y-4">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#475569] flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[#2563EB]" />
                    Complexity Score & Policy Evidence
                  </h4>

                  <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#475569]">Complexity Score</span>
                      <span className="text-lg font-black text-[#0F172A]">32 <span className="text-xs text-slate-400 font-normal">/ 100</span></span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full w-[32%]" />
                    </div>
                    <span className="text-[10px] text-emerald-700 font-extrabold block">Low Complexity — Straightforward Fast Track</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-900 text-slate-200 font-mono text-xs space-y-2 shadow-inner">
                    <div className="flex justify-between text-[10px] text-slate-400 border-b border-slate-800 pb-1.5">
                      <span>POL-MRI-001 (Section 3.1)</span>
                      <span className="text-cyan-400 font-bold">0.962 RAG Match</span>
                    </div>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      "MRI Lumbar Spine is indicated after failure of 6 weeks of conservative care with documented radicular signs..."
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
