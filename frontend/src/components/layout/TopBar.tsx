import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Bell, ChevronDown, LogOut, User, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
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
  const [unread, setUnread] = useState(0);
  const { user, logout } = useAuth();
  const { toggleSidebar } = useSidebar();
  const navigate = useNavigate();

  useEffect(() => {
    api.getNotifications()
      .then((data: any) => {
        if (Array.isArray(data)) {
          setUnread(data.filter((n: any) => !n.read && !n.isRead).length);
        }
      })
      .catch(() => setUnread(0));
  }, []);

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
        {/* Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 transition-all hover:bg-slate-50 shadow-xs cursor-pointer"
          >
            <div className={cn("flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-bold shadow-xs", avatarBg)}>
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
