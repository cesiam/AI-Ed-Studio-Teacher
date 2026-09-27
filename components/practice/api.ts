import type { CreateSessionRequest, ContactRole, DocLetter, HistoryDetail, HistoryItem, ScenarioSummary, SessionView } from '@/lib/api-types'

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'content-type': 'application/json', ...init?.headers },
    cache: 'no-store',
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status})`)
  return body as T
}

const post = <T>(url: string, body?: unknown) =>
  call<T>(url, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) })

export const api = {
  scenarios: () => call<{ scenarios: ScenarioSummary[] }>('/api/scenarios'),
  uploadScenario: (body: { json: unknown } | { description: string }) =>
    post<{ scenarios: ScenarioSummary[] }>('/api/scenarios', body),
  recentSessions: () =>
    call<{ sessions: { id: string; created_at: string; temperature: string; mode: string; seed: number; status: string }[] }>(
      '/api/sessions',
    ),
  createSession: (req: CreateSessionRequest) => post<SessionView>('/api/sessions', req),
  session: (id: string) => call<SessionView>(`/api/sessions/${id}`),
  history: () => call<{ sessions: HistoryItem[] }>('/api/history'),
  historyDetail: (id: string) => call<HistoryDetail>(`/api/history/${id}`),
  start: (id: string) => post<SessionView>(`/api/sessions/${id}/start`),
  speak: (id: string, message: string, show?: DocLetter, to?: 'both' | 'parent' | 'student' | 'staff', print?: boolean) =>
    post<SessionView>(`/api/sessions/${id}/turns`, { message, show, to, print }),
  join: (id: string, role: ContactRole) => post<SessionView>(`/api/sessions/${id}/join`, { role }),
  consult: (id: string, role: ContactRole, message: string) =>
    post<SessionView>(`/api/sessions/${id}/contacts`, { role, message }),
  end: (id: string) => post<SessionView>(`/api/sessions/${id}/end`),
  advance: (id: string) => post<SessionView>(`/api/sessions/${id}/advance`),
  coach: (id: string) => call<{ tip: string; after_event: number }>(`/api/sessions/${id}/coach`),
  saveForm: (id: string, idx: number, form: Record<string, string>) =>
    call<{ ok: true }>(`/api/sessions/${id}/form`, { method: 'PUT', body: JSON.stringify({ idx, form }) }),
  transcribe: async (audio: Blob) => {
    const form = new FormData()
    form.append('audio', audio)
    const res = await fetch('/api/transcribe', { method: 'POST', body: form, cache: 'no-store' })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status})`)
    return body as { text: string }
  },
}
