import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Upload, X, FileText, CheckCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { mockInsurancePlans, mockProviders, mockServices, mockPatients } from '@/lib/mockData'

export default function NewAuthorization() {
  const navigate = useNavigate()
  const [submitted, setSubmitted] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([])
  const [form, setForm] = useState({
    patient: '', memberId: '', dob: '', gender: '', insurancePlan: '',
    provider: '', organization: '', licenseNumber: '',
    service: '', serviceCode: '', diagnosis: '', priority: 'medium', clinicalNotes: '',
  })

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const val = e.target.value
    setForm(f => ({ ...f, [key]: val }))
    // auto-fill logic
    if (key === 'patient') {
      const p = mockPatients.find(p => String(p.id) === val)
      if (p) setForm(f => ({ ...f, patient: val, memberId: p.member_id, dob: p.date_of_birth, gender: p.gender || '', insurancePlan: String(p.insurance_plan_id || '') }))
    }
    if (key === 'provider') {
      const pv = mockProviders.find(p => String(p.id) === val)
      if (pv) setForm(f => ({ ...f, provider: val, organization: pv.organization || '', licenseNumber: pv.license_number }))
    }
    if (key === 'service') {
      const svc = mockServices.find(s => String(s.id) === val)
      if (svc) setForm(f => ({ ...f, service: val, serviceCode: svc.code }))
    }
  }

  const handleFileDrop = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const names = Array.from(e.target.files).map(f => f.name)
      setUploadedFiles(prev => [...prev, ...names])
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    setTimeout(() => navigate('/auth-requests'), 2000)
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <div className="w-16 h-16 rounded-full bg-[#f0fdf4] flex items-center justify-center mb-4">
          <CheckCircle className="w-8 h-8 text-[#16a34a]" />
        </div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-1">Authorization Submitted</h2>
        <p className="text-sm text-slate-500">Redirecting to authorization requests...</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/auth-requests')} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-[#232833] transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">New Authorization</h1>
          <p className="text-sm text-slate-500 mt-0.5">Submit a new prior authorization request</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Patient */}
        <Card>
          <CardHeader><CardTitle>Patient Information</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Select label="Patient" options={[{ value: '', label: 'Select patient...' }, ...mockPatients.map(p => ({ value: String(p.id), label: p.name }))]} value={form.patient} onChange={set('patient')} />
            <Input label="Member ID" placeholder="MBR-XXXX" value={form.memberId} onChange={set('memberId')} />
            <Input label="Date of Birth" type="date" value={form.dob} onChange={set('dob')} />
            <Select label="Gender" options={[{ value: '', label: 'Select...' }, { value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }, { value: 'other', label: 'Other' }]} value={form.gender} onChange={set('gender')} />
            <div className="col-span-2">
              <Select label="Insurance Plan" options={[{ value: '', label: 'Select plan...' }, ...mockInsurancePlans.map(p => ({ value: String(p.id), label: p.name }))]} value={form.insurancePlan} onChange={set('insurancePlan')} />
            </div>
          </CardContent>
        </Card>

        {/* Provider */}
        <Card>
          <CardHeader><CardTitle>Provider Information</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Select label="Provider" options={[{ value: '', label: 'Select provider...' }, ...mockProviders.map(p => ({ value: String(p.id), label: p.name }))]} value={form.provider} onChange={set('provider')} />
            <Input label="Organization" placeholder="Medical Center" value={form.organization} onChange={set('organization')} />
            <div className="col-span-2">
              <Input label="License Number" placeholder="LIC-XXXXX" value={form.licenseNumber} onChange={set('licenseNumber')} />
            </div>
          </CardContent>
        </Card>

        {/* Request */}
        <Card>
          <CardHeader><CardTitle>Request Details</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Select label="Service" options={[{ value: '', label: 'Select service...' }, ...mockServices.map(s => ({ value: String(s.id), label: s.name }))]} value={form.service} onChange={set('service')} />
            <Input label="Service Code" placeholder="SVC-XXXXX" value={form.serviceCode} onChange={set('serviceCode')} readOnly />
            <div className="col-span-2">
              <Input label="Diagnosis" placeholder="Enter diagnosis..." value={form.diagnosis} onChange={set('diagnosis')} required />
            </div>
            <Select label="Priority" options={[{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }, { value: 'urgent', label: 'Urgent' }]} value={form.priority} onChange={set('priority')} />
            <div className="col-span-2">
              <Textarea label="Clinical Notes" placeholder="Enter clinical notes, history, and supporting information..." value={form.clinicalNotes} onChange={set('clinicalNotes')} className="min-h-[140px]" />
            </div>
          </CardContent>
        </Card>

        {/* Documents */}
        <Card>
          <CardHeader><CardTitle>Supporting Documents</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <label className="flex flex-col items-center justify-center h-28 border-2 border-dashed border-[#e5e7eb] dark:border-[#232833] rounded-lg cursor-pointer hover:border-[#2563eb] hover:bg-[#eff6ff]/30 dark:hover:bg-[#2563eb]/5 transition-colors">
              <Upload className="w-6 h-6 text-slate-400 mb-2" />
              <p className="text-sm text-slate-500">Click to upload or drag and drop</p>
              <p className="text-xs text-slate-400">PDF, PNG, JPG up to 10MB</p>
              <input type="file" multiple className="hidden" onChange={handleFileDrop} accept=".pdf,.png,.jpg,.jpeg" />
            </label>
            {uploadedFiles.length > 0 && (
              <ul className="space-y-2">
                {uploadedFiles.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 p-2.5 rounded-lg bg-[#f9fafb] dark:bg-[#12151c] border border-[#e5e7eb] dark:border-[#232833]">
                    <FileText className="w-4 h-4 text-[#2563eb] flex-shrink-0" />
                    <span className="text-sm text-slate-700 dark:text-slate-300 flex-1 truncate">{f}</span>
                    <button type="button" onClick={() => setUploadedFiles(prev => prev.filter((_, j) => j !== i))} className="text-slate-400 hover:text-[#dc2626]">
                      <X className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="flex items-center justify-between pt-2">
          <Button variant="secondary" type="button" onClick={() => navigate('/auth-requests')}>Cancel</Button>
          <Button type="submit" size="lg" className="gap-2">Submit Authorization</Button>
        </div>
      </form>
    </div>
  )
}
