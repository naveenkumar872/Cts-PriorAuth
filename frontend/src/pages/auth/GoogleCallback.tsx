import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import type { UserProfile, UserRole } from "@/lib/roles";
import { ShieldAlert, AlertCircle, RefreshCw } from "lucide-react";

export default function GoogleCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setAuthUser } = useAuth();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const processCallback = async () => {
      const error = searchParams.get("error");
      if (error) {
        setErrorMsg(decodeURIComponent(error));
        return;
      }

      const token = searchParams.get("token");
      const id = searchParams.get("id");
      const name = searchParams.get("name");
      const email = searchParams.get("email");
      const roleParam = searchParams.get("role");

      if (token && email) {
        const userRole: UserRole = roleParam === "provider" ? "provider" : "reviewer";
        const profile: UserProfile = {
          id: id || "google-user-id",
          name: name ? decodeURIComponent(name) : email.split("@")[0],
          email: decodeURIComponent(email),
          role: userRole,
          organization: "Google Workspace",
          contact: "",
          avatar: "",
        };

        setAuthUser(profile, token);
        navigate(userRole === "provider" ? "/provider/dashboard" : "/reviewer/dashboard", { replace: true });
        return;
      }

      // If backend passed authorization code to frontend instead of backend redirecting
      const code = searchParams.get("code");
      const state = searchParams.get("state");

      if (code) {
        try {
          const apiHost = `http://${window.location.hostname}:8000`;
          const resp = await fetch(`${apiHost}/google/callback`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code, role: state || "reviewer" }),
          });


          if (!resp.ok) {
            const errData = await resp.json().catch(() => ({ detail: "OAuth authentication failed" }));
            throw new Error(errData.detail || "Google authentication failed");
          }

          const data = await resp.json();
          const userRole: UserRole = data.user.role === "provider" ? "provider" : "reviewer";
          const profile: UserProfile = {
            id: data.user.id,
            name: data.user.name,
            email: data.user.email,
            role: userRole,
            organization: data.user.organization || "Google Workspace",
            contact: data.user.contact || "",
          };

          setAuthUser(profile, data.token);
          navigate(userRole === "provider" ? "/provider/dashboard" : "/reviewer/dashboard", { replace: true });
        } catch (err: any) {
          setErrorMsg(err.message || "Failed to complete Google Sign-In");
        }
        return;
      }

      setErrorMsg("Invalid callback parameters received from Google");
    };

    processCallback();
  }, [searchParams, navigate, setAuthUser]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between antialiased">
      <header className="w-full px-6 py-4 flex items-center justify-between bg-white border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded bg-blue-600 flex items-center justify-center shadow-md">
            <ShieldAlert className="w-4.5 h-4.5 text-white" strokeWidth={2.2} />
          </div>
          <span className="text-sm font-bold text-slate-800 tracking-tight">
            CareAuth <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest ml-0.5">AI</span>
          </span>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="max-w-md w-full bg-white rounded-lg border border-slate-200 p-8 shadow-sm text-center">
          {errorMsg ? (
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h2 className="text-base font-bold text-slate-900">Google Authentication Failed</h2>
              <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 p-3 rounded text-left">
                {errorMsg}
              </p>
              <button
                onClick={() => navigate("/login", { replace: true })}
                className="btn-primary w-full justify-center py-2 text-xs"
              >
                Return to Sign In
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto animate-spin">
                <RefreshCw className="w-6 h-6" />
              </div>
              <h2 className="text-base font-bold text-slate-900">Authenticating with Google...</h2>
              <p className="text-xs text-slate-500">
                Verifying credentials and completing workspace sign-in. Please wait.
              </p>
            </div>
          )}
        </div>
      </div>

      <footer className="w-full text-center py-4 text-[10px] text-slate-400 border-t border-slate-200 bg-white">
        Prioris · Google OAuth Authorization Callback
      </footer>
    </div>
  );
}
