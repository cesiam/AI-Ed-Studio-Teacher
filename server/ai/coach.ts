import { z } from 'zod'
import { firstName, type Scenario } from '../content/types'
import type { EventRow } from '../db/sessions'
import { agreedSteps } from './agreement'
import { speakers } from './characters'
import { decide } from './client'
import { roomTranscript } from './transcript'
import { FORM_TABLES } from '@/lib/notes-form'

const Tip = z.object({
  tip: z.string().describe('One suggestion for the teacher’s next move, under 35 words, tied to what was just said.'),
})

const SYSTEM = `You are a quiet coach sitting beside a teacher during a practice parent-teacher conference. After each exchange, suggest the teacher's single best next move. Your job is to help the teacher reach a shared plan and wrap up well, following the guide "Parent–Teacher Conferences Without the Panic" (Manhattan Psychology Group).

Anchor every tip in the conversation: react to what the parent or student just said (quote a few words when it helps) and offer a sentence the teacher could say.

Keep the meeting moving toward a finish:
1. Opening (first exchange or two): start with the child's strengths.
2. Understanding: listen, reflect back, ask for concrete examples of what happens at home.
3. Planning (by about the fourth exchange, or as soon as a cause is on the table): co-design one small routine at school and one at home. Point to the matching part of the notes form, e.g. "jot it in section 1 under At home (parent will…)" or "section 3, Home routine agreed".
4. Staying in touch: ask how and how often they want to hear from you and one number you'll both track (section 4 of the form), and set a check-in date.
5. Wrap-up: once there's a plan and a way to stay in touch, suggest summarizing the plan out loud and ending the conference.

Don't linger: if the conversation has gone several exchanges without moving toward a plan, steer there, kindly. Don't jump ahead if the parent is upset: acknowledge feelings first. If a colleague on the list could clearly help and hasn't been asked, you may suggest messaging them. The notes form is optional; mention it as a help, not a requirement. Never reveal anything the teacher doesn't know. Warm, plain, second person ("Try…", "You could say…"). No preamble.`

// One tip per exchange: the same state never costs a second model call.
const cache = new Map<string, string>()

export async function coachTip(opts: {
  sessionId: string
  scenario: Scenario
  teacherName: string
  events: EventRow[]
  /** The teacher's notes form so far and how many times they've spoken. */
  form: Record<string, string>
  turn: number
}): Promise<string> {
  const { sessionId, scenario: s, teacherName, events, form, turn } = opts
  const key = `${sessionId}:${events.at(-1)?.id ?? 0}`
  const hit = cache.get(key)
  if (hit) return hit

  const asked = new Set(events.filter((e) => e.kind === 'contact_question').map((e) => e.meta?.role as string))
  const contacts = Object.entries(s.support_contacts)
    .map(([role, c]) => `- ${c.name}, ${c.title}${asked.has(role) ? ' (already messaged)' : ''}`)
    .join('\n')
  const plan = agreedSteps(events)

  const content = `The teacher (${teacherName}) is meeting ${s.parent_persona.name} (${s.parent_persona.relationship}) and ${firstName(s.student_name)}, grade ${s.grade}.
Teacher's concern: ${s.teacher_concern}
Teacher's "BUT I notice" strength: ${s.student_strength}
Colleagues the teacher can message:
${contacts}
Agreed next steps so far: ${plan.length ? plan.join('; ') : 'none yet'}
Exchanges so far: ${turn}
Notes form (optional) sections with something written: ${filledSections(form)}

Conversation so far:
${roomTranscript(events, speakers(s, teacherName))}`

  const { tip } = await decide(Tip, { system: SYSTEM, messages: [{ role: 'user', content }] })
  cache.set(key, tip)
  if (cache.size > 500) cache.delete(cache.keys().next().value!)
  return tip
}

/** Which parts of the notes form the teacher has started, e.g. "1. Two-week action plan". */
function filledSections(form: Record<string, string>): string {
  const started = FORM_TABLES.filter((t) => Object.keys(form).some((k) => k.startsWith(`${t.id}.`) && form[k].trim())).map((t) => t.title)
  return started.length ? started.join('; ') : 'none yet'
}
