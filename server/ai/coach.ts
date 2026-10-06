import { z } from 'zod'
import { firstName, type Scenario } from '../content/types'
import type { EventRow } from '../db/sessions'
import { agreedSteps } from './agreement'
import { speakers } from './characters'
import { decide } from './client'
import { roomTranscript } from './transcript'
import { COACH_STYLES, DEFAULT_COACH_STYLE, type CoachStyle } from '@/lib/coach-styles'

const Tip = z.object({
  tip: z.string().describe('One suggestion for the teacher’s next move, under 35 words, tied to what was just said. Names the move, never scripts the words.'),
})

const SYSTEM = `You are a quiet coach sitting beside a teacher during a practice parent-teacher conference. After each exchange, suggest the teacher's single best next move. Your job is to help the teacher reach a shared plan and wrap up well, following the guide "Parent–Teacher Conferences Without the Panic" (Manhattan Psychology Group).

Anchor every tip in the conversation: react to what the parent or student just said (quote a few of THEIR words when it helps), then name the move and briefly why it matters now.

Never script the teacher. Don't write lines for them to say, don't put their words in quotation marks, and don't use "You could say…" or "Try saying…". Describe what to do ("acknowledge her frustration before going on", "ask what mornings look like at home", "invite the student to share their side") and leave the wording to the teacher. This is practice: finding their own words is the point.

Keep the meeting moving toward a finish:
1. Opening (first exchange or two): start with the child's strengths.
2. Understanding: listen, reflect back, ask for concrete examples of what happens at home.
3. Planning (by about the fourth exchange, or as soon as a cause is on the table): co-design one small routine at school and one at home.
4. Staying in touch: ask how and how often they want to hear from you and one sign of progress you'll both watch, and set a check-in date.
5. Wrap-up: once there's a plan and a way to stay in touch, suggest summarizing the plan out loud and ending the conference.

Don't linger: if the conversation has gone several exchanges without moving toward a plan, steer there, kindly. Don't jump ahead if the parent is upset: acknowledge feelings first. If a colleague on the list could clearly help and hasn't been asked, you may suggest messaging them. Never tell the teacher to write anything down, fill in the notes form, or record the plan: writing is optional and the conversation is what you coach. Never reveal anything the teacher doesn't know. Plain, second person. No preamble.`

function systemFor(style: CoachStyle) {
  const voice = COACH_STYLES.find((c) => c.value === style)?.voice ?? ''
  return `${SYSTEM}

Your voice: ${voice} Whatever the voice, you still never script the teacher's words.`
}

// One tip per exchange: the same state never costs a second model call.
const cache = new Map<string, string>()

export async function coachTip(opts: {
  sessionId: string
  scenario: Scenario
  teacherName: string
  events: EventRow[]
  /** The teacher's notes form (not used: writing is optional, so the coach never steers toward it). */
  form: Record<string, string>
  /** How many times the teacher has spoken. */
  turn: number
  style?: CoachStyle
}): Promise<string> {
  const { sessionId, scenario: s, teacherName, events, turn, style = DEFAULT_COACH_STYLE } = opts
  const key = `${sessionId}:${events.at(-1)?.id ?? 0}:${style}`
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

Conversation so far:
${roomTranscript(events, speakers(s, teacherName))}`

  const { tip } = await decide(Tip, { system: systemFor(style), messages: [{ role: 'user', content }] })
  cache.set(key, tip)
  if (cache.size > 500) cache.delete(cache.keys().next().value!)
  return tip
}
