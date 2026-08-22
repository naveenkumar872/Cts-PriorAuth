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
  Briefcase,
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
  Briefcase,
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
        "flex h-full flex-col border-r border-slate-200 bg-white text-slate-700 transition-all duration-200 shadow-xs",
        collapsed ? "w-[76px] min-w-[76px]" : "w-[260px] min-w-[260px]"
      )}
    >
      {/* Logo & Branding */}
      <div className="border-b border-slate-200 px-5 py-4 bg-white">
        <Link to="/" title="Go to Home Page" className={cn("flex items-center gap-3 group transition-transform hover:scale-[1.01]", !collapsed && "mb-1")}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-600/25">
            <Briefcase className="h-4.5 w-4.5" strokeWidth={2.2} />
          </div>
          {!collapsed && (
            <div className="flex-1">
              <p className="text-base font-extrabold text-slate-900 tracking-tight">
                Auth<span className="text-blue-600">AI</span>
              </p>
              <p className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase">Enterprise Prior Auth</p>
            </div>
          )}
        </Link>
      </div>

      {/* Role Badge Box */}
      {user && !collapsed && (
        <div className="mx-4 mt-4 rounded-xl border border-blue-150 bg-blue-50/70 p-3 shadow-xs">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-blue-600 shrink-0" />
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700">
              {user.role === "provider" ? "Healthcare Provider" : "Insurance Payer Reviewer"}
            </p>
          </div>
          <p className="text-xs text-slate-900 mt-1 font-bold truncate">{user.organization}</p>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto scrollbar-hide px-3 py-4 space-y-6">
        {navGroups.map((group) => (
          <div key={group.label} className="space-y-1.5">
            {!collapsed && (
              <p className="px-3 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                {group.label}
              </p>
            )}
            <ul className="space-y-1">
              {group.items.map(({ href, label, icon: iconName }) => {
                const active = isActive(href);
                const Icon = ICON_MAP[iconName] ?? LayoutDashboard;
                return (
                  <li key={href}>
                    <Link
                      to={href}
                      title={collapsed ? label : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all duration-150",
                        collapsed && "justify-center",
                        active
                          ? "bg-blue-600 text-white font-extrabold shadow-sm shadow-blue-600/20"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0",
                          active ? "text-white" : "text-slate-500"
                        )}
                        strokeWidth={active ? 2.2 : 1.75}
                      />
                      {!collapsed && <span className="flex-1 tracking-wide">{label}</span>}
                      {!collapsed && active && <ChevronRight className="h-3 w-3 text-white" />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Logout Button */}
      <div className="border-t border-slate-200 p-4 bg-white">
        <button
          onClick={logout}
          title={collapsed ? "Logout" : undefined}
          className={cn(
            "w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-600 hover:bg-rose-50 hover:text-rose-700 transition-all duration-150 cursor-pointer",
            collapsed && "justify-center"
          )}
        >
          <LogOut className="h-4 w-4 shrink-0 text-slate-500 hover:text-rose-600" strokeWidth={1.75} />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
