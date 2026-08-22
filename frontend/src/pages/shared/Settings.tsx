import { useState, useEffect } from "react";
import {
  Moon,
  Sun,
  Bell,
  Shield,
  Monitor,
  Globe,
  CheckCircle,
  Clock,
  Smartphone,
  Sliders,
  Check
} from "lucide-react";

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#82B3FF]/30 ${
        checked ? "bg-[#1E6BF3]" : "bg-[#D2E6FF]"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-xs border border-[#82B3FF]/30 ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

export default function Settings() {
  const [darkMode, setDarkMode] = useState(() => document.documentElement.classList.contains("dark"));
  const [compactMode, setCompactMode] = useState(false);
  const [twoFactor, setTwoFactor] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState("30 minutes");
  const [timezone, setTimezone] = useState("America/Chicago (CST)");

  const [notifs, setNotifs] = useState({
    email: true,
    browser: true,
    approvals: true,
    denials: true,
    infoRequests: true,
    updates: false,
    dailySummary: false,
  });

  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0A192F]">Preferences & Settings</h1>
          <p className="text-sm text-[#4B6B94] mt-0.5 font-medium">
            Configure your workspace interface, notification rules, security policies, and regional preferences
          </p>
        </div>

        <button
          onClick={handleSave}
          className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1E6BF3] hover:bg-[#1554C0] text-white text-xs font-bold transition-colors shadow-md shadow-blue-500/20"
        >
          <Check className="h-4 w-4" /> Save Changes
        </button>
      </div>

      {saved && (
        <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-[#BDE8E0] border border-emerald-300 text-emerald-950 text-sm shadow-xs animate-in fade-in">
          <CheckCircle className="h-5 w-5 text-emerald-700 shrink-0" />
          <p className="font-bold">All settings and preferences have been updated.</p>
        </div>
      )}

      {/* Notification Rules */}
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="h-4.5 w-4.5 text-[#1E6BF3]" />
          <h2 className="text-base font-extrabold text-[#0A192F]">Notification Preferences</h2>
        </div>

        <div className="divide-y divide-[#D2E6FF]">
          {[
            { key: "email" as const, label: "Email Notifications", desc: "Receive immediate updates via email for urgent decisions" },
            { key: "browser" as const, label: "Browser Push Alerts", desc: "Show desktop banner notifications while using CareAuth" },
            { key: "approvals" as const, label: "Prior Auth Approvals", desc: "Notify when a submitted authorization is approved" },
            { key: "denials" as const, label: "Prior Auth Denials", desc: "Notify when a submitted request is denied with rationale" },
            { key: "infoRequests" as const, label: "Additional Info Requests", desc: "Immediate alert when reviewer requests missing clinical records" },
            { key: "updates" as const, label: "Policy & Guideline Updates", desc: "Receive alerts when coverage criteria are revised" },
            { key: "dailySummary" as const, label: "Daily Queue Digest", desc: "Send daily morning summary of all pending and resolved cases" },
          ].map(item => (
            <div key={item.key} className="flex items-center justify-between py-3.5">
              <div>
                <p className="text-sm font-bold text-[#0A192F]">{item.label}</p>
                <p className="text-xs text-[#4B6B94] mt-0.5">{item.desc}</p>
              </div>
              <Toggle
                checked={notifs[item.key]}
                onChange={v => setNotifs(n => ({ ...n, [item.key]: v }))}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Security & Authentication */}
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-4.5 w-4.5 text-[#1E6BF3]" />
          <h2 className="text-base font-extrabold text-[#0A192F]">Security & Session Management</h2>
        </div>

        <div className="divide-y divide-[#D2E6FF]">
          <div className="flex items-center justify-between py-3.5">
            <div>
              <p className="text-sm font-bold text-[#0A192F]">Two-Factor Authentication (2FA)</p>
              <p className="text-xs text-[#4B6B94] mt-0.5">Protect your account with an extra verification code via authenticator app</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${twoFactor ? "bg-[#BDE8E0] text-emerald-900 border border-emerald-300" : "bg-[#EBF4FF] text-[#4B6B94] border border-[#D2E6FF]"}`}>
                {twoFactor ? "Enabled" : "Disabled"}
              </span>
              <Toggle checked={twoFactor} onChange={setTwoFactor} />
            </div>
          </div>

          <div className="flex items-center justify-between py-3.5">
            <div>
              <p className="text-sm font-bold text-[#0A192F]">Automatic Session Timeout</p>
              <p className="text-xs text-[#4B6B94] mt-0.5">HIPAA-compliant auto-lock timeout after idle period</p>
            </div>
            <select
              value={sessionTimeout}
              onChange={e => setSessionTimeout(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-[#82B3FF] bg-[#EBF4FF] text-xs font-bold text-[#0A192F] focus:outline-none focus:ring-2 focus:ring-[#1E6BF3]/20"
            >
              <option>15 minutes</option>
              <option>30 minutes</option>
              <option>1 hour</option>
              <option>4 hours</option>
            </select>
          </div>

          <div className="flex items-center justify-between py-3.5">
            <div>
              <p className="text-sm font-bold text-[#0A192F]">Active Device Session</p>
              <p className="text-xs text-[#4B6B94] mt-0.5">Current session: Chrome on Windows 11 · Chicago, IL</p>
            </div>
            <span className="text-xs text-emerald-900 font-bold bg-[#BDE8E0] px-2.5 py-1 rounded-xl border border-emerald-300">
              Active Now
            </span>
          </div>
        </div>
      </div>

      {/* Regional & Localization */}
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Globe className="h-4.5 w-4.5 text-[#1E6BF3]" />
          <h2 className="text-base font-extrabold text-[#0A192F]">Regional & System Format</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-extrabold text-[#4B6B94] uppercase tracking-wide mb-1.5">
              Interface Language
            </label>
            <div className="px-3.5 py-2.5 rounded-xl border border-[#D2E6FF] bg-[#EBF4FF] text-xs font-bold text-[#0A192F] flex items-center justify-between">
              <span>English (United States)</span>
              <span className="text-[10px] text-[#4B6B94] font-bold">Default</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-extrabold text-[#4B6B94] uppercase tracking-wide mb-1.5">
              Clinical Timezone
            </label>
            <select
              value={timezone}
              onChange={e => setTimezone(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#82B3FF] bg-[#EBF4FF] text-xs font-bold text-[#0A192F] focus:outline-none focus:ring-2 focus:ring-[#1E6BF3]/20"
            >
              <option>America/Chicago (CST - Central)</option>
              <option>America/New_York (EST - Eastern)</option>
              <option>America/Denver (MST - Mountain)</option>
              <option>America/Los_Angeles (PST - Pacific)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Save Button (bottom) */}
      <div className="flex justify-end pt-2">
        <button
          onClick={handleSave}
          className="px-6 py-2.5 rounded-xl bg-[#1E6BF3] hover:bg-[#1554C0] text-white text-sm font-bold transition-colors shadow-md shadow-blue-500/20 flex items-center gap-2"
        >
          <Check className="h-4 w-4" /> Save All Preferences
        </button>
      </div>
    </div>
  );
}
