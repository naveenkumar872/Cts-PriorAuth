import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Bell, ChevronDown, LogOut, User, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { DEMO_NOTIFICATIONS } from "@/lib/mock-data-master";
import { useAuth } from "@/context/AuthContext";
import { useSidebar } from "@/context/SidebarContext";
import { ROLE_CONFIGS } from "@/lib/roles";

function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

export default function TopBar() {
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { user, logout } = useAuth();
  const { toggleSidebar } = useSidebar();
  const navigate = useNavigate();

  const unread = DEMO_NOTIFICATIONS.filter((n) => !n.read).length;

  const notifDot: Record<string, string> = {
    warning: "bg-amber-500",
    info: "bg-blue-500",
    success: "bg-emerald-500",
    error: "bg-rose-500",
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  if (!user) return null;

  const roleConfig = ROLE_CONFIGS[user.role];

  // Get user initials
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Get avatar background color based on role
  const avatarBg = user.role === "provider" ? "bg-blue-600 text-white" : "bg-teal-600 text-white";

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6 lg:px-8 gap-4 transition-colors shadow-sm">
      {/* Sidebar Collapse Toggle */}
      <button
        onClick={toggleSidebar}
        aria-label="Toggle navigation"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-all hover:bg-slate-50 hover:text-slate-900 shadow-sm"
      >
        <Menu className="h-5 w-5" strokeWidth={1.75} />
      </button>

      {/* Search */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search requests, patients, policies..."
          className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
        />
      </div>

      <div className="flex items-center gap-3">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => {
              setNotifOpen(!notifOpen);
              setProfileOpen(false);
            }}
            className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-all hover:bg-slate-50 hover:text-slate-900 shadow-sm"
          >
            <Bell className="h-5 w-5" strokeWidth={1.75} />
            {unread > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white shadow-sm border border-white">
                {unread}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-12 z-50 w-96 rounded-lg border border-slate-200 bg-white shadow-lg py-1">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Notifications</p>
                  <p className="text-xs text-slate-500">{unread} unread</p>
                </div>
                <button className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                  Mark all read
                </button>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {DEMO_NOTIFICATIONS.map((n) => (
                  <div
                    key={n.id}
                    className={cn(
                      "flex gap-3 border-b border-slate-100 px-4 py-3 transition-colors hover:bg-slate-50 cursor-pointer",
                      !n.read && "bg-slate-50/50"
                    )}
                  >
                    <div className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", notifDot[n.type])} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800">{n.title}</p>
                      <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{n.message}</p>
                      <p className="mt-1 text-[10px] text-slate-400">
                        {formatRelativeTime(n.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-slate-100 px-4 py-2 text-center">
                <button
                  onClick={() => {
                    setNotifOpen(false);
                    navigate("/notifications");
                  }}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                >
                  View all notifications
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="h-5 w-px bg-slate-200" />

        {/* Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setProfileOpen(!profileOpen);
              setNotifOpen(false);
            }}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 transition-all hover:bg-slate-50 shadow-sm cursor-pointer"
          >
            <div className={cn("flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-bold shadow-sm", avatarBg)}>
              {initials}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-semibold text-slate-800 leading-tight">{user.name}</p>
              <p className="text-[10px] text-slate-500 leading-tight">
                {user.role === "provider" ? "Provider" : "Payer Reviewer"}
              </p>
            </div>
            <ChevronDown className="h-3 w-3 text-slate-400" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-12 z-50 w-72 rounded-lg border border-slate-200 bg-white shadow-lg py-1.5">
              {/* Profile header */}
              <div className="border-b border-slate-100 px-4 pb-3 pt-1">
                <div className="flex items-center gap-3">
                  <div className={cn("flex h-9 w-9 items-center justify-center rounded-md text-xs font-bold", avatarBg)}>
                    {initials}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-900">{user.name}</p>
                    <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
                    <span
                      className={cn(
                        "mt-1 inline-block rounded px-1.5 py-0.5 text-[9px] font-bold uppercase",
                        roleConfig.badgeBg,
                        roleConfig.badgeText
                      )}
                    >
                      {user.role === "provider" ? "Provider" : "Reviewer"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Profile actions */}
              <div className="py-1">
                {[
                  { icon: User, label: "My Profile", href: "/profile" },
                ].map(({ icon: Icon, label, href }) => (
                  <button
                    key={label}
                    onClick={() => {
                      setProfileOpen(false);
                      navigate(href);
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2 text-xs text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                  >
                    <Icon className="h-3.5 w-3.5 text-slate-400" />
                    {label}
                  </button>
                ))}
              </div>

              {/* Logout */}
              <div className="border-t border-slate-100 pt-1">
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 px-4 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
