import { useState } from 'react'
import { Users, Shield, Building2, Stethoscope, BookOpen, Plus, Edit, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { mockUsers, mockInsurancePlans, mockProviders, mockServices, mockPolicies } from '@/lib/mockData'
import { formatDate, getInitials } from '@/lib/utils'

type Tab = 'users' | 'plans' | 'providers' | 'services' | 'policies'

const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'users', label: 'Users', icon: Users },
  { id: 'plans', label: 'Insurance Plans', icon: Building2 },
  { id: 'providers', label: 'Providers', icon: Stethoscope },
  { id: 'services', label: 'Services', icon: Shield },
  { id: 'policies', label: 'Policies', icon: BookOpen },
]

export default function Administration() {
  const [tab, setTab] = useState<Tab>('users')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">Administration</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Manage users, plans, providers, and policies</p>
        </div>
        <Button className="gap-2"><Plus className="w-4 h-4" /> Add New</Button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-[#f9fafb] dark:bg-[#181c24] p-1 rounded-lg border border-[#e5e7eb] dark:border-[#232833] w-fit">
        {tabs.map(t => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === t.id ? 'bg-white dark:bg-[#232833] text-slate-900 dark:text-slate-100 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Users */}
      {tab === 'users' && (
        <Card>
          <CardHeader><CardTitle>User Management</CardTitle></CardHeader>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#f1f5f9] dark:border-[#232833]">
                {['User', 'Email', 'Role', 'Created', 'Actions'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f9fafb] dark:divide-[#1e2634]">
              {mockUsers.map(u => (
                <tr key={u.id} className="hover:bg-[#f9fafb] dark:hover:bg-[#1a1e28]">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-[#2563eb]/10 flex items-center justify-center text-[#2563eb] text-xs font-semibold">{getInitials(u.name)}</div>
                      <span className="font-medium text-slate-900 dark:text-slate-100">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-slate-600 dark:text-slate-400">{u.email}</td>
                  <td className="px-4 py-3.5"><Badge variant="primary">{u.role}</Badge></td>
                  <td className="px-4 py-3.5 text-slate-500">{formatDate(u.created_at)}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1">
                      <button className="p-1.5 rounded text-slate-400 hover:text-[#2563eb] hover:bg-slate-100 dark:hover:bg-[#232833]"><Edit className="w-3.5 h-3.5" /></button>
                      <button className="p-1.5 rounded text-slate-400 hover:text-[#dc2626] hover:bg-slate-100 dark:hover:bg-[#232833]"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Insurance Plans */}
      {tab === 'plans' && (
        <Card>
          <CardHeader><CardTitle>Insurance Plans</CardTitle></CardHeader>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#f1f5f9] dark:border-[#232833]">
                {['Plan Name', 'Provider', 'Type', 'Status', 'Actions'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f9fafb] dark:divide-[#1e2634]">
              {mockInsurancePlans.map(p => (
                <tr key={p.id} className="hover:bg-[#f9fafb] dark:hover:bg-[#1a1e28]">
                  <td className="px-4 py-3.5 font-medium text-slate-900 dark:text-slate-100">{p.name}</td>
                  <td className="px-4 py-3.5 text-slate-600 dark:text-slate-400">{p.provider}</td>
                  <td className="px-4 py-3.5"><Badge variant="blue">{p.plan_type}</Badge></td>
                  <td className="px-4 py-3.5"><Badge variant={p.active ? 'success' : 'slate'}>{p.active ? 'Active' : 'Inactive'}</Badge></td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1">
                      <button className="p-1.5 rounded text-slate-400 hover:text-[#2563eb] hover:bg-slate-100 dark:hover:bg-[#232833]"><Edit className="w-3.5 h-3.5" /></button>
                      <button className="p-1.5 rounded text-slate-400 hover:text-[#dc2626] hover:bg-slate-100 dark:hover:bg-[#232833]"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Providers */}
      {tab === 'providers' && (
        <Card>
          <CardHeader><CardTitle>Providers</CardTitle></CardHeader>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#f1f5f9] dark:border-[#232833]">
                {['Provider', 'Organization', 'License', 'Actions'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f9fafb] dark:divide-[#1e2634]">
              {mockProviders.map(p => (
                <tr key={p.id} className="hover:bg-[#f9fafb] dark:hover:bg-[#1a1e28]">
                  <td className="px-4 py-3.5 font-medium text-slate-900 dark:text-slate-100">{p.name}</td>
                  <td className="px-4 py-3.5 text-slate-600 dark:text-slate-400">{p.organization}</td>
                  <td className="px-4 py-3.5 font-mono text-xs text-slate-500">{p.license_number}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1">
                      <button className="p-1.5 rounded text-slate-400 hover:text-[#2563eb] hover:bg-slate-100 dark:hover:bg-[#232833]"><Edit className="w-3.5 h-3.5" /></button>
                      <button className="p-1.5 rounded text-slate-400 hover:text-[#dc2626] hover:bg-slate-100 dark:hover:bg-[#232833]"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Services */}
      {tab === 'services' && (
        <Card>
          <CardHeader><CardTitle>Services</CardTitle></CardHeader>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#f1f5f9] dark:border-[#232833]">
                {['Service', 'Code', 'Description', 'Actions'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f9fafb] dark:divide-[#1e2634]">
              {mockServices.map(s => (
                <tr key={s.id} className="hover:bg-[#f9fafb] dark:hover:bg-[#1a1e28]">
                  <td className="px-4 py-3.5 font-medium text-slate-900 dark:text-slate-100">{s.name}</td>
                  <td className="px-4 py-3.5 font-mono text-xs text-slate-500 bg-slate-50 dark:bg-[#1a1e28]">{s.code}</td>
                  <td className="px-4 py-3.5 text-slate-600 dark:text-slate-400 max-w-xs truncate">{s.description}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1">
                      <button className="p-1.5 rounded text-slate-400 hover:text-[#2563eb] hover:bg-slate-100 dark:hover:bg-[#232833]"><Edit className="w-3.5 h-3.5" /></button>
                      <button className="p-1.5 rounded text-slate-400 hover:text-[#dc2626] hover:bg-slate-100 dark:hover:bg-[#232833]"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Policies */}
      {tab === 'policies' && (
        <div className="space-y-3">
          {mockPolicies.map(p => (
            <Card key={p.id} hover>
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{p.name}</p>
                      <Badge variant="slate">v{p.version}</Badge>
                      <Badge variant={p.active ? 'success' : 'slate'}>{p.active ? 'Active' : 'Inactive'}</Badge>
                    </div>
                    <p className="text-xs text-slate-500">{p.insurance_plan?.name} · {p.rules?.length || 0} rules</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed max-w-2xl">{p.content}</p>
                  </div>
                  <div className="flex items-center gap-1 ml-4">
                    <button className="p-1.5 rounded text-slate-400 hover:text-[#2563eb] hover:bg-slate-100 dark:hover:bg-[#232833]"><Edit className="w-3.5 h-3.5" /></button>
                    <button className="p-1.5 rounded text-slate-400 hover:text-[#dc2626] hover:bg-slate-100 dark:hover:bg-[#232833]"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
                {p.rules && p.rules.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-[#f1f5f9] dark:border-[#232833]">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">Rules</p>
                    <div className="space-y-1.5">
                      {p.rules.map(r => (
                        <div key={r.id} className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#2563eb] mt-1.5 flex-shrink-0" />
                          <p className="text-xs text-slate-600 dark:text-slate-400">{r.rule}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
