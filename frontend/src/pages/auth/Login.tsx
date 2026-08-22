import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Lock, Mail, Eye, EyeOff, AlertCircle, ShieldAlert } from "lucide-react";

export default function Login() {
  const { login, loginAsRole, isLoading, error, user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [formError, setFormError] = useState("");

  // Check if defaultRole is passed via routing state
  const state = location.state as { defaultRole?: "provider" | "reviewer" } | null;
  const defaultRole = state?.defaultRole;

  // Redirect if already authenticated
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

    if (!email) {
      setFormError("Email is required");
      return;
    }
    if (!password) {
      setFormError("Password is required");
      return;
    }

    try {
      await login(email, password);
    } catch {
      setFormError("Invalid email or password");
    }
  };

  const handleProviderLogin = () => {
    loginAsRole("provider");
    navigate("/provider/dashboard", { replace: true });
  };

  const handleReviewerLogin = () => {
    loginAsRole("reviewer");
    navigate("/reviewer/dashboard", { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between antialiased">
      {/* Top Header Bar */}
      <header className="w-full px-6 py-4 flex items-center justify-between bg-white border-b border-slate-200">
        <button
          onClick={() => navigate("/")}
          className="btn-secondary px-3 py-1.5 text-xs shadow-none border-slate-200"
        >
          ← Back to Home
        </button>

        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate("/")}>
          <div className="w-7 h-7 rounded bg-blue-600 flex items-center justify-center shadow-md">
            <ShieldAlert className="w-4.5 h-4.5 text-white" strokeWidth={2.2} />
          </div>
          <span className="text-sm font-bold text-slate-800 tracking-tight">CareAuth <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest ml-0.5">AI</span></span>
        </div>
      </header>

      {/* Main Login Area */}
      <div className="flex-1 flex items-center justify-center px-4 py-8 md:py-12">
        <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-2 bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          
          {/* Left Panel - Feature Highlights */}
          <div className="bg-slate-900 p-8 lg:p-10 flex flex-col justify-between text-slate-300">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-4">
                Enterprise Portal Access
              </div>
              <h2 className="text-xl lg:text-2xl font-bold text-white tracking-tight leading-tight mb-3">
                Prior Authorization Decision Support
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed mb-6">
                Evaluating medical necessity pathways using clinical natural language extraction, Weaviate vector policies, and deterministic rule engines.
              </p>
            </div>

            <div className="space-y-3.5">
              {[
                { title: "Clinical Rule Engine", desc: "100% precise evaluation checks grounded strictly on policies." },
                { title: "Queue Triage Model", desc: "Predicts request complexity to surface critical review workloads." },
                { title: "Compliance Audit Trail", desc: "Granular execution records logged for health plan accountability." }
              ].map((f, i) => (
                <div key={i} className="flex gap-3 items-start bg-slate-850/50 border border-slate-800 p-3 rounded-lg">
                  <div className="w-5 h-5 rounded bg-blue-600 text-white flex items-center justify-center shrink-0 text-[10px] font-bold">✓</div>
                  <div>
                    <p className="text-white font-bold text-xs">{f.title}</p>
                    <p className="text-slate-400 text-[10px] mt-0.5 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Panel - Login Form */}
          <div className="p-8 lg:p-10 flex flex-col justify-center bg-white">
            <div className="mb-6">
              <h1 className="text-lg font-bold text-slate-900">Sign In</h1>
              <p className="text-xs text-slate-500 mt-1">
                {defaultRole === "provider" 
                  ? "Access your hospital prior auth submission workspace." 
                  : defaultRole === "reviewer" 
                  ? "Access your payer clinical review operations center."
                  : "Sign in to enter your enterprise workspace."}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Input */}
              <div>
                <label className="label">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="clinical.admin@demo.com"
                    className="input pl-9 text-xs"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input pl-9 pr-9 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {(formError || error) && (
                <div className="flex gap-2.5 p-3 rounded bg-rose-50 border border-rose-200">
                  <AlertCircle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                  <p className="text-xs text-rose-750">{formError || error}</p>
                </div>
              )}

              {/* Remember Me */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="remember"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20"
                  />
                  <label htmlFor="remember" className="text-xs text-slate-500 select-none cursor-pointer">
                    Remember me
                  </label>
                </div>
                <button type="button" className="text-xs font-semibold text-blue-600 hover:text-blue-700">
                  Forgot password?
                </button>
              </div>

              {/* Sign In Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full justify-center py-2.5 text-xs shadow-none mt-2"
              >
                {isLoading ? "Signing in..." : "Sign In to Workspace"}
              </button>
            </form>

            <div className="my-6 flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-200"></div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Demo Workspace</span>
              <div className="flex-1 h-px bg-slate-200"></div>
            </div>

            {/* Demo Workspace Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 text-center">1-Click Demo Environments</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleProviderLogin}
                  disabled={isLoading}
                  className="btn-secondary py-2 justify-center text-xs border-slate-200 shadow-none hover:bg-slate-100 bg-white"
                >
                  🏥 Provider Login
                </button>
                <button
                  type="button"
                  onClick={handleReviewerLogin}
                  disabled={isLoading}
                  className="btn-secondary py-2 justify-center text-xs border-slate-200 shadow-none hover:bg-slate-100 bg-white"
                >
                  🛡️ Reviewer Login
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full text-center py-4 text-[10px] text-slate-400 border-t border-slate-200 bg-white">
        Demo Environment · Prior Authorization Clinical Decision Support Platform
      </footer>
    </div>
  );
}
