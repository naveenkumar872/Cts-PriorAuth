import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
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

  const handleGoogleLogin = () => {
    const role = defaultRole || "reviewer";
    const apiHost = `http://${window.location.hostname}:8000`;
    window.location.href = `${apiHost}/google/login?role=${role}`;
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

              {/* Google OAuth Button */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors shadow-sm mt-3 cursor-pointer"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Sign in with Google</span>
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
                  🛡️ Payer Login
                </button>
              </div>
            </div>

            <div className="mt-6 text-center text-xs text-slate-500">
              Don't have an account?{" "}
              <Link to="/signup" className="font-semibold text-blue-600 hover:text-blue-700">
                Create Account (Sign Up)
              </Link>
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
