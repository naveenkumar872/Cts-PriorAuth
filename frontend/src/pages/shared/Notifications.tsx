import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle, XCircle, AlertCircle, Info,
  Bell, BellOff, Check, Trash2, ArrowRight, Loader2,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { DEMO_NOTIFICATIONS } from "@/lib/mock-data-master";

// ── Types ─────────────────────────────────────────────────────────────────────

type NotifType = "approval" | "denial" | "info_request" | "new_request" | "system"
  | "success" | "warning" | "error" | "info";

interface Notif {
  id: string;
  type: NotifType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  caseId: string | null;
  caseNumber?: string | null;
}

// ── Config ────────────────────────────────────────────────────────────────────

const NOTIF_CONFIG: Record<string, {
  icon: React.ComponentType<{ className?: string }>;
  bg: string; text: string;
  badgeBg: string; badgeText: string; label: string;
}> = {
  approval: { icon: CheckCircle, bg: "bg-emerald-50/40", text: "text-emerald-600", badgeBg: "bg-emerald-100", badgeText: "text-emerald-800", label: "Approval" },
  success:  { icon: CheckCircle, bg: "bg-emerald-50/40", text: "text-emerald-600", badgeBg: "bg-emerald-100", badgeText: "text-emerald-800", label: "Approved" },
  denial:   { icon: XCircle,     bg: "bg-rose-50/40",    text: "text-rose-600",    badgeBg: "bg-rose-100",    badgeText: "text-rose-800",    label: "Denied" },
  error:    { icon: XCircle,     bg: "bg-rose-50/40",    text: "text-rose-600",    badgeBg: "bg-rose-100",    badgeText: "text-rose-800",    label: "Denied" },
  info_request: { icon: AlertCircle, bg: "bg-amber-50/40", text: "text-amber-600", badgeBg: "bg-amber-100", badgeText: "text-amber-800", label: "Action Needed" },
  warning:  { icon: AlertCircle, bg: "bg-amber-50/40",   text: "text-amber-600",   badgeBg: "bg-amber-100",   badgeText: "text-amber-800",   label: "Action Needed" },
  new_request: { icon: Bell,     bg: "bg-blue-50/40",    text: "text-blue-600",    badgeBg: "bg-blue-100",    badgeText: "text-blue-800",    label: "New Request" },
  info:     { icon: Info,        bg: "bg-slate-50",       text: "text-slate-600",   badgeBg: "bg-slate-100",   badgeText: "text-slate-700",   label: "Info" },
  system:   { icon: Info,        bg: "bg-slate-50",       text: "text-slate-600",   badgeBg: "bg-slate-100",   badgeText: "text-slate-700",   label: "System" },
};

const DEFAULT_CFG = NOTIF_CONFIG.info;

function formatTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs  = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (days > 0) return `${days}d ago`;
  if (hrs  > 0) return `${hrs}h ago`;
  return `${Math.max(mins, 1)}m ago`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Notifications() {
  const { user } = useAuth();
  const [notifs, setNotifs]   = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState<"all" | "unread" | "approval" | "warning" | "error">("all");

  const base = user?.role === "provider" ? "/provider/requests" : "/reviewer/requests";

  // Load notifications from TiDB on mount
  useEffect(() => {
    setLoading(true);
    api.getNotifications()
      .then(data => {
        const fetched = data as any[];
        if (fetched && fetched.length > 0) {
          const mapped: Notif[] = fetched.map((n: any) => ({
            id:         n.id,
            type:       (n.type as NotifType) ?? "info",
            title:      n.title,
            message:    n.message,
            timestamp:  n.timestamp,
            read:       n.read ?? false,
            caseId:     n.caseId ?? null,
            caseNumber: n.caseNumber ?? null,
          }));
          setNotifs(mapped);
        } else {
          setNotifs(DEMO_NOTIFICATIONS as any[]);
        }
      })
      .catch(() => setNotifs(DEMO_NOTIFICATIONS as any[]))
      .finally(() => setLoading(false));
  }, []);

  // Mark a single notification as read (optimistic + API)
  const markRead = async (id: string) => {
    setNotifs(ns => ns.map(n => n.id === id ? { ...n, read: true } : n));
    try { await api.markNotificationRead(id); } catch { /* non-critical */ }
  };

  // Mark all as read (optimistic + API)
  const markAllRead = async () => {
    setNotifs(ns => ns.map(n => ({ ...n, read: true })));
    try { await api.markAllNotificationsRead(); } catch { /* non-critical */ }
  };

  // Delete locally (no backend delete endpoint — just hide from UI)
  const deleteNotif = (id: string) =>
    setNotifs(ns => ns.filter(n => n.id !== id));

  const clearAll = () => setNotifs([]);

  const displayed = notifs.filter(n => {
    if (filter === "unread")   return !n.read;
    if (filter === "approval") return ["approval", "success"].includes(n.type);
    if (filter === "warning")  return ["info_request", "warning"].includes(n.type);
    if (filter === "error")    return ["denial", "error"].includes(n.type);
    return true;
  });

  const unreadCount = notifs.filter(n => !n.read).length;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-7 w-7 text-blue-500 animate-spin" />
    </div>
  );

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                {unreadCount} New
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time updates on prior authorization decisions, assigned cases, and policy changes
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button onClick={markAllRead}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg border border-blue-200 transition-colors shadow-sm">
              <Check className="h-3.5 w-3.5" /> Mark All Read
            </button>
          )}
          {notifs.length > 0 && (
            <button onClick={clearAll}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors">
              <Trash2 className="h-3.5 w-3.5" /> Clear All
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap items-center bg-slate-100/70 p-1.5 rounded-xl w-fit">
        {[
          { key: "all"      as const, label: "All",          count: notifs.length },
          { key: "unread"   as const, label: "Unread",       count: unreadCount },
          { key: "approval" as const, label: "Approvals",    count: notifs.filter(n => ["approval","success"].includes(n.type)).length },
          { key: "warning"  as const, label: "Action Needed",count: notifs.filter(n => ["info_request","warning"].includes(n.type)).length },
          { key: "error"    as const, label: "Denials",      count: notifs.filter(n => ["denial","error"].includes(n.type)).length },
        ].map(tab => (
          <button key={tab.key} onClick={() => setFilter(tab.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              filter === tab.key ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
            }`}>
            {tab.label}
            {tab.count > 0 && (
              <span className={`px-1.5 rounded-full text-[10px] ${filter === tab.key ? "bg-slate-100 text-slate-700 font-bold" : "bg-slate-200/60 text-slate-500"}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-3">
        {displayed.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-12 text-center shadow-sm">
            <BellOff className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-900">No notifications</h3>
            <p className="text-xs text-slate-500 mt-1">You are all caught up.</p>
          </div>
        ) : (
          displayed.map(notif => {
            const cfg  = NOTIF_CONFIG[notif.type] ?? DEFAULT_CFG;
            const Icon = cfg.icon;
            return (
              <div key={notif.id}
                className={`rounded-lg border border-slate-200 ${notif.read ? "bg-white" : cfg.bg} p-4 transition-all hover:shadow-md shadow-sm`}>
                <div className="flex items-start gap-3.5">
                  <div className={`p-2 rounded-lg bg-white border border-slate-200 shrink-0 mt-0.5 ${cfg.text}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`text-xs font-bold ${notif.read ? "text-slate-800" : "text-slate-950"}`}>
                          {notif.title}
                        </p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${cfg.badgeBg} ${cfg.badgeText}`}>
                          {cfg.label}
                        </span>
                        {!notif.read && (
                          <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                        )}
                      </div>
                      <span className="text-xs text-slate-400 font-semibold shrink-0">
                        {formatTime(notif.timestamp)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-650 mt-1.5 leading-relaxed">{notif.message}</p>
                    <div className="flex items-center justify-between gap-3 mt-3 pt-2 border-t border-slate-100/60">
                      <div>
                        {notif.caseId && (
                          <Link to={`${base}/${notif.caseId}`}
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-bold bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded border border-blue-200 transition-colors">
                            View Case {notif.caseNumber} <ArrowRight className="h-3 w-3" />
                          </Link>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {!notif.read && (
                          <button onClick={() => markRead(notif.id)}
                            className="text-xs text-slate-500 hover:text-blue-600 font-semibold px-2 py-1 rounded hover:bg-slate-100 transition-colors">
                            Mark Read
                          </button>
                        )}
                        <button onClick={() => deleteNotif(notif.id)}
                          className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-red-50 transition-colors" title="Dismiss">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
