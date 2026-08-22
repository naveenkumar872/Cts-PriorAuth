import { useState, useEffect } from 'react'
import { Search, Bell, Plus, ChevronDown, Stethoscope, Building2, User, Check } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useUIStore, PersonaRole } from '@/store/uiStore'
import { getInitials } from '@/lib/utils'
import { cn } from '@/lib/utils'

export default function Header() {
  const { userRole, setUserRole } = useUIStore()
  const [searchValue, setSearchValue] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const navigate = useNavigate()

  // Profile data per role
  const profileInfo = {
    provider: {
      name: 'Dr. Sarah Jenkins',
      roleText: 'Physician / Hospital',
      org: 'City Medical Center',
      avatarColor: 'bg-[#0eadb9]',
    },
    payer: {
      name: 'Nurse Auditor',
      roleText: 'Insurance Reviewer',
      org: 'BlueCross Health Plan',
      avatarColor: 'bg-amber-600',
    },
    patient: {
      name: 'David Lee',
      roleText: 'Patient / Policyholder',
      org: 'Member ID: MEM-884920',
      avatarColor: 'bg-emerald-600',
    },
  }[userRole] || {
    name: 'Dr. Sarah Jenkins',
    roleText: 'Provider',
    org: 'City Medical Center',
    avatarColor: 'bg-[#0eadb9]',
  }

  const handleRoleSelect = (role: PersonaRole) => {
    setUserRole(role)
    setDropdownOpen(false)
    if (role === 'provider') navigate('/dashboard')
    else if (role === 'payer') navigate('/nurse-review')
    else if (role === 'patient') navigate('/patient-portal')
  }

  // ⌘K / Ctrl+K to focus search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        document.getElementById('global-search')?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <header className="h-[64px] flex items-center justify-between gap-4 px-6 bg-white border-b border-[#e2e8f0] flex-shrink-0 z-30 shadow-xs">
      
      {/* TOP LEFT: User Profile Section with Interactive Persona Switcher */}
      <div className="relative">
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-3 p-1.5 pl-2 pr-3 rounded-xl bg-slate-50 border border-[#e2e8f0] hover:border-[#0eadb9]/60 transition-all duration-150 group"
        >
          <div className="relative">
            <div className={cn('w-8 h-8 rounded-full text-white flex items-center justify-center text-xs font-bold shadow-xs group-hover:scale-105 transition-transform', profileInfo.avatarColor)}>
              {getInitials(profileInfo.name)}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-[#0eadb9] border-2 border-white rounded-full" />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-1.5">
              <p className="text-[13.5px] font-bold text-slate-900 leading-tight">
                {profileInfo.name}
              </p>
              <span className="bg-[#e0f7f8] text-[#0eadb9] text-[10px] font-bold px-1.5 py-0.2 rounded uppercase">
                {userRole}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-tight">
              {profileInfo.org}
            </p>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#0eadb9] transition-colors ml-1" />
        </button>

        {/* Persona Switcher Dropdown Menu */}
        {dropdownOpen && (
          <div className="absolute left-0 mt-2 w-64 bg-white rounded-2xl border border-slate-200 shadow-xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="px-3 py-2 border-b border-slate-100 mb-1">
              <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Switch Persona Role</p>
            </div>
            <div className="space-y-1">
              <button
                onClick={() => handleRoleSelect('provider')}
                className={cn(
                  'w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold transition-all',
                  userRole === 'provider' ? 'bg-[#e0f7f8] text-[#0eadb9]' : 'hover:bg-slate-50 text-slate-700'
                )}
              >
                <div className="flex items-center gap-2.5">
                  <Stethoscope className="w-4 h-4 text-[#0eadb9]" />
                  <div className="text-left">
                    <p className="font-bold leading-tight">Provider (Hospital / Doctor)</p>
                    <p className="text-[10px] text-slate-400">Submit & Track Auth Requests</p>
                  </div>
                </div>
                {userRole === 'provider' && <Check className="w-4 h-4 text-[#0eadb9]" />}
              </button>

              <button
                onClick={() => handleRoleSelect('payer')}
                className={cn(
                  'w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold transition-all',
                  userRole === 'payer' ? 'bg-amber-50 text-amber-800' : 'hover:bg-slate-50 text-slate-700'
                )}
              >
                <div className="flex items-center gap-2.5">
                  <Building2 className="w-4 h-4 text-amber-600" />
                  <div className="text-left">
                    <p className="font-bold leading-tight">Payer (Insurance Co)</p>
                    <p className="text-[10px] text-slate-400">Nurse Review & Analytics</p>
                  </div>
                </div>
                {userRole === 'payer' && <Check className="w-4 h-4 text-amber-600" />}
              </button>

              <button
                onClick={() => handleRoleSelect('patient')}
                className={cn(
                  'w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold transition-all',
                  userRole === 'patient' ? 'bg-emerald-50 text-emerald-800' : 'hover:bg-slate-50 text-slate-700'
                )}
              >
                <div className="flex items-center gap-2.5">
                  <User className="w-4 h-4 text-emerald-600" />
                  <div className="text-left">
                    <p className="font-bold leading-tight">Patient Portal</p>
                    <p className="text-[10px] text-slate-400">Claims & Rejection Reasons</p>
                  </div>
                </div>
                {userRole === 'patient' && <Check className="w-4 h-4 text-emerald-600" />}
              </button>
            </div>
            <div className="pt-2 border-t border-slate-100 mt-1 px-1">
              <button
                onClick={() => { setDropdownOpen(false); navigate('/') }}
                className="w-full text-center py-1.5 text-[11px] font-bold text-slate-500 hover:text-slate-900 transition-colors"
              >
                ← Back to Home Page
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CENTER: Global Search Bar */}
      <div className="flex-1 max-w-md relative hidden md:block">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          id="global-search"
          type="text"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          placeholder="Search requests, patients, or policy rules..."
          className={cn(
            'w-full h-9 pl-9 pr-16 text-sm rounded-xl border',
            'bg-[#f8fafc]',
            'border-[#e2e8f0]',
            'text-slate-900',
            'placeholder:text-slate-400',
            'focus:outline-none focus:ring-2 focus:ring-[#0eadb9] focus:border-transparent transition-all',
          )}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400 bg-white border border-slate-200 px-1.5 py-0.5 rounded shadow-2xs">
          ⌘K
        </span>
      </div>

      {/* TOP RIGHT: Actions */}
      <div className="flex items-center gap-3">
        {userRole === 'provider' && (
          <Link
            to="/auth-requests/new"
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-[#0eadb9] hover:bg-[#0897a3] text-white text-xs font-semibold shadow-xs hover:shadow transition-all duration-150"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Authorization</span>
          </Link>
        )}

        {/* Notifications */}
        <button className="relative w-9 h-9 flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-[#0eadb9] transition-colors">
          <Bell className="w-4.5 h-4.5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-[#0eadb9] rounded-full ring-2 ring-white" />
        </button>
      </div>

    </header>
  )
}
