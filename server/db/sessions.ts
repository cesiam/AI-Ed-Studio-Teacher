import type { ContactRole, DocLetter, SurpriseLetter } from '../content/types'
import type { PlannedScenario, SessionConfig } from '../game/planner'
import { notFound } from '../errors'
import { db, transaction } from './client'

export type SessionStatus = 'active' | 'complete'
export type ScenarioStatus = 'pending' | 'briefing' | 'conference' | 'ended'
export type EndedReason = 'teacher_ended' | 'walkout'

export type EventKind =
  | 'teacher' // teacher speaks
  | 'parent' // parent speaks
  | 'student' // student speaks
  | 'tension' // judge scored a teacher turn; meta: TensionMeta
  | 'surprise' // surprise document delivered; meta: SurpriseMeta
  | 'contact_question' // teacher messaged a support contact; meta: { role }
  | 'contact_reply' // support contact answered; meta: { role, shared_document }
  | 'system' // narration (e.g. parent walks out)
  | 'agreement' // teacher and family agreed on next steps; meta: { steps: string[] }
  | 'staff' // a colleague who came into the room speaks; meta: { role }

export interface TensionMeta {
  before: number
  after: number
  change: number
}

export interface SurpriseMeta {
  letter: SurpriseLetter
}

export interface ContactMeta {
  role: ContactRole
  shared_document?: DocLetter | null
}

export interface SessionRow {
  id: string
  created_at: string
  mode: SessionConfig['mode']
  temperature: SessionConfig['temperature']
  starting_mood: SessionConfig['starting_mood']
  seed: number
  config: SessionConfig
  current_index: number
  status: SessionStatus
  replay_of: string | null
}

export interface SessionScenarioRow {
  session_id: string
  idx: number
  scenario_id: string
  surprise_type: SurpriseLetter
  surprise_turn: number
  status: ScenarioStatus
  tension: number
  turn_count: number
  surprise_delivered_turn: number | null
  revealed_docs: DocLetter[]
  ended_reason: EndedReason | null
  debrief: unknown | null
  form: Record<string, string> | null
}

export interface EventRow {
  id: number
  session_id: string
  idx: number
  turn: number
  kind: EventKind
  speaker: string | null
  content: string
  meta: Record<string, unknown> | null
  created_at: string
}

type Raw = Record<string, unknown>

const parseSession = (r: Raw): SessionRow => ({
  ...(r as unknown as SessionRow),
  seed: Number(r.seed),
  config: JSON.parse(r.config as string),
})

const parseScenario = (r: Raw): SessionScenarioRow => ({
  ...(r as unknown as SessionScenarioRow),
  revealed_docs: JSON.parse(r.revealed_docs as string),
  debrief: r.debrief ? JSON.parse(r.debrief as string) : null,
  form: r.form ? JSON.parse(r.form as string) : null,
})

const parseEvent = (r: Raw): EventRow => ({
  ...(r as unknown as EventRow),
  meta: r.meta ? JSON.parse(r.meta as string) : null,
})

export function createSession(input: {
  id: string
  seed: number
  config: SessionConfig
  plan: PlannedScenario[]
  startingTension: number
  replayOf: string | null
}): void {
  const { id, seed, config, plan, startingTension, replayOf } = input
  transaction(() => {
    db()
      .prepare(
        `INSERT INTO sessions (id, created_at, mode, temperature, starting_mood, seed, config, current_index, status, replay_of)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'active', ?)`,
      )
      .run(
        id,
        new Date().toISOString(),
        config.mode,
        config.temperature,
        config.starting_mood,
        seed,
        JSON.stringify(config),
        replayOf,
      )
    const insert = db().prepare(
      `INSERT INTO session_scenarios (session_id, idx, scenario_id, surprise_type, surprise_turn, status, tension)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    plan.forEach((p, idx) => {
      insert.run(id, idx, p.scenario_id, p.surprise_type, p.surprise_turn, idx === 0 ? 'briefing' : 'pending', startingTension)
    })
  })
}

export function getSession(id: string): SessionRow {
  const row = db().prepare('SELECT * FROM sessions WHERE id = ?').get(id) as Raw | undefined
  if (!row) throw notFound(`Session ${id} not found.`)
  return parseSession(row)
}

export function listSessions(limit = 20): SessionRow[] {
  const rows = db().prepare('SELECT * FROM sessions ORDER BY created_at DESC LIMIT ?').all(limit) as Raw[]
  return rows.map(parseSession)
}

/** Sessions where at least one conference got under way, newest first. */
export function listSessionsWithConferences(limit = 100): SessionRow[] {
  const rows = db()
    .prepare(
      `SELECT * FROM sessions s
       WHERE EXISTS (SELECT 1 FROM session_scenarios c WHERE c.session_id = s.id AND c.status IN ('conference', 'ended'))
       ORDER BY created_at DESC LIMIT ?`,
    )
    .all(limit) as Raw[]
  return rows.map(parseSession)
}

export function getSessionScenarios(sessionId: string): SessionScenarioRow[] {
  const rows = db()
    .prepare('SELECT * FROM session_scenarios WHERE session_id = ? ORDER BY idx')
    .all(sessionId) as Raw[]
  return rows.map(parseScenario)
}

export function getSessionScenario(sessionId: string, idx: number): SessionScenarioRow {
  const row = db()
    .prepare('SELECT * FROM session_scenarios WHERE session_id = ? AND idx = ?')
    .get(sessionId, idx) as Raw | undefined
  if (!row) throw notFound(`Scenario ${idx} of session ${sessionId} not found.`)
  return parseScenario(row)
}

export function updateSessionScenario(
  sessionId: string,
  idx: number,
  patch: Partial<
    Pick<
      SessionScenarioRow,
      'status' | 'tension' | 'turn_count' | 'surprise_delivered_turn' | 'revealed_docs' | 'ended_reason' | 'debrief' | 'form'
    >
  >,
): void {
  const cols: string[] = []
  const values: (string | number | null)[] = []
  for (const [key, value] of Object.entries(patch)) {
    cols.push(`${key} = ?`)
    if (key === 'revealed_docs' || key === 'debrief' || key === 'form') values.push(value == null ? null : JSON.stringify(value))
    else values.push(value as string | number | null)
  }
  if (cols.length === 0) return
  db()
    .prepare(`UPDATE session_scenarios SET ${cols.join(', ')} WHERE session_id = ? AND idx = ?`)
    .run(...values, sessionId, idx)
}

export function updateSession(id: string, patch: Partial<Pick<SessionRow, 'current_index' | 'status'>>): void {
  const cols = Object.keys(patch).map((k) => `${k} = ?`)
  if (cols.length === 0) return
  db()
    .prepare(`UPDATE sessions SET ${cols.join(', ')} WHERE id = ?`)
    .run(...(Object.values(patch) as (string | number)[]), id)
}

export function addEvent(e: {
  sessionId: string
  idx: number
  turn: number
  kind: EventKind
  speaker?: string | null
  content: string
  meta?: object | null
}): EventRow {
  const createdAt = new Date().toISOString()
  const result = db()
    .prepare(
      `INSERT INTO events (session_id, idx, turn, kind, speaker, content, meta, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(e.sessionId, e.idx, e.turn, e.kind, e.speaker ?? null, e.content, e.meta ? JSON.stringify(e.meta) : null, createdAt)
  return {
    id: Number(result.lastInsertRowid),
    session_id: e.sessionId,
    idx: e.idx,
    turn: e.turn,
    kind: e.kind,
    speaker: e.speaker ?? null,
    content: e.content,
    meta: (e.meta as Record<string, unknown>) ?? null,
    created_at: createdAt,
  }
}

export function getEvents(sessionId: string, idx?: number): EventRow[] {
  const rows =
    idx === undefined
      ? (db().prepare('SELECT * FROM events WHERE session_id = ? ORDER BY id').all(sessionId) as Raw[])
      : (db()
          .prepare('SELECT * FROM events WHERE session_id = ? AND idx = ? ORDER BY id')
          .all(sessionId, idx) as Raw[])
  return rows.map(parseEvent)
}
