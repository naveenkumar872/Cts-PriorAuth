import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import type { UserRole } from "@/lib/roles";
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
  FileCheck,
  User,
  Building2,
  Phone,
  Stethoscope,
  Cpu,
  ShieldCheck,
  ChevronRight,
  ArrowRight
} from "lucide-react";

export default function SignUp() {
  const { registerUser, isLoading, user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const state = location.state as { defaultRole?: UserRole } | null;
  const [selectedRole, setSelectedRole] = useState<UserRole>(state?.defaultRole || "provider");

  const handleGoogleSignUp = () => {
    const apiHost = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/api\/v1\/?$/, "") || "http://localhost:8000";
    window.location.href = `${apiHost}/google/login?role=${selectedRole}`;
  };

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [organization, setOrganization] = useState("");
  const [contact, setContact] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState("");

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === "provider") {
        navigate("/provider/dashboard", { replace: true });
      } else if (user.role === "reviewer") {
        navigate("/reviewer/dashboard", { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!name.trim()) {
      setFormError("Full name is required");
      return;
    }
    if (!email.trim()) {
      setFormError("Email address is required");
      return;
    }
    if (!password) {
      setFormError("Password is required");
      return;
    }
    if (password.length < 6) {
      setFormError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      setFormError("Passwords do not match");
      return;
    }

    try {
      await registerUser({
        name: name.trim(),
        email: email.trim(),
        password,
        role: selectedRole,
        organization: organization.trim(),
        contact: contact.trim(),
      });
      navigate(selectedRole === "provider" ? "/provider/dashboard" : "/reviewer/dashboard", { replace: true });
    } catch (err: any) {
      setFormError(err.message || "Registration failed. Please try again.");
    }
  };

  const capabilities = [
    {
      title: "Prior Authorization Processing",
      desc: "Submit and manage authorization requests through a structured workflow.",
      icon: FileCheck,
    },
    {
      title: "Policy-Based Evaluation",
      desc: "Evaluate requests using configurable coverage and medical-necessity rules.",
      icon: Cpu,
    },
    {
      title: "Intelligent Review",
      desc: "Surface complex cases with supporting policy evidence for human review.",
      icon: ShieldCheck,
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] font-sans flex flex-col justify-between antialiased">
      {/* ── 1. HEADER (LEFT: BACK TO HOME, RIGHT: PRIORIS LOGO) ──────────── */}
      <header className="w-full bg-white border-b border-[#E2E8F0] shadow-xs shrink-0">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 h-20 flex items-center justify-between">
          {/* Back to Home Button (Left) */}
          <button
            onClick={() => navigate("/")}
            className="py-2 px-4 rounded-lg bg-[#F8FAFC] hover:bg-slate-100 text-[#0F172A] font-bold text-xs sm:text-sm transition-colors border border-[#E2E8F0]"
          >
            ← Back to Home
          </button>

          {/* Logo & Identity (Right) */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
            <div className="w-10 h-10 rounded-xl bg-[#2563EB] flex items-center justify-center text-white shadow-md shadow-blue-600/20 shrink-0">
              <FileCheck className="w-5.5 h-5.5" />
            </div>
            <span className="text-xl sm:text-2xl font-black text-[#0F172A] tracking-tight">
              Prior<span className="text-[#2563EB]">is</span>
            </span>
          </div>
        </div>
      </header>

      {/* ── 2. MAIN REGISTRATION AREA (CENTERED 2-COLUMN CONTAINER) ─────── */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 bg-white rounded-2xl border border-[#E2E8F0] shadow-xl overflow-hidden my-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
          
          {/* LEFT SIDE — PRODUCT INTRODUCTION */}
          <div className="lg:col-span-5 bg-[#F8FAFC] border-b lg:border-b-0 lg:border-r border-[#E2E8F0] p-6 lg:p-8 flex flex-col justify-between text-[#0F172A]">
            <div className="space-y-6">
              {/* Product Badge & Title */}
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EFF6FF] text-[#2563EB] text-[11px] font-extrabold uppercase tracking-wider border border-blue-200">
                  PRIORIS ACCOUNT REGISTRATION
                </div>
                <h2 className="text-xl lg:text-2xl font-extrabold text-[#0F172A] tracking-tight leading-snug">
                  Join Prioris Workspace
                </h2>
                <p className="text-xs text-[#475569] leading-relaxed">
                  AI-assisted prior authorization processing for healthcare providers and insurance payers.
                </p>
              </div>

              {/* 3 Capability Items */}
              <div className="space-y-3.5 pt-1">
                {capabilities.map((cap, i) => {
                  const Icon = cap.icon;
                  return (
                    <div key={i} className="flex items-start gap-3 p-3.5 rounded-xl bg-white border border-[#E2E8F0] shadow-2xs">
                      <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center shrink-0 border border-blue-100 mt-0.5">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-extrabold text-[#0F172A]">{cap.title}</h4>
                        <p className="text-[11px] text-[#475569] leading-snug mt-0.5">{cap.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Subtle Healthcare Data Workflow Visual */}
              <div className="p-3.5 rounded-xl bg-white border border-[#E2E8F0] space-y-2 shadow-2xs">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#475569] text-center">
                  Digital Authorization Workflow
                </div>
                <div className="flex items-center justify-between text-[10px] font-bold text-[#0F172A] pt-1">
                  {["Provider Request", "Authorization Platform", "Policy Rules", "Review"].map((step, idx, arr) => (
                    <div key={step} className="flex items-center gap-1">
                      <span className="px-1.5 py-0.5 rounded text-[#2563EB] bg-[#EFF6FF] font-semibold border border-blue-100">
                        {step}
                      </span>
                      {idx < arr.length - 1 && (
                        <ChevronRight className="w-3 h-3 text-slate-300 shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-[#E2E8F0] text-xs text-[#475569] mt-6">
              Already have an account?{" "}
              <Link to="/login" className="text-[#2563EB] font-bold hover:underline">
                Sign In →
              </Link>
            </div>
          </div>

          {/* RIGHT SIDE — ACCOUNT REGISTRATION FORM */}
          <div className="lg:col-span-7 p-6 sm:p-8 lg:p-10 flex flex-col justify-center bg-white">
            <div className="mb-5 space-y-4">
              <div>
                <h1 className="text-2xl font-extrabold text-[#0F172A] tracking-tight">Create Your Prioris Account</h1>
                <p className="text-xs text-[#475569] mt-1">
                  Select your role and enter your organization details.
                </p>
              </div>

              {/* Role Selector Tabs */}
              <div className="grid grid-cols-2 gap-2 p-1.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setSelectedRole("provider")}
                  className={`py-2.5 px-3 rounded-lg text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    selectedRole === "provider"
                      ? "bg-[#0F9F8F] text-white shadow-xs"
                      : "text-[#475569] hover:bg-slate-200/60"
                  }`}
                >
                  <Stethoscope className="w-4 h-4" />
                  <span>Healthcare Provider</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedRole("reviewer")}
                  className={`py-2.5 px-3 rounded-lg text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    selectedRole === "reviewer"
                      ? "bg-[#2563EB] text-white shadow-xs"
                      : "text-[#475569] hover:bg-slate-200/60"
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  <span>Insurance Payer</span>
                </button>
              </div>
            </div>

            {/* Dynamic Role Description */}
            <p className="text-xs text-[#475569] mb-4 font-medium italic">
              {selectedRole === "provider"
                ? "Register your healthcare organization to submit and track prior authorization requests."
                : "Register your payer organization to evaluate requests, manage policies, and review complex cases."}
            </p>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Full Name */}
              <div>
                <label className="text-xs font-bold text-[#0F172A] mb-1 block">FULL NAME</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm border border-[#E2E8F0] rounded-xl focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-all bg-white"
                    required
                  />
                </div>
              </div>

              {/* Email Address */}
              <div>
                <label className="text-xs font-bold text-[#0F172A] mb-1 block">EMAIL ADDRESS</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@organization.com"
                    className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm border border-[#E2E8F0] rounded-xl focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-all bg-white"
                    required
                  />
                </div>
              </div>

              {/* Organization & Phone Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#0F172A] mb-1 block">
                    {selectedRole === "provider" ? "ORGANIZATION / FACILITY" : "INSURANCE ORGANIZATION"}
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={organization}
                      onChange={(e) => setOrganization(e.target.value)}
                      placeholder={selectedRole === "provider" ? "Facility name" : "Insurance organization name"}
                      className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm border border-[#E2E8F0] rounded-xl focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-all bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#0F172A] mb-1 block">CONTACT PHONE</label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                      placeholder="+1 XXX XXX XXXX"
                      className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm border border-[#E2E8F0] rounded-xl focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-all bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Passwords Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#0F172A] mb-1 block">PASSWORD</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm border border-[#E2E8F0] rounded-xl focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-all bg-white"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#0F172A] mb-1 block">CONFIRM PASSWORD</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm border border-[#E2E8F0] rounded-xl focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-all bg-white"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Error Banner */}
              {formError && (
                <div className="flex gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-rose-800 font-semibold">{formError}</p>
                </div>
              )}

              {/* Primary Role-Aware Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-3 px-5 rounded-xl font-extrabold text-xs sm:text-sm text-white shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 mt-2 ${
                  selectedRole === "provider"
                    ? "bg-[#0F9F8F] hover:bg-teal-700 shadow-teal-600/20"
                    : "bg-[#2563EB] hover:bg-blue-700 shadow-blue-600/20"
                }`}
              >
                <span>
                  {isLoading
                    ? "Creating Account..."
                    : selectedRole === "provider"
                    ? "Create Provider Account"
                    : "Create Payer Account"}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* Divider */}
              <div className="relative my-3">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#E2E8F0]" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase font-extrabold tracking-wider">
                  <span className="bg-white px-3 text-slate-400">Or continue with</span>
                </div>
              </div>

              {/* Google Sign-In Button */}
              <button
                type="button"
                onClick={handleGoogleSignUp}
                className="w-full py-2.5 px-4 rounded-xl border border-[#E2E8F0] hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-extrabold text-xs transition-all shadow-2xs flex items-center justify-center gap-3 cursor-pointer"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Sign up with Google</span>
              </button>
            </form>

            <div className="mt-5 text-center text-xs text-[#475569]">
              Already have an account?{" "}
              <Link to="/login" className="font-extrabold text-[#2563EB] hover:underline">
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* ── 3. MINIMAL FOOTER ────────────────────────────────────────────── */}
      <footer className="w-full text-center py-4 text-xs text-slate-400 border-t border-[#E2E8F0] bg-white shrink-0">
        Prioris · Prior Authorization & Intelligent Clinical Triage
      </footer>
    </div>
  );
}
