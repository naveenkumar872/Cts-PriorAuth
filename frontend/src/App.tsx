import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from '@/components/layout/Layout'
import Home from '@/pages/Home'
import Dashboard from '@/pages/Dashboard'
import AuthRequests from '@/pages/AuthRequests'
import NewAuthorization from '@/pages/NewAuthorization'
import AuthDetails from '@/pages/AuthDetails'
import AITriage from '@/pages/AITriage'
import PolicyCompanion from '@/pages/PolicyCompanion'
import NurseReview from '@/pages/NurseReview'
import FinalDecision from '@/pages/FinalDecision'
import History from '@/pages/History'
import Analytics from '@/pages/Analytics'
import Administration from '@/pages/Administration'
import PatientPortal from '@/pages/PatientPortal'

export default function App() {
  useEffect(() => {
    document.documentElement.classList.remove('dark')
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        {/* Standalone Home / 3-Login Persona Selector */}
        <Route path="/" element={<Home />} />

        {/* Authenticated Workspace Layout */}
        <Route element={<Layout />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="patient-portal" element={<PatientPortal />} />
          <Route path="auth-requests" element={<AuthRequests />} />
          <Route path="auth-requests/new" element={<NewAuthorization />} />
          <Route path="auth-requests/:id" element={<AuthDetails />} />
          <Route path="auth-requests/:id/triage" element={<AITriage />} />
          <Route path="policy-companion" element={<PolicyCompanion />} />
          <Route path="nurse-review" element={<NurseReview />} />
          <Route path="nurse-review/:id" element={<NurseReview />} />
          <Route path="final-decision/:id" element={<FinalDecision />} />
          <Route path="history" element={<History />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="administration" element={<Administration />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
