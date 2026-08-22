const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:8000/api/v1";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!response.ok) {
    const text = await response.text().catch(() => response.statusText);
    throw new Error(text || `HTTP ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export const api = {
  // Authorization Requests
  getAuthorizations: (params?: Record<string, string>) => {
    const qs = params ? `?${new URLSearchParams(params).toString()}` : "";
    return request<{ total: number; cases: unknown[] }>(`/authorizations${qs}`);
  },
  getAuthorization: (id: string) => request<unknown>(`/authorizations/${id}`),
  createAuthorization: (data: unknown) =>
    request<unknown>("/authorizations", { method: "POST", body: JSON.stringify(data) }),
  processAuthorization: (id: string) =>
    request<unknown>(`/authorizations/${id}/process`, { method: "POST" }),
  submitDecision: (id: string, data: { decision: string; rationale: string }) =>
    request<unknown>(`/authorizations/${id}/decision`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  // AI Triage
  runTriage: (data: unknown) =>
    request<unknown>("/ai/triage", { method: "POST", body: JSON.stringify(data) }),
  whatIf: (data: unknown) =>
    request<unknown>("/ai/what-if", { method: "POST", body: JSON.stringify(data) }),

  // Policies
  getPolicies: (params?: Record<string, string>) => {
    const qs = params ? `?${new URLSearchParams(params).toString()}` : "";
    return request<unknown[]>(`/policies${qs}`);
  },
  getPolicy: (id: string) => request<unknown>(`/policies/${id}`),
  queryPolicy: (data: { query: string; category?: string }) =>
    request<unknown>("/policies/query", { method: "POST", body: JSON.stringify(data) }),

  // Analytics
  getKPIs: () => request<unknown>("/analytics/kpis"),
  getTrends: () => request<unknown>("/analytics/trends"),
  getServiceBreakdown: () => request<unknown>("/analytics/by-service"),
  getAIPerformance: () => request<unknown>("/analytics/ai-performance"),

  // Module 3: Validation & Preprocessing
  /** Run (or re-run) the full 4-step validation & preprocessing pipeline */
  runValidation: (caseId: string) =>
    request<unknown>(`/validation/${caseId}/run`, { method: "POST" }),
  /** Fetch the stored validation result without re-running */
  getValidationResult: (caseId: string) =>
    request<unknown>(`/validation/${caseId}`),
  /** Fetch the combined Structured PA JSON (the final pipeline output) */
  getStructuredPA: (caseId: string) =>
    request<unknown>(`/validation/${caseId}/structured-pa`),
  /** Re-apply / upload missing documentation for an existing case */
  reapplyAuthorization: (caseId: string, data: { newDocuments?: any[]; additionalNotes?: string }) =>
    request<unknown>(`/validation/${caseId}/reapply`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Module 4: Context & Policy Mapping
  /** Map a provider-supplied policyId / serviceCode to the applicable ruleset */
  mapPolicy: (data: { policyId?: string; serviceCode?: string; codingSystem?: string; caseId?: string }) =>
    request<unknown>("/context/map-policy", { method: "POST", body: JSON.stringify(data) }),
  /** Return the full policy index (all known policy IDs + names) */
  getPolicyIndex: () =>
    request<unknown>("/context/index"),
  /** Validate that a policyId exists without loading the full ruleset */
  lookupPolicy: (policyId: string) =>
    request<unknown>(`/context/lookup/${policyId}`),

  // Rule-based evaluation
  runRuleEvaluation: (caseId: string) =>
    request<unknown>(`/evaluation/${caseId}/run`, { method: "POST" }),
  getRuleEvaluation: (caseId: string) =>
    request<unknown>(`/evaluation/${caseId}`),

  // Module 6A: Policy Evidence & LLM Explanation + Policy Companion
  /** Fetch stored RAG evidence + LLM explanation (202 if still generating) */
  getExplanation: (caseId: string) =>
    request<unknown>(`/explanation/${caseId}`),
  /** Fetch all Policy Companion chat messages for a case */
  getCompanionMessages: (caseId: string) =>
    request<unknown[]>(`/explanation/${caseId}/messages`),
  /** Send a payer question to the Policy Companion and get a grounded answer */
  sendCompanionMessage: (caseId: string, question: string) =>
    request<unknown>(`/explanation/${caseId}/chat`, {
      method: "POST",
      body: JSON.stringify({ question }),
    }),

  // Users
  login: (email: string, password: string) =>
    request<unknown>("/users/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  getNotifications: () => request<unknown[]>("/users/notifications"),
  markNotificationRead: (id: string) =>
    request<unknown>(`/users/notifications/${id}/read`, { method: "PATCH" }),
  markAllNotificationsRead: () =>
    request<unknown>("/users/notifications/read-all", { method: "PATCH" }),
  getAuditTrail: () => request<unknown[]>("/users/audit-trail"),
};
