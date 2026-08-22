import { useNavigate } from 'react-router-dom'
import { Stethoscope, Building2, UserCheck, HeartHandshake, ArrowRight, ShieldCheck } from 'lucide-react'
import { useUIStore, PersonaRole } from '@/store/uiStore'

export default function Home() {
  const navigate = useNavigate()
  const { setUserRole } = useUIStore()

  const handleRoleLogin = (role: PersonaRole, targetPath: string) => {
    setUserRole(role)
    navigate(targetPath)
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between selection:bg-[#0eadb9] selection:text-white">
      {/* Header Bar */}
      <header className="px-8 py-5 flex items-center justify-between bg-white border-b border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#0eadb9] to-[#00c4cc] flex items-center justify-center shadow-md">
            <HeartHandshake className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-900 font-extrabold text-xl tracking-tight leading-none">Care</span>
              <span className="text-[#0eadb9] font-bold text-xs bg-[#e0f7f8] px-2 py-0.5 rounded-full">AI</span>
            </div>
            <p className="text-slate-500 text-xs font-medium">Prior Authorization & Policy Companion</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-[#0eadb9] bg-[#e0f7f8] px-3 py-1.5 rounded-full">
          <ShieldCheck className="w-4 h-4" />
          <span>Secure Enterprise Portal</span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl mx-auto px-6 py-12 flex flex-col justify-center items-center text-center">
        <span className="text-xs font-bold uppercase tracking-widest text-[#0eadb9] bg-[#e0f7f8] px-3 py-1 rounded-full mb-3">
          Multi-Persona Access Control
        </span>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight max-w-3xl leading-tight">
          Select Your Persona to Enter the Platform
        </h1>
        <p className="text-slate-600 text-base max-w-2xl mt-4 leading-relaxed">
          Experience tailored workflows built specifically for healthcare providers, insurance reviewers, and patients.
        </p>

        {/* 3 Login Role Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mt-10">
          
          {/* 1. PROVIDER LOGIN */}
          <div className="bg-white rounded-3xl p-7 border border-slate-200 shadow-sm hover:shadow-xl hover:border-[#0eadb9]/50 transition-all duration-200 text-left flex flex-col justify-between group">
            <div>
              <div className="w-14 h-14 rounded-2xl bg-[#e0f7f8] flex items-center justify-center text-[#0eadb9] mb-6 group-hover:scale-110 transition-transform">
                <Stethoscope className="w-7 h-7" />
              </div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#0eadb9] bg-[#e0f7f8] px-2.5 py-0.5 rounded-full">
                Persona 1
              </span>
              <h2 className="text-xl font-bold text-slate-900 mt-2">Provider Portal</h2>
              <p className="text-slate-500 text-xs font-semibold mt-1">Hospitals & Physicians</p>
              <p className="text-slate-600 text-xs mt-3 leading-relaxed">
                Submit prior authorization requests, track real-time claim statuses, and verify clinical policy rules.
              </p>
            </div>
            <button
              onClick={() => handleRoleLogin('provider', '/dashboard')}
              className="mt-8 w-full h-11 rounded-xl bg-[#0eadb9] hover:bg-[#0897a3] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <span>Login as Provider</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* 2. PAYER LOGIN */}
          <div className="bg-white rounded-3xl p-7 border border-slate-200 shadow-sm hover:shadow-xl hover:border-[#0eadb9]/50 transition-all duration-200 text-left flex flex-col justify-between group">
            <div>
              <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 mb-6 group-hover:scale-110 transition-transform">
                <Building2 className="w-7 h-7" />
              </div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full">
                Persona 2
              </span>
              <h2 className="text-xl font-bold text-slate-900 mt-2">Payer Portal</h2>
              <p className="text-slate-500 text-xs font-semibold mt-1">Insurance Companies & Reviewers</p>
              <p className="text-slate-600 text-xs mt-3 leading-relaxed">
                Evaluate AI-triaged claims, conduct nurse reviews, analyze approval metrics, and issue final auth decisions.
              </p>
            </div>
            <button
              onClick={() => handleRoleLogin('payer', '/nurse-review')}
              className="mt-8 w-full h-11 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <span>Login as Payer</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* 3. PATIENT LOGIN */}
          <div className="bg-white rounded-3xl p-7 border border-slate-200 shadow-sm hover:shadow-xl hover:border-[#0eadb9]/50 transition-all duration-200 text-left flex flex-col justify-between group">
            <div>
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-6 group-hover:scale-110 transition-transform">
                <UserCheck className="w-7 h-7" />
              </div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                Persona 3
              </span>
              <h2 className="text-xl font-bold text-slate-900 mt-2">Patient Portal</h2>
              <p className="text-slate-500 text-xs font-semibold mt-1">Policyholders & Patients</p>
              <p className="text-slate-600 text-xs mt-3 leading-relaxed">
                View submitted coverage requests, see approved authorizations, and read detailed rejection reasons for denied claims.
              </p>
            </div>
            <button
              onClick={() => handleRoleLogin('patient', '/patient-portal')}
              className="mt-8 w-full h-11 rounded-xl bg-[#10b981] hover:bg-[#059669] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <span>Login as Patient</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-slate-200 bg-white text-center text-xs text-slate-500 font-medium">
        Prior Authorization Triage & Policy Companion Platform • 3-Persona Access Demo
      </footer>
    </div>
  )
}
