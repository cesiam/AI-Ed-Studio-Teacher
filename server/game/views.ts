import type {
  DebriefView,
  HistoryDetail,
  HistoryItem,
  DeliveryView,
  DocumentView,
  EventView,
  PlanItemView,
  ScenarioSummary,
  ScenarioView,
  SessionView,
} from '@/lib/api-types'
import { BRIEFING_DOCS, CONTACT_ROLES, firstName, type DocLetter, type Scenario } from '../content/types'
import { getScenario } from '../db/scenarios'
import {
  getEvents,
  getSessionScenarios,
  type EventRow,
  type SessionRow,
  type SessionScenarioRow,
} from '../db/sessions'
import { arrivalNote, demeanorFor, tensionRange } from './tension'

export function scenarioSummary(s: Scenario): ScenarioSummary {
  return {
    id: s.id,
    status: s.status,
    title: s.title,
    topic: s.topic,
    raised_by: s.raised_by,
    student_name: s.student_name,
    grade: s.grade,
    tutorial: !!s.tutorial,
  }
}

/** Letters the teacher may open right now: A-D plus any E/F that has been delivered or shared, if the scenario has them. */
export function visibleDocs(row: SessionScenarioRow, s: Scenario): DocLetter[] {
  return [...BRIEFING_DOCS, ...row.revealed_docs.filter((l) => !BRIEFING_DOCS.includes(l))].filter((l) => s.documents[l])
}

export function documentUrl(sessionId: string, idx: number, letter: DocLetter): string {
  return `/api/sessions/${sessionId}/scenarios/${idx}/documents/${letter}`
}

function receivedFrom(s: Scenario, row: SessionScenarioRow, events: EventRow[], letter: DocLetter): string | undefined {
  const shared = events.find((e) => e.kind === 'contact_reply' && e.meta?.shared_document === letter)
  if (shared) return s.support_contacts[shared.meta!.role as keyof Scenario['support_contacts']].name
  if (row.surprise_delivered_turn != null && row.surprise_type === letter) {
    return s.documents[letter as 'E' | 'F']?.delivery.from
  }
  return undefined
}

/** Who has walked in (a 'system' event with meta.joined). */
export function inRoom(s: Scenario, events: EventRow[]): ScenarioView['in_room'] {
  const joined = [...events].reverse().find((e) => e.kind === 'system' && e.meta?.joined)
  if (!joined) return null
  const role = joined.meta!.joined as keyof Scenario['support_contacts']
  return { role, name: s.support_contacts[role].name, title: s.support_contacts[role].title }
}

function eventView(e: EventRow): EventView {
  return {
    id: e.id,
    turn: e.turn,
    kind: e.kind,
    speaker: e.speaker,
    content: e.content,
    meta: e.meta,
    created_at: e.created_at,
  }
}

export function scenarioView(session: SessionRow, row: SessionScenarioRow): ScenarioView {
  const s = getScenario(row.scenario_id)
  const events = getEvents(session.id, row.idx)

  const documents: DocumentView[] = visibleDocs(row, s).map((letter) => {
    const d = s.documents[letter]!
    return {
      letter,
      title: d.title,
      source: d.source,
      citation: letter === 'D' ? s.documents.D?.citation : undefined,
      kind: letter === 'D' ? 'policy' : letter === 'E' || letter === 'F' ? 'surprise' : 'record',
      url: documentUrl(session.id, row.idx, letter),
      received_from: receivedFrom(s, row, events, letter),
    }
  })

  const surpriseDoc = s.documents[row.surprise_type]
  const surprise =
    row.surprise_delivered_turn != null && surpriseDoc
      ? {
          letter: row.surprise_type,
          turn: row.surprise_delivered_turn,
          delivery: surpriseDoc.delivery as DeliveryView,
        }
      : null

  return {
    idx: row.idx,
    scenario_id: s.id,
    title: s.title,
    tutorial: !!s.tutorial,
    topic: s.topic,
    research: s.research,
    raised_by: s.raised_by,
    student_name: s.student_name,
    student_first_name: firstName(s.student_name),
    grade: s.grade,
    school: s.setting.school,
    teacher_role: s.setting.teacher_role,
    meeting_context: s.setting.meeting_context,
    arrival: arrivalNote(s.parent_persona, s.raised_by, tensionRange(session.config).start),
    demeanor: demeanorFor(s),
    teacher_concern: s.teacher_concern,
    student_strength: s.student_strength,
    parent: { name: s.parent_persona.name, relationship: s.parent_persona.relationship },
    status: row.status,
    tension: row.tension,
    starting_tension: tensionRange(session.config).start,
    tension_range: { min: tensionRange(session.config).min, max: tensionRange(session.config).max },
    turn_count: row.turn_count,
    ended_reason: row.ended_reason,
    documents,
    contacts: CONTACT_ROLES.map((role) => ({
      role,
      name: s.support_contacts[role].name,
      title: s.support_contacts[role].title,
      can_join: !!s.support_contacts[role].can_join,
    })),
    in_room: inRoom(s, events),
    events: events.map(eventView),
    surprise,
    debrief: (row.debrief as DebriefView | null) ?? null,
    notes_form: row.form ?? {},
  }
}

export function sessionView(session: SessionRow): SessionView {
  const rows = getSessionScenarios(session.id)
  const plan: PlanItemView[] = rows.map((row) => {
    const s = getScenario(row.scenario_id)
    // Scenarios without a surprise document (the tutorial) never get one.
    const showSurprise = !!s.documents[row.surprise_type] && (session.temperature === 'low' || row.status === 'ended')
    return {
      idx: row.idx,
      scenario_id: row.scenario_id,
      title: s.title,
      student_name: s.student_name,
      status: row.status,
      tension: row.tension,
      ended_reason: row.ended_reason,
      surprise_plan: showSurprise ? { type: row.surprise_type, turn: row.surprise_turn } : null,
    }
  })
  const currentRow = rows.find((r) => r.idx === session.current_index)

  return {
    id: session.id,
    created_at: session.created_at,
    mode: session.mode,
    temperature: session.temperature,
    starting_mood: session.starting_mood,
    seed: session.seed,
    teacher_name: session.config.teacher_name,
    status: session.status,
    replay_of: session.replay_of,
    current_index: session.current_index,
    plan,
    current: currentRow ? scenarioView(session, currentRow) : null,
  }
}

export function historyItem(session: SessionRow): HistoryItem {
  const start = tensionRange(session.config).start
  return {
    id: session.id,
    created_at: session.created_at,
    teacher_name: session.config.teacher_name,
    status: session.status,
    conferences: getSessionScenarios(session.id).map((row) => {
      const s = getScenario(row.scenario_id)
      return {
        idx: row.idx,
        title: s.title,
        student_name: s.student_name,
        parent_name: s.parent_persona.name,
        status: row.status,
        starting_tension: start,
        tension: row.tension,
        turn_count: row.turn_count,
        ended_reason: row.ended_reason,
      }
    }),
  }
}

/** Only conferences that actually started have a transcript worth showing. */
export function historyDetail(session: SessionRow): HistoryDetail {
  return {
    item: historyItem(session),
    conferences: getSessionScenarios(session.id)
      .filter((row) => row.status === 'conference' || row.status === 'ended')
      .map((row) => scenarioView(session, row)),
  }
}
