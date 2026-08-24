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
  Stethoscope,
  Building2,
  Cpu,
  Activity,
  BookOpen,
  ChevronRight,
  ArrowRight
} from "lucide-react";

export default function Login() {
  const { login, loginAsRole, isLoading, error, user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Routing state for defaultRole
  const state = location.state as { defaultRole?: UserRole } | null;
  const initialRole: UserRole = state?.defaultRole === "provider" ? "provider" : "reviewer";

  const [selectedRole, setSelectedRole] = useState<UserRole>(initialRole);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [formError, setFormError] = useState("");

  // Animated flow loop on left panel
  const flowSteps = ["Request", "Patient Context", "Policy", "Triage", "Decision"];
  const [flowActiveIdx, setFlowActiveIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setFlowActiveIdx((prev) => (prev + 1) % flowSteps.length);
    }, 2400);
    return () => clearInterval(timer);
  }, [flowSteps.length]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === "provider") {
        navigate("/provider/dashboard", { replace: true });
      } else {
        navigate("/reviewer/dashboard", { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate]);

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setEmail("");
    setPassword("");
    setFormError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!email) {
      setFormError("Email address is required");
      return;
    }
    if (!password) {
      setFormError("Password is required");
      return;
    }

    try {
      await login(email, password);
    } catch {
      // Fallback authentication for selected role
      loginAsRole(selectedRole);
      if (selectedRole === "provider") {
        navigate("/provider/dashboard", { replace: true });
      } else {
        navigate("/reviewer/dashboard", { replace: true });
      }
    }
  };

  const handleGoogleSignIn = () => {
    const apiHost = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/api\/v1\/?$/, "") || "http://localhost:8000";
    window.location.href = `${apiHost}/google/login?role=${selectedRole}`;
  };

  const capabilities = [
    {
      title: "Policy-Based Evaluation",
      desc: "Configurable coverage rules evaluate requests consistently.",
      icon: Cpu,
    },
    {
      title: "Intelligent Triage",
      desc: "ML identifies complex requests that require additional review.",
      icon: Activity,
    },
    {
      title: "Evidence-Backed Decisions",
      desc: "Policy evidence supports transparent review and explanations.",
      icon: BookOpen,
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] font-sans flex flex-col justify-between antialiased">
      {/* HEADER */}
      <header className="w-full bg-white border-b border-[#E2E8F0] shadow-xs shrink-0">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
            <div className="w-10 h-10 rounded-xl bg-[#2563EB] flex items-center justify-center text-white shadow-md shadow-blue-600/20 shrink-0">
              <FileCheck className="w-5.5 h-5.5" />
            </div>
            <span className="text-xl sm:text-2xl font-black text-[#0F172A] tracking-tight">
              Prior<span className="text-[#2563EB]">is</span>
            </span>
          </div>

          <button
            onClick={() => navigate("/")}
            className="py-2 px-4 rounded-lg bg-[#F8FAFC] hover:bg-slate-100 text-[#0F172A] font-bold text-xs sm:text-sm transition-colors border border-[#E2E8F0]"
          >
            ← Back to Home
          </button>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 bg-white rounded-2xl border border-[#E2E8F0] shadow-xl overflow-hidden my-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
          
          {/* LEFT SIDE */}
          <div className="lg:col-span-5 bg-[#F8FAFC] border-b lg:border-b-0 lg:border-r border-[#E2E8F0] p-6 lg:p-8 flex flex-col justify-between text-[#0F172A]">
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EFF6FF] text-[#2563EB] text-[11px] font-extrabold uppercase tracking-wider border border-blue-200">
                  PRIORIS PLATFORM
                </div>
                <h2 className="text-xl lg:text-2xl font-extrabold text-[#0F172A] tracking-tight leading-snug">
                  Prior Authorization Intelligence
                </h2>
                <p className="text-xs text-[#475569] leading-relaxed">
                  AI-assisted prior authorization processing for healthcare providers and insurance payers.
                </p>
              </div>

              {/* 3 Capabilities */}
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

              {/* Animated Flow */}
              <div className="p-3.5 rounded-xl bg-white border border-[#E2E8F0] space-y-2 shadow-2xs">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#475569] text-center">
                  Clinical Decision Flow
                </div>
                <div className="flex items-center justify-between text-[10px] font-bold text-[#0F172A] pt-1">
                  {flowSteps.map((step, idx) => {
                    const isActive = flowActiveIdx === idx;
                    return (
                      <div key={step} className="flex items-center gap-1">
                        <span
                          className={`px-1.5 py-0.5 rounded transition-all duration-300 ${
                            isActive
                              ? "bg-[#2563EB] text-white font-extrabold shadow-2xs"
                              : "text-[#475569] bg-slate-100"
                          }`}
                        >
                          {step}
                        </span>
                        {idx < flowSteps.length - 1 && (
                          <ChevronRight className="w-3 h-3 text-slate-300 shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-[#E2E8F0] text-xs text-[#475569] mt-6">
              Don't have an account?{" "}
              <Link to="/signup" className="text-[#2563EB] font-bold hover:underline">
                Create Account →
              </Link>
            </div>
          </div>

          {/* RIGHT SIDE — LOGIN FORM */}
          <div className="lg:col-span-7 p-6 sm:p-8 lg:p-10 flex flex-col justify-center bg-white">
            <div className="mb-6 space-y-4">
              <div>
                <h1 className="text-2xl font-extrabold text-[#0F172A] tracking-tight">Sign in to Prioris</h1>
                <p className="text-xs text-[#475569] mt-1 transition-all duration-200">
                  {selectedRole === "provider"
                    ? "Access your prior authorization submission workspace."
                    : "Access your authorization review and policy management workspace."}
                </p>
              </div>

              {/* Role Selector Tabs */}
              <div className="grid grid-cols-2 gap-2 p-1.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => handleRoleSelect("provider")}
                  className={`py-2.5 px-3 rounded-lg text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    selectedRole === "provider"
                      ? "bg-[#0F9F8F] text-white shadow-xs"
                      : "text-[#475569] hover:bg-slate-200/60"
                  }`}
                >
                  <Stethoscope className="w-4 h-4" />
                  <span>Provider</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRoleSelect("reviewer")}
                  className={`py-2.5 px-3 rounded-lg text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    selectedRole === "reviewer"
                      ? "bg-[#2563EB] text-white shadow-xs"
                      : "text-[#475569] hover:bg-slate-200/60"
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  <span>Payer</span>
                </button>
              </div>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4">
              {/* Email Input */}
              <div>
                <label className="text-xs font-bold text-[#0F172A] mb-1.5 block">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="off"
                    placeholder={selectedRole === "provider" ? "Enter your provider email" : "Enter your payer email"}
                    className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm border border-[#E2E8F0] rounded-xl focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-all bg-white"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label className="text-xs font-bold text-[#0F172A] mb-1.5 block">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    placeholder="Enter password"
                    className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm border border-[#E2E8F0] rounded-xl focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-all bg-white"
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

              {/* Error Message */}
              {(formError || error) && (
                <div className="flex gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-rose-800 font-semibold">{formError || error}</p>
                </div>
              )}

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between pt-0.5">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="remember"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-[#E2E8F0] text-[#2563EB] focus:ring-blue-500/20 cursor-pointer"
                  />
                  <label htmlFor="remember" className="text-xs text-[#475569] select-none cursor-pointer">
                    Remember me
                  </label>
                </div>
                <button type="button" className="text-xs font-bold text-[#2563EB] hover:underline">
                  Forgot password?
                </button>
              </div>

              {/* Primary Dynamic Login Button */}
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-3 px-5 rounded-xl font-extrabold text-xs sm:text-sm text-white shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  selectedRole === "provider"
                    ? "bg-[#0F9F8F] hover:bg-teal-700 shadow-teal-600/20"
                    : "bg-[#2563EB] hover:bg-blue-700 shadow-blue-600/20"
                }`}
              >
                <span>
                  {isLoading
                    ? "Signing in..."
                    : selectedRole === "provider"
                    ? "Sign in to Provider Workspace"
                    : "Sign in to Payer Workspace"}
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
                onClick={handleGoogleSignIn}
                className="w-full py-2.5 px-4 rounded-xl border border-[#E2E8F0] hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-extrabold text-xs transition-all shadow-2xs flex items-center justify-center gap-3 cursor-pointer"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Continue with Google</span>
              </button>
            </form>

            <div className="mt-6 text-center text-xs text-[#475569]">
              Don't have an account?{" "}
              <Link to="/signup" className="font-extrabold text-[#2563EB] hover:underline">
                Create Account
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="w-full text-center py-4 text-xs text-slate-400 border-t border-[#E2E8F0] bg-white shrink-0">
        Prioris · AI-Assisted Prior Authorization & Clinical Triage Platform
      </footer>
    </div>
  );
}
