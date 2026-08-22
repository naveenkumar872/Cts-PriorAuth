import { useState } from 'react'
import { Search, CheckCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { mockPolicies } from '@/lib/mockData'

export default function PolicyCompanion() {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(mockPolicies[0])
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', text: 'Hello! Ask me about coverage policies, authorization criteria, or specific procedures. I can help you find relevant policy rules and requirements.' }
  ])

  const handleQuery = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    setChatMessages(prev => [
      ...prev,
      { role: 'user', text: query },
      { role: 'assistant', text: `Based on the ${selected.name} (v${selected.version}), here is the relevant policy information for your query about "${query}": ${selected.rules?.[0]?.rule || 'Please review the policy rules on the right.'}` }
    ])
    setQuery('')
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">Policy Companion</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Ask about coverage policies and authorization criteria</p>
      </div>

      <div className="grid grid-cols-2 gap-5 h-[calc(100vh-200px)]">
        {/* Left: Chat */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-4 h-4 text-[#2563eb]" />Ask about a coverage policy...
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
            {/* Policy selector */}
            <div className="px-4 pb-3 border-b border-[#f1f5f9] dark:border-[#232833]">
              <select
                value={selected.id}
                onChange={e => setSelected(mockPolicies.find(p => p.id === Number(e.target.value)) || mockPolicies[0])}
                className="w-full h-9 px-3 text-sm rounded-lg border border-[#e5e7eb] dark:border-[#232833] bg-white dark:bg-[#181c24] text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
              >
                {mockPolicies.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-lg px-3.5 py-2.5 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#2563eb] text-white'
                      : 'bg-[#f9fafb] dark:bg-[#12151c] text-slate-700 dark:text-slate-300 border border-[#e5e7eb] dark:border-[#232833]'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <form onSubmit={handleQuery} className="p-4 border-t border-[#f1f5f9] dark:border-[#232833] flex gap-2">
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Ask about coverage requirements, criteria, or policies..."
                className="flex-1 h-10 px-3 text-sm rounded-lg border border-[#e5e7eb] dark:border-[#232833] bg-[#f9fafb] dark:bg-[#12151c] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
              />
              <button type="submit" className="h-10 px-4 bg-[#2563eb] text-white text-sm font-medium rounded-lg hover:bg-[#1d4ed8] transition-colors">
                Ask
              </button>
            </form>
          </CardContent>
        </Card>

        {/* Right: Policy viewer */}
        <Card className="flex flex-col overflow-hidden">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>{selected.name}</CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">Version {selected.version} · {selected.insurance_plan?.name}</p>
              </div>
              <Badge variant={selected.active ? 'success' : 'slate'}>{selected.active ? 'Active' : 'Inactive'}</Badge>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto space-y-4">
            <div className="p-3 rounded-lg bg-[#f9fafb] dark:bg-[#12151c] text-sm text-slate-700 dark:text-slate-300">
              {selected.content}
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Policy Rules</p>
              <div className="space-y-3">
                {selected.rules?.map(rule => (
                  <div key={rule.id} className="p-3 rounded-lg border border-[#e5e7eb] dark:border-[#232833]">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-3.5 h-3.5 text-[#16a34a] mt-0.5 flex-shrink-0" />
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{rule.rule}</p>
                        <p className="text-xs text-slate-500">{rule.requirement}</p>
                        {rule.source_reference && (
                          <p className="text-[10.5px] font-mono text-[#2563eb]">{rule.source_reference}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Coverage Requirements', text: 'Prior authorization required for all listed services.' },
                { label: 'Medical Necessity', text: 'Clinical documentation of medical necessity required.' },
                { label: 'Required Documents', text: 'Clinical notes, diagnosis codes, and provider attestation.' },
                { label: 'Exclusions', text: 'Cosmetic, experimental, or investigational procedures excluded.' },
              ].map(section => (
                <div key={section.label} className="p-3 rounded-lg bg-[#f9fafb] dark:bg-[#12151c] border border-[#e5e7eb] dark:border-[#232833]">
                  <p className="text-[10.5px] font-bold uppercase tracking-wide text-slate-500 mb-1">{section.label}</p>
                  <p className="text-xs text-slate-700 dark:text-slate-300">{section.text}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
