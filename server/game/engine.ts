import { randomUUID } from 'node:crypto'
import { contactReply, staffLine } from '../ai/contacts'
import { parentLine, studentLine } from '../ai/characters'
import { debriefConference } from '../ai/debrief'
import { agreedSteps, newAgreements } from '../ai/agreement'
import { judgeTurn } from '../ai/judge'
import { GAME } from '../config'
import { CONTACT_ROLES, firstName, type ContactRole, type DocLetter, type Scenario } from '../content/types'
import { said } from '../ai/transcript'
import { badRequest, conflict } from '../errors'
import { getScenario, listScenarios } from '../db/scenarios'
import {
  addEvent,
  createSession,
  getEvents,
  getSession,
  getSessionScenario,
  getSessionScenarios,
  updateSession,
  updateSessionScenario,
  type EndedReason,
  type SessionRow,
  type SessionScenarioRow,
} from '../db/sessions'
import { buildPlan, parseConfig } from './planner'
import { newSeed } from './rng'
import { applyChange, MAX_TENSION, tensionRange } from './tension'
import { inRoom, visibleDocs } from './views'

// ---------------------------------------------------------------------------
// Per-session lock. Each action makes several model calls; a double-submit
// must not interleave two turns. (Single-process server, so memory is enough.)
// ---------------------------------------------------------------------------
const busy = new Set<string>()

async function withLock<T>(sessionId: string, fn: () => Promise<T>): Promise<T> {
  if (busy.has(sessionId)) throw conflict('This session is still working on the previous action.')
  busy.add(sessionId)
  try {
    return await fn()
  } finally {
    busy.delete(sessionId)
  }
}

interface Current {
  session: SessionRow
  row: SessionScenarioRow
  scenario: Scenario
}

function current(sessionId: string): Current {
  const session = getSession(sessionId)
  if (session.status === 'complete') throw conflict('This session is complete.')
  const row = getSessionScenario(sessionId, session.current_index)
  return { session, row, scenario: getScenario(row.scenario_id) }
}

function requireStatus(row: SessionScenarioRow, status: SessionScenarioRow['status'], action: string) {
  if (row.status !== status) throw conflict(`Can't ${action}: this scenario is in "${row.status}", not "${status}".`)
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

/** Creates a session from a setup request, a replay of another session, or an explicit seed. */
export function createSessionFromRequest(body: Record<string, unknown>): string {
  let config
  let seed: number
  let replayOf: string | null = null

  if (typeof body.replay_of === 'string') {
    const original = getSession(body.replay_of)
    config = original.config
    seed = original.seed
    replayOf = original.id
  } else {
    config = parseConfig(body, listScenarios())
    if (body.seed !== undefined) {
      seed = Number(body.seed)
      if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw badRequest('seed must be a 32-bit unsigned integer.')
    } else {
      seed = newSeed()
    }
  }

  const plan = buildPlan(config, seed)
  const id = randomUUID()
  createSession({ id, seed, config, plan, startingTension: tensionRange(config).start, replayOf })
  return id
}

// ---------------------------------------------------------------------------
// Conference
// ---------------------------------------------------------------------------

/** Leaves the briefing and seats the family. The parent says the first line. */
export function startConference(sessionId: string) {
  return withLock(sessionId, async () => {
    const { session, row, scenario } = current(sessionId)
    requireStatus(row, 'briefing', 'start the conference')

    const line = await parentLine({
      scenario,
      teacherName: session.config.teacher_name,
      events: [],
      tension: row.tension,
      opening: true,
    })
    updateSessionScenario(sessionId, row.idx, { status: 'conference' })
    addEvent({ sessionId, idx: row.idx, turn: 0, kind: 'parent', speaker: scenario.parent_persona.name, content: line })
  })
}

/**
 * One teacher turn:
 *   1. record what the teacher said
 *   2. judge scores it -> tension moves (the parent's tone follows the new value)
 *   3. parent and/or student respond; at 100 the parent walks out instead
 *   4. deliver the surprise document if this is its turn
 */
/** Who the teacher is talking to. "both" leaves it to the judge who answers. */
export type Audience = 'both' | 'parent' | 'student' | 'staff'

export function takeTurn(sessionId: string, message: string, show?: string, to: Audience = 'both', printed = false) {
  const text = message.trim()
  if (!text && !show) throw badRequest('message is empty.')
  if (text.length > GAME.maxTeacherMessageLength) {
    throw badRequest(`message is too long (max ${GAME.maxTeacherMessageLength} characters).`)
  }

  return withLock(sessionId, async () => {
    const { session, row, scenario } = current(sessionId)
    requireStatus(row, 'conference', 'speak')
    const idx = row.idx
    const turn = row.turn_count + 1
    const teacherName = session.config.teacher_name

    // Showing a document: the teacher turns the laptop around so the family can read it.
    let shown: { shown: DocLetter; title: string; summary: string; printed?: true } | null = null
    if (show) {
      const letter = show as DocLetter
      const doc = scenario.documents[letter]
      if (!doc || !visibleDocs(row, scenario).includes(letter)) throw badRequest('That document is not available to show.')
      shown = { shown: letter, title: doc.title, summary: doc.summary, ...(printed && { printed: true as const }) }
    }
    const parentFirst = firstName(scenario.parent_persona.name)
    const content =
      text ||
      (shown!.printed
        ? `*prints a copy of the ${shown!.title} and hands it to ${parentFirst}*`
        : `*turns the laptop around to show ${parentFirst} the ${shown!.title}*`)
    const prior = getEvents(sessionId, idx)
    const staff = inRoom(scenario, prior)
    if (to === 'staff' && !staff) throw badRequest('Nobody else is in the room.')
    const toName =
      to === 'parent'
        ? firstName(scenario.parent_persona.name)
        : to === 'student'
          ? firstName(scenario.student_name)
          : to === 'staff'
            ? staff!.name
            : null
    const meta = shown || toName ? { ...shown, ...(toName && { to, to_name: toName }) } : null

    const verdict = await judgeTurn({
      scenario,
      teacherName,
      events: prior,
      teacherMessage: said({ content, meta }),
      tension: row.tension,
      visibleDocs: visibleDocs(row, scenario),
      staffInRoom: staff ? `${staff.name}, ${staff.title}` : undefined,
    })

    addEvent({ sessionId, idx, turn, kind: 'teacher', speaker: teacherName, content, meta })
    // Talking to one of them means that person answers.
    if (to === 'student') {
      verdict.student_should_respond = true
      verdict.parent_should_respond = false
    } else if (to === 'parent') {
      verdict.parent_should_respond = true
    } else if (to === 'staff') {
      verdict.staff_should_respond = true
    }
    if (!staff) verdict.staff_should_respond = false
    const range = { ...tensionRange(session.config) }
    // The tutorial is meant to feel good: it can get a little tense, but nobody walks out.
    if (scenario.tutorial) range.max = Math.min(range.max, 70)
    const { after, change } = applyChange(row.tension, verdict.tension_change, range)
    addEvent({
      sessionId,
      idx,
      turn,
      kind: 'tension',
      content: verdict.reason,
      meta: { before: row.tension, after, change },
    })
    updateSessionScenario(sessionId, idx, { tension: after, turn_count: turn })

    if (after >= MAX_TENSION) {
      const events = getEvents(sessionId, idx)
      const line = await parentLine({ scenario, teacherName, events, tension: after, walkout: true })
      addEvent({ sessionId, idx, turn, kind: 'parent', speaker: scenario.parent_persona.name, content: line })
      addEvent({
        sessionId,
        idx,
        turn,
        kind: 'system',
        content: `${firstName(scenario.parent_persona.name)} and ${firstName(scenario.student_name)} left the meeting.`,
      })
      await finishScenario(session, getSessionScenario(sessionId, idx), scenario, 'walkout')
      return
    }

    // A colleague in the room answers first when spoken to; the family can then react.
    if (staff && verdict.staff_should_respond) {
      const line = await staffLine({ scenario, role: staff.role, teacherName, events: getEvents(sessionId, idx) })
      addEvent({ sessionId, idx, turn, kind: 'staff', speaker: staff.name, content: line, meta: { role: staff.role } })
    }

    if (verdict.parent_should_respond) {
      const line = await parentLine({ scenario, teacherName, events: getEvents(sessionId, idx), tension: after })
      addEvent({ sessionId, idx, turn, kind: 'parent', speaker: scenario.parent_persona.name, content: line })
    }
    if (verdict.student_should_respond) {
      const line = await studentLine({ scenario, teacherName, events: getEvents(sessionId, idx), tension: after })
      addEvent({ sessionId, idx, turn, kind: 'student', speaker: firstName(scenario.student_name), content: line })
    }

    // A plan they both said yes to goes on the action plan, and agreeing takes some heat out of the room.
    if (verdict.proposes_next_step) {
      const events = getEvents(sessionId, idx)
      const steps = await newAgreements({ scenario, teacherName, events, plan: agreedSteps(events) })
      if (steps.length) {
        addEvent({ sessionId, idx, turn, kind: 'agreement', content: steps.join('\n'), meta: { steps } })
        const eased = applyChange(after, -Math.min(6, 3 * steps.length), range)
        if (eased.change !== 0) {
          addEvent({
            sessionId,
            idx,
            turn,
            kind: 'tension',
            content: 'You agreed on a next step together.',
            meta: { before: after, after: eased.after, change: eased.change },
          })
          updateSessionScenario(sessionId, idx, { tension: eased.after })
        }
      }
    }

    const surpriseDoc = scenario.documents[row.surprise_type]
    if (surpriseDoc && row.surprise_delivered_turn == null && turn >= row.surprise_turn) {
      const letter = row.surprise_type
      const doc = surpriseDoc
      addEvent({
        sessionId,
        idx,
        turn,
        kind: 'surprise',
        speaker: doc.delivery.from,
        content: doc.delivery.notification,
        meta: { letter },
      })
      const revealed = row.revealed_docs.includes(letter) ? row.revealed_docs : [...row.revealed_docs, letter]
      updateSessionScenario(sessionId, idx, { surprise_delivered_turn: turn, revealed_docs: revealed })
    }
  })
}

/** Teacher messages a support contact on their computer. Does not count as a conference turn. */
export function consultContact(sessionId: string, role: string, question: string) {
  if (!CONTACT_ROLES.includes(role as ContactRole)) throw badRequest(`contact must be one of: ${CONTACT_ROLES.join(', ')}.`)
  const text = question.trim()
  if (!text) throw badRequest('message is empty.')
  if (text.length > GAME.maxTeacherMessageLength) throw badRequest('message is too long.')

  return withLock(sessionId, async () => {
    const { session, row, scenario } = current(sessionId)
    if (row.status !== 'briefing' && row.status !== 'conference') {
      throw conflict('Support contacts are available during the briefing and the conference.')
    }
    const contactRole = role as ContactRole
    const contact = scenario.support_contacts[contactRole]
    const events = getEvents(sessionId, row.idx)
    const history = events.filter((e) => e.meta?.role === contactRole)
    const alreadyShared = !!contact.can_share && row.revealed_docs.includes(contact.can_share)

    const reply = await contactReply({
      scenario,
      role: contactRole,
      teacherName: session.config.teacher_name,
      history,
      question: text,
      alreadyShared,
    })

    addEvent({
      sessionId,
      idx: row.idx,
      turn: row.turn_count,
      kind: 'contact_question',
      speaker: session.config.teacher_name,
      content: text,
      meta: { role: contactRole },
    })
    const shared = reply.share_document ? contact.can_share : null
    addEvent({
      sessionId,
      idx: row.idx,
      turn: row.turn_count,
      kind: 'contact_reply',
      speaker: contact.name,
      content: reply.reply,
      meta: { role: contactRole, shared_document: shared },
    })
    if (shared && !row.revealed_docs.includes(shared)) {
      updateSessionScenario(sessionId, row.idx, { revealed_docs: [...row.revealed_docs, shared] })
    }
  })
}

/**
 * Teacher asks a colleague to step into the room. They walk in, bring their
 * document if they have one, and introduce themselves. From then on they're
 * part of the conversation.
 */
export function joinConference(sessionId: string, role: string) {
  if (!CONTACT_ROLES.includes(role as ContactRole)) throw badRequest(`contact must be one of: ${CONTACT_ROLES.join(', ')}.`)
  return withLock(sessionId, async () => {
    const { session, row, scenario } = current(sessionId)
    requireStatus(row, 'conference', 'invite someone in')
    const contactRole = role as ContactRole
    const contact = scenario.support_contacts[contactRole]
    if (!contact.can_join) throw badRequest(`${contact.name} can't come in right now.`)
    const events = getEvents(sessionId, row.idx)
    if (inRoom(scenario, events)) throw conflict('Someone has already joined the meeting.')

    addEvent({
      sessionId,
      idx: row.idx,
      turn: row.turn_count,
      kind: 'system',
      content: `${contact.name}, ${contact.title}, came into the room.`,
      meta: { joined: contactRole },
    })
    // They bring their record with them.
    if (contact.can_share && scenario.documents[contact.can_share] && !row.revealed_docs.includes(contact.can_share)) {
      updateSessionScenario(sessionId, row.idx, { revealed_docs: [...row.revealed_docs, contact.can_share] })
    }
    const line = await staffLine({
      scenario,
      role: contactRole,
      teacherName: session.config.teacher_name,
      events: getEvents(sessionId, row.idx),
      arriving: true,
    })
    addEvent({ sessionId, idx: row.idx, turn: row.turn_count, kind: 'staff', speaker: contact.name, content: line, meta: { role: contactRole } })
  })
}

/** Teacher closes the conference. Writes a debrief and moves the session forward. */
export function endConference(sessionId: string) {
  return withLock(sessionId, async () => {
    const { session, row, scenario } = current(sessionId)
    requireStatus(row, 'conference', 'end the conference')
    await finishScenario(session, row, scenario, 'teacher_ended')
  })
}

async function finishScenario(session: SessionRow, row: SessionScenarioRow, scenario: Scenario, reason: EndedReason) {
  const debrief = await debriefConference({
    scenario,
    teacherName: session.config.teacher_name,
    row,
    events: getEvents(session.id, row.idx),
    startingTension: tensionRange(session.config).start,
    endedReason: reason,
  })
  updateSessionScenario(session.id, row.idx, { status: 'ended', ended_reason: reason, debrief })
}

/** After a debrief, move to the next scenario's briefing (or complete the session). */
export function advance(sessionId: string) {
  const session = getSession(sessionId)
  if (session.status === 'complete') return
  const row = getSessionScenario(sessionId, session.current_index)
  requireStatus(row, 'ended', 'move on')
  const next = getSessionScenarios(sessionId).find((r) => r.idx === session.current_index + 1)
  if (next) {
    updateSessionScenario(sessionId, next.idx, { status: 'briefing' })
    updateSession(sessionId, { current_index: next.idx })
  } else {
    updateSession(sessionId, { status: 'complete' })
  }
}
