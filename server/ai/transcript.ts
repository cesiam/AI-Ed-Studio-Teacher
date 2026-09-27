import type Anthropic from '@anthropic-ai/sdk'
import type { EventRow } from '../db/sessions'

export interface Speakers {
  teacher: string
  parent: string
  student: string
}

const SPOKEN = new Set(['teacher', 'parent', 'student', 'staff', 'system'])

function label(e: EventRow, who: Speakers): string {
  switch (e.kind) {
    case 'teacher':
      return `${who.teacher} (teacher)`
    case 'parent':
      return who.parent
    case 'student':
      return who.student
    case 'staff':
      return `${e.speaker} (school staff, in the room)`
    default:
      return 'Narrator'
  }
}

/** What was said, plus what everyone saw if the teacher turned the laptop around to show a document. */
export function said(e: Pick<EventRow, 'content' | 'meta'>): string {
  // meta: { shown: letter, title, summary } when a document was shown; { to, to_name } when addressed to one person.
  const m = e.meta as { shown?: string; title?: string; summary?: string; printed?: boolean; to_name?: string } | null
  const line = m?.to_name ? `(to ${m.to_name}) ${e.content}` : e.content
  if (!m?.shown) return line
  return m.printed
    ? `${line} [The teacher prints a copy of the "${m.title}" document and hands it to the family to keep. What it says: ${m.summary}]`
    : `${line} [The teacher turns the laptop around so the family can read the "${m.title}" document. What it says: ${m.summary}]`
}

/** Plain-text transcript of what was said in the room, for the judge and debrief. */
export function roomTranscript(events: EventRow[], who: Speakers): string {
  const lines = events
    .filter((e) => SPOKEN.has(e.kind))
    .map((e) => `${label(e, who)}: ${said(e)}`)
  return lines.length ? lines.join('\n') : '(nothing has been said yet)'
}

/**
 * Converts the room's events into a message list from one character's point
 * of view: their own lines are `assistant`, everything else is folded into
 * `user` turns. A bracketed direction always goes last, so the list ends on a
 * user turn (no prefill needed).
 */
export function characterMessages(
  events: EventRow[],
  self: 'parent' | 'student',
  who: Speakers,
  direction: string,
): Anthropic.MessageParam[] {
  const messages: Anthropic.MessageParam[] = []
  let pending: string[] = []

  const flush = () => {
    if (pending.length) messages.push({ role: 'user', content: pending.join('\n\n') })
    pending = []
  }

  for (const e of events) {
    if (!SPOKEN.has(e.kind)) continue
    if (e.kind === self) {
      if (messages.length === 0 && pending.length === 0) pending.push('[The conference begins.]')
      flush()
      messages.push({ role: 'assistant', content: e.content })
    } else {
      pending.push(e.kind === 'system' ? `[${e.content}]` : `${label(e, who)}: ${said(e)}`)
    }
  }

  pending.push(`[${direction}]`)
  flush()
  return messages
}
