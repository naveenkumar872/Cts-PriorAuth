import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import type { UserRole } from "@/lib/roles";
import { Lock, Mail, Eye, EyeOff, AlertCircle, Briefcase, User, Building2, Phone, CheckCircle2 } from "lucide-react";

export default function SignUp() {
  const { registerUser, isLoading, user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const state = location.state as { defaultRole?: UserRole } | null;
  const [selectedRole, setSelectedRole] = useState<UserRole>(state?.defaultRole || "provider");

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

  const handleGoogleSignUp = () => {
    const apiHost = `http://${window.location.hostname}:8000`;
    window.location.href = `${apiHost}/google/login?role=${selectedRole}`;
  };

  return (
    <div className="min-h-screen lg:h-screen flex flex-col justify-between overflow-y-auto lg:overflow-hidden bg-slate-50 antialiased font-sans text-base">
      {/* Top Header */}
      <header className="w-full px-6 sm:px-10 py-3 flex items-center justify-between bg-white border-b border-slate-200 shadow-xs shrink-0">
        <button
          onClick={() => navigate("/")}
          className="py-1.5 px-3.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm transition-colors border border-slate-200"
        >
          ← Back to Home
        </button>

        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-600/25">
            <Briefcase className="w-4.5 h-4.5" />
          </div>
          <span className="text-lg font-extrabold text-slate-900 tracking-tight">
            Auth<span className="text-blue-600">AI</span>
          </span>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex items-center justify-center p-3 sm:p-4 overflow-y-auto lg:overflow-hidden">
        <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden my-auto">
          
          {/* Left Panel - Workspace Highlights (Rich Light Blue Gradient) */}
          <div className="lg:col-span-5 bg-gradient-to-br from-blue-100/90 via-blue-50/70 to-slate-50 border-r border-blue-200/90 p-6 lg:p-8 flex flex-col justify-between text-slate-700">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-600 text-white text-[11px] font-extrabold uppercase tracking-wider shadow-xs">
                ENTERPRISE ACCOUNT REGISTRATION
              </div>
              <h2 className="text-xl lg:text-2xl font-extrabold text-slate-900 tracking-tight leading-tight">
                Join AuthAI Workspace
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                Create your verified account to access automated prior authorization triage, clinical policy companion, and transparent decision engines.
              </p>
            </div>

            <div className="space-y-3 my-5">
              {[
                { title: "Healthcare Provider Workspace", desc: "Fast-track prior auth submissions with automated document extraction and status tracking." },
                { title: "Insurance Payer Workspace", desc: "Review queue management, rule evaluation engines, and Weaviate policy RAG retrieval." },
                { title: "HIPAA-Grade Security", desc: "Role-based access controls and complete audit trails for every transaction." }
              ].map((f, i) => (
                <div key={i} className="flex gap-2.5 items-start bg-white/90 border border-blue-200/80 p-3 rounded-xl shadow-xs">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-slate-900 font-extrabold text-xs">{f.title}</p>
                    <p className="text-slate-500 text-[11px] mt-0.5 leading-snug">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-blue-200/80 text-xs text-slate-500">
              Already registered?{" "}
              <Link to="/login" className="text-blue-600 font-bold hover:underline">
                Sign In to your account →
              </Link>
            </div>
          </div>

          {/* Right Panel - Sign Up Form */}
          <div className="lg:col-span-7 p-6 lg:p-8 flex flex-col justify-center bg-white">
            <div className="mb-4">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Create Your Account</h1>
              <p className="text-xs text-slate-500 mt-1">
                Select your role and enter your organization details below.
              </p>
            </div>

            {/* Role Selection Toggle */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl mb-4 border border-slate-200">
              <button
                type="button"
                onClick={() => setSelectedRole("provider")}
                className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  selectedRole === "provider"
                    ? "bg-white text-teal-700 shadow-xs border border-slate-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                🏥 Healthcare Provider
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole("reviewer")}
                className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  selectedRole === "reviewer"
                    ? "bg-white text-blue-700 shadow-xs border border-slate-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                🛡️ Insurance Payer
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Full Name */}
              <div>
                <label className="label text-xs font-bold text-slate-700 mb-1 block">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={selectedRole === "provider" ? "Dr. Sarah Jenkins" : "Michael Vance"}
                    className="input pl-10 py-2 text-xs sm:text-sm border-slate-300 focus:border-blue-600"
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="label text-xs font-bold text-slate-700 mb-1 block">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={selectedRole === "provider" ? "s.jenkins@hospital.org" : "m.vance@payerhealth.com"}
                    className="input pl-10 py-2 text-xs sm:text-sm border-slate-300 focus:border-blue-600"
                    required
                  />
                </div>
              </div>

              {/* Organization & Phone (2 cols) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label text-xs font-bold text-slate-700 mb-1 block">Organization / Facility</label>
                  <div className="relative">
                    <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={organization}
                      onChange={(e) => setOrganization(e.target.value)}
                      placeholder={selectedRole === "provider" ? "City General Hospital" : "BlueShield Health"}
                      className="input pl-10 py-2 text-xs sm:text-sm border-slate-300 focus:border-blue-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="label text-xs font-bold text-slate-700 mb-1 block">Contact Phone</label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                      placeholder="(555) 019-2834"
                      className="input pl-10 py-2 text-xs sm:text-sm border-slate-300 focus:border-blue-600"
                    />
                  </div>
                </div>
              </div>

              {/* Passwords (2 cols) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label text-xs font-bold text-slate-700 mb-1 block">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="input pl-10 pr-10 py-2 text-xs sm:text-sm border-slate-300 focus:border-blue-600"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="label text-xs font-bold text-slate-700 mb-1 block">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="input pl-10 py-2 text-xs sm:text-sm border-slate-300 focus:border-blue-600"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Error Alert */}
              {formError && (
                <div className="flex gap-2 p-2.5 rounded-lg bg-rose-50 border border-rose-200">
                  <AlertCircle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                  <p className="text-xs text-rose-750 font-semibold">{formError}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-blue-600/20 transition-all cursor-pointer mt-1"
              >
                {isLoading ? "Creating Account..." : `Sign Up as ${selectedRole === "provider" ? "Provider" : "Payer"}`}
              </button>

              {/* Google Sign Up */}
              <button
                type="button"
                onClick={handleGoogleSignUp}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs sm:text-sm transition-colors shadow-xs cursor-pointer"
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
                <span>Sign up with Google ({selectedRole === "provider" ? "Provider" : "Payer"})</span>
              </button>
            </form>

            <div className="mt-4 text-center text-xs text-slate-600">
              Already have an account?{" "}
              <Link to="/login" className="font-extrabold text-blue-600 hover:text-blue-700">
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full text-center py-2.5 text-[11px] text-slate-400 border-t border-slate-200 bg-white shrink-0">
        AuthAI · Prior Authorization Clinical Decision Support Platform
      </footer>
    </div>
  );
}
