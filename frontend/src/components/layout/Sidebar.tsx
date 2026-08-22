import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, FileText, FilePlus, UserCheck, BookOpen,
  History, BarChart3, FolderOpen, Shield,
  ChevronLeft, ChevronRight, HeartHandshake, User, ArrowLeftRight, XCircle
} from 'lucide-react'
import { useUIStore } from '@/store/uiStore'
import { cn } from '@/lib/utils'

export default function Sidebar() {
  const { sidebarCollapsed, toggleSidebar, userRole } = useUIStore()
  const location = useLocation()
  const navigate = useNavigate()

  // Define 3 role-specific sidebars
  const roleSections = {
    provider: [
      {
        label: 'Provider Portal',
        items: [
          { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
          { to: '/auth-requests', icon: FileText, label: 'Auth Requests' },
          { to: '/auth-requests/new', icon: FilePlus, label: 'New Authorization' },
          { to: '/policy-companion', icon: BookOpen, label: 'Policy Companion' },
        ],
      },
      {
        label: 'Records',
        items: [
          { to: '/history', icon: History, label: 'Patient History' },
          { to: '/documents', icon: FolderOpen, label: 'Clinical Documents' },
        ],
      },
    ],
    payer: [
      {
        label: 'Payer Review Queue',
        items: [
          { to: '/nurse-review', icon: UserCheck, label: 'Nurse Review Queue' },
          { to: '/auth-requests', icon: FileText, label: 'Claims Queue' },
          { to: '/policy-companion', icon: BookOpen, label: 'Policy Companion' },
        ],
      },
      {
        label: 'Payer Insights',
        items: [
          { to: '/analytics', icon: BarChart3, label: 'Payer Analytics' },
          { to: '/administration', icon: Shield, label: 'Administration' },
        ],
      },
    ],
    patient: [
      {
        label: 'Patient Member Care',
        items: [
          { to: '/patient-portal', icon: User, label: 'My Coverage Requests' },
          { to: '/patient-portal?filter=denied', icon: XCircle, label: 'Rejection Reasons' },
          { to: '/policy-companion', icon: BookOpen, label: 'Plan Coverage Rules' },
        ],
      },
    ],
  }

  const activeSections = roleSections[userRole] || roleSections.provider

  return (
    <aside
      style={{ width: sidebarCollapsed ? 76 : 260 }}
      className="flex flex-col h-screen bg-white border-r border-[#e2e8f0] transition-all duration-200 flex-shrink-0 overflow-hidden select-none z-20 shadow-xs"
    >
      {/* Brand Logo */}
      <div className={cn(
        'flex items-center h-[64px] px-4 border-b border-[#e2e8f0] flex-shrink-0',
        sidebarCollapsed ? 'justify-center' : 'justify-between'
      )}>
        <div className="flex items-center gap-3 overflow-hidden cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#0eadb9] to-[#00c4cc] flex items-center justify-center shadow-sm flex-shrink-0">
            <HeartHandshake className="w-5 h-5 text-white" />
          </div>
          {!sidebarCollapsed && (
            <div className="overflow-hidden">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-900 font-extrabold text-base tracking-tight leading-none">Care</span>
                <span className="text-[#0eadb9] font-bold text-xs bg-[#e0f7f8] px-1.5 py-0.5 rounded uppercase">{userRole}</span>
              </div>
              <p className="text-slate-500 text-[10.5px] font-medium leading-tight truncate">
                {userRole === 'provider' && 'Hospital & Doctor View'}
                {userRole === 'payer' && 'Insurance Company View'}
                {userRole === 'patient' && 'Patient Member View'}
              </p>
            </div>
          )}
        </div>

        {!sidebarCollapsed && (
          <button
            onClick={toggleSidebar}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title="Collapse sidebar"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
        {activeSections.map((section) => (
          <div key={section.label}>
            {!sidebarCollapsed && (
              <p className="px-3 mb-2 text-slate-400 text-[10.5px] font-bold uppercase tracking-wider">
                {section.label}
              </p>
            )}
            {sidebarCollapsed && (
              <div className="border-t border-[#e2e8f0] mb-2 mt-1" />
            )}
            <ul className="space-y-1">
              {section.items.map(({ to, icon: Icon, label }) => {
                const isActive = location.pathname === to ||
                  (to !== '/dashboard' && to !== '/patient-portal' && location.pathname.startsWith(to))
                return (
                  <li key={to}>
                    <NavLink
                      to={to}
                      title={sidebarCollapsed ? label : undefined}
                      className={cn(
                        'flex items-center rounded-xl text-[13.5px] font-medium transition-all duration-150',
                        sidebarCollapsed ? 'justify-center w-10 h-10 mx-auto' : 'gap-3 px-3 h-10',
                        isActive
                          ? 'bg-[#e0f7f8] text-[#0eadb9] font-bold shadow-2xs border-l-4 border-[#0eadb9]'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      )}
                    >
                      <Icon className={cn('w-4.5 h-4.5 flex-shrink-0', isActive ? 'text-[#0eadb9]' : 'text-slate-400')} />
                      {!sidebarCollapsed && <span className="truncate">{label}</span>}
                    </NavLink>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Persona Switcher Button at bottom */}
      <div className="p-3 border-t border-[#e2e8f0]">
        {!sidebarCollapsed ? (
          <button
            onClick={() => navigate('/')}
            className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 hover:border-[#0eadb9]/50 hover:bg-[#e0f7f8]/50 transition-all text-xs font-semibold"
          >
            <div className="flex items-center gap-2">
              <ArrowLeftRight className="w-4 h-4 text-[#0eadb9]" />
              <span>Switch Persona</span>
            </div>
            <span className="text-[10px] text-slate-400 capitalize">({userRole})</span>
          </button>
        ) : (
          <button
            onClick={toggleSidebar}
            className="w-10 h-10 mx-auto flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title="Expand sidebar"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>
    </aside>
  )
}
