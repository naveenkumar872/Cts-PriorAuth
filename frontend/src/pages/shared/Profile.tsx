import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  User,
  Building,
  Phone,
  Mail,
  Shield,
  CheckCircle,
  Edit3,
  Lock,
  Eye,
  EyeOff,
  Calendar,
  Award,
  CheckCircle2,
  KeyRound
} from "lucide-react";

const inputClass = "w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all";
const labelClass = "block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5";

export default function Profile() {
  const { user } = useAuth();
  const [editMode, setEditMode] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    name: user?.name ?? "",
    organization: user?.organization ?? "",
    contact: user?.contact ?? "(312) 555-0147",
    specialty: user?.role === "provider" ? "Orthopedic Surgery & Sports Medicine" : "Clinical Review & Utilization Management",
    licenseNumber: user?.role === "provider" ? "IL-MD-984210" : "REV-CERT-4412",
  });

  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [showPw, setShowPw] = useState(false);
  const [pwSaved, setPwSaved] = useState(false);
  const [pwError, setPwError] = useState("");

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setEditMode(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handlePwSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.next !== pwForm.confirm) {
      setPwError("New passwords do not match");
      return;
    }
    if (pwForm.next.length < 8) {
      setPwError("Password must be at least 8 characters");
      return;
    }
    setPwError("");
    setPwSaved(true);
    setPwForm({ current: "", next: "", confirm: "" });
    setTimeout(() => setPwSaved(false), 3000);
  };

  const roleLabel = user?.role === "provider" ? "Healthcare Provider" : "Insurance Reviewer";
  const roleBadgeStyle = user?.role === "provider"
    ? "bg-teal-100 text-teal-800 border-teal-200"
    : "bg-teal-100 text-teal-800 border-teal-200";

  // Password strength calculation
  const getPwStrength = (pw: string) => {
    if (!pw) return 0;
    let score = 0;
    if (pw.length >= 8) score += 30;
    if (/[A-Z]/.test(pw)) score += 25;
    if (/[0-9]/.test(pw)) score += 25;
    if (/[^A-Za-z0-9]/.test(pw)) score += 20;
    return score;
  };

  const pwStrength = getPwStrength(pwForm.next);

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">User Profile</h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage your credentials, organization affiliations, and security settings</p>
      </div>

      {saved && (
        <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm shadow-xs animate-in fade-in">
          <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
          <p className="font-medium">Profile information updated successfully.</p>
        </div>
      )}

      {/* Profile Hero Card */}
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-2xl font-bold">
              {(form.name || user?.name || "U").charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-slate-900">{form.name || user?.name}</h2>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${roleBadgeStyle}`}>
                  {roleLabel}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-605 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <CheckCircle2 className="h-3 w-3" /> Verified
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{user?.email}</p>
              <p className="text-xs text-slate-600 font-medium mt-1 flex items-center gap-1.5">
                <Building className="h-3.5 w-3.5 text-slate-400" /> {form.organization}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setEditMode(e => !e)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-colors shadow-sm"
          >
            <Edit3 className="h-3.5 w-3.5" />
            {editMode ? "Cancel Editing" : "Edit Profile"}
          </button>
        </div>
      </div>

      {/* Personal Information Form */}
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <User className="h-4.5 w-4.5 text-blue-600" />
          <h3 className="text-base font-bold text-slate-900">Personal &amp; Professional Information</h3>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>
                <User className="h-3 w-3 inline mr-1 text-slate-400" /> Full Name
              </label>
              {editMode ? (
                <input
                  className={inputClass}
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  required
                />
              ) : (
                <p className="text-sm font-semibold text-slate-900 bg-slate-50 p-2.5 rounded-lg border border-slate-100">{form.name}</p>
              )}
            </div>

            <div>
              <label className={labelClass}>
                <Mail className="h-3 w-3 inline mr-1 text-slate-400" /> Email Address
              </label>
              <p className="text-sm text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100 font-mono">
                {user?.email}
              </p>
            </div>

            <div className="sm:col-span-2">
              <label className={labelClass}>
                <Building className="h-3 w-3 inline mr-1 text-slate-400" /> Organization / Health System
              </label>
              {editMode ? (
                <input
                  className={inputClass}
                  value={form.organization}
                  onChange={e => setForm(f => ({ ...f, organization: e.target.value }))}
                  required
                />
              ) : (
                <p className="text-sm text-slate-900 bg-slate-50 p-2.5 rounded-lg border border-slate-100">{form.organization}</p>
              )}
            </div>

            <div>
              <label className={labelClass}>
                <Award className="h-3 w-3 inline mr-1 text-slate-400" /> Specialty / Clinical Focus
              </label>
              {editMode ? (
                <input
                  className={inputClass}
                  value={form.specialty}
                  onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))}
                />
              ) : (
                <p className="text-sm text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100">{form.specialty}</p>
              )}
            </div>

            <div>
              <label className={labelClass}>
                <Shield className="h-3 w-3 inline mr-1 text-slate-400" /> License / Registration ID
              </label>
              {editMode ? (
                <input
                  className={inputClass}
                  value={form.licenseNumber}
                  onChange={e => setForm(f => ({ ...f, licenseNumber: e.target.value }))}
                />
              ) : (
                <p className="text-sm text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100 font-mono">{form.licenseNumber}</p>
              )}
            </div>

            <div>
              <label className={labelClass}>
                <Phone className="h-3 w-3 inline mr-1 text-slate-400" /> Direct Contact Phone
              </label>
              {editMode ? (
                <input
                  className={inputClass}
                  value={form.contact}
                  onChange={e => setForm(f => ({ ...f, contact: e.target.value }))}
                />
              ) : (
                <p className="text-sm text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100">{form.contact || "—"}</p>
              )}
            </div>

            <div>
              <label className={labelClass}>
                <Calendar className="h-3 w-3 inline mr-1 text-slate-400" /> Member Since
              </label>
              <p className="text-sm text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100">January 2025</p>
            </div>
          </div>

          {editMode && (
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditMode(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors shadow-sm"
              >
                Save Changes
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Change Password Card */}
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4.5 w-4.5 text-blue-600" />
            <h3 className="text-base font-bold text-slate-900">Security &amp; Password</h3>
          </div>
          <button
            type="button"
            onClick={() => setShowPw(s => !s)}
            className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium"
          >
            {showPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {showPw ? "Hide Passwords" : "Show Passwords"}
          </button>
        </div>

        {pwSaved && (
          <div className="mb-4 flex items-center gap-2.5 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
            <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>Password updated successfully. Next login will require your new credentials.</span>
          </div>
        )}

        {pwError && (
          <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
            {pwError}
          </div>
        )}

        <form onSubmit={handlePwSave} className="space-y-3.5">
          <div>
            <label className={labelClass}>Current Password</label>
            <input
              type={showPw ? "text" : "password"}
              className={inputClass}
              placeholder="Enter current password"
              value={pwForm.current}
              onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className={labelClass}>New Password</label>
              <input
                type={showPw ? "text" : "password"}
                className={inputClass}
                placeholder="Minimum 8 characters"
                value={pwForm.next}
                onChange={e => setPwForm(f => ({ ...f, next: e.target.value }))}
                required
              />
              {pwForm.next && (
                <div className="mt-2">
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        pwStrength >= 80 ? "bg-emerald-500" : pwStrength >= 50 ? "bg-amber-500" : "bg-rose-500"
                      }`}
                      style={{ width: `${pwStrength}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Strength: {pwStrength >= 80 ? "Strong" : pwStrength >= 50 ? "Moderate" : "Weak"}
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className={labelClass}>Confirm New Password</label>
              <input
                type={showPw ? "text" : "password"}
                className={inputClass}
                placeholder="Re-enter new password"
                value={pwForm.confirm}
                onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors shadow-sm"
            >
              Update Password
            </button>
          </div>
        </form>
      </div>

      {/* Role & Permissions Summary */}
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="h-4.5 w-4.5 text-blue-600" />
          <h3 className="text-base font-bold text-slate-900">Role Capabilities &amp; Permissions</h3>
        </div>
        <p className="text-xs text-slate-500 mb-3">
          Your account is configured with <strong>{roleLabel}</strong> privileges:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
            <CheckCircle2 className="h-4 w-4 text-blue-600" />
            <span>Full read/write access to authorization queue</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
            <CheckCircle2 className="h-4 w-4 text-blue-600" />
            <span>AI recommendation review and confidence triage</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
            <CheckCircle2 className="h-4 w-4 text-blue-600" />
            <span>Policy referencing &amp; medical necessity verification</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
            <CheckCircle2 className="h-4 w-4 text-blue-600" />
            <span>Audit trail activity logging &amp; decision export</span>
          </div>
        </div>
      </div>
    </div>
  );
}
