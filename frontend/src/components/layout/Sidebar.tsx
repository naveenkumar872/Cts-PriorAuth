import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useSidebar } from "@/context/SidebarContext";
import { ROLE_NAV_GROUPS } from "@/lib/roles";
import {
  LayoutDashboard,
  FileText,
  FilePlus2,
  ListOrdered,
  BookOpen,
  History,
  BarChart3,
  ChevronRight,
  ShieldAlert,
  Bell,
  User,
  LogOut,
  Home,
  Sparkles,
  Stethoscope,
} from "lucide-react";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  LayoutDashboard,
  FileText,
  FilePlus2,
  ListOrdered,
  BookOpen,
  History,
  BarChart3,
  Bell,
  User,
  Home,
  Sparkles,
  Stethoscope,
};

export default function Sidebar() {
  const location = useLocation();
  const pathname = location.pathname;
  const { user, logout } = useAuth();
  const { collapsed } = useSidebar();

  const navGroups = user ? ROLE_NAV_GROUPS[user.role] : [];

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/" || pathname === "/dashboard";
    return pathname.startsWith(href) || pathname.includes(href);
  };

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-slate-800 bg-slate-900 text-slate-300 transition-all duration-200 shadow-sm",
        collapsed ? "w-[76px] min-w-[76px]" : "w-[260px] min-w-[260px]"
      )}
    >
      {/* Logo & Branding */}
      <div className="border-b border-slate-800 px-5 py-4 bg-slate-900">
        <Link to="/" title="Go to Home Page" className={cn("flex items-center gap-3 group transition-transform hover:scale-[1.01]", !collapsed && "mb-1")}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 group-hover:bg-blue-700 transition-colors">
            <ShieldAlert className="h-4.5 w-4.5 text-white" strokeWidth={2.2} />
          </div>
          {!collapsed && (
            <div className="flex-1">
              <p className="text-sm font-bold text-white tracking-tight">CareAuth <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest ml-0.5">AI</span></p>
              <p className="text-[10px] font-bold text-slate-500 tracking-wider uppercase">Enterprise Prior Auth</p>
            </div>
          )}
        </Link>
      </div>

      {/* Role Badge */}
      {user && !collapsed && (
        <div className="mx-4 mt-4 rounded-lg border border-slate-800 bg-slate-850/40 p-3">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {user.role === "provider" ? "Healthcare Provider" : "Clinical Review Operations"}
            </p>
          </div>
          <p className="text-xs text-white mt-0.5 font-semibold truncate">{user.organization}</p>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto scrollbar-hide px-3 py-4 space-y-6">
        {navGroups.map((group) => (
          <div key={group.label} className="space-y-1.5">
            {!collapsed && (
              <p className="px-3 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                {group.label}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.map(({ href, label, icon: iconName }) => {
                const active = isActive(href);
                const Icon = ICON_MAP[iconName] ?? LayoutDashboard;
                return (
                  <li key={href}>
                    <Link
                      to={href}
                      title={collapsed ? label : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold transition-all duration-150",
                        collapsed && "justify-center",
                        active
                          ? "bg-slate-800 text-white font-bold"
                          : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0",
                          active ? "text-blue-500" : "text-slate-500"
                        )}
                        strokeWidth={active ? 2.2 : 1.75}
                      />
                      {!collapsed && <span className="flex-1 tracking-wide">{label}</span>}
                      {!collapsed && active && <ChevronRight className="h-3 w-3 text-blue-500" />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Logout Button */}
      <div className="border-t border-slate-800 p-4 bg-slate-900">
        <button
          onClick={logout}
          title={collapsed ? "Logout" : undefined}
          className={cn(
            "w-full flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold text-slate-400 hover:bg-rose-950/30 hover:text-rose-400 transition-all duration-150",
            collapsed && "justify-center"
          )}
        >
          <LogOut className="h-4 w-4 shrink-0 text-slate-500" strokeWidth={1.75} />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
