import { z } from 'zod'
import { GAME } from '../config'
import { firstName, type DocLetter, type Scenario } from '../content/types'
import type { EventRow } from '../db/sessions'
import { decide } from './client'
import { roomTranscript } from './transcript'
import { speakers } from './characters'

const Verdict = z.object({
  tension_change: z.number().int().describe(`Change to the tension meter, from -${GAME.maxTensionStep} to +${GAME.maxTensionStep}.`),
  reason: z.string().describe('One short line (under 15 words) explaining the change, addressed to the teacher.'),
  parent_should_respond: z.boolean(),
  student_should_respond: z.boolean(),
  staff_should_respond: z
    .boolean()
    .describe('Only if a staff member is in the room: true when the teacher addresses them or asks something only they can answer. Otherwise false.'),
  proposes_next_step: z
    .boolean()
    .describe('True if the teacher proposes, asks about, or accepts a concrete next step or plan (who will do what), including agreeing to something the family suggested.'),
  teacher_wrapping_up: z
    .boolean()
    .describe('True if the teacher is closing the meeting: summarizing what was agreed, thanking the family for coming, or saying the conference can end. False otherwise.'),
})
export type Verdict = z.infer<typeof Verdict>

const SYSTEM = `You score one turn of a practice parent-teacher conference. The teacher is practicing; your score moves a tension meter (0 calm, 100 the parent walks out) and decides who in the room speaks next.

Tension goes DOWN when the teacher:
- works out concrete next steps with the family (who does what, by when) so another conference isn't needed
- names a specific strength of the student, especially the teacher's "BUT I notice..." observation
- listens: reflects feelings, asks open questions about the family's situation, lets them finish
- cites a document calmly, as shared information to look at together, not as a gotcha
- owns a mistake the school made
- offers concrete, practical support
- uses plain language and includes the student respectfully

Tension goes UP when the teacher:
- blames or accuses the parent or student, or implies the parent doesn't care
- uses jargon or acronyms without explaining them
- dismisses, corrects, or talks over the family's view
- frames things as threats or consequences (truancy, court, DCF, failing)
- reads numbers at the family without context, or calls the student a liar
- compares the student to other students

How much: real parents shift gradually over a conversation, so keep the meter steady.
- Most turns move it 0 to 3 points either way. Neutral logistics or small talk: 0.
- 4 to 6 points only for a clear, unmistakable move (a sincere named strength; an outright accusation).
- ${GAME.maxTensionStep} only for something exceptional (a threat of court or DCF; calling the child a liar).
- One clumsy word or a bit of jargon is +1 or +2, not a jump. A turn can mix good and bad moves; net them out.
Judge only the teacher's newest message, in light of the conversation so far.

Who speaks next:
- parent_should_respond: true in almost every case. False only when the teacher spoke only to the student and a parent would naturally let the child answer.
- student_should_respond: true when the teacher addresses the student by name or asks them something, or when the moment clearly calls for the student (their parent is being blamed, or their strength was just named). Otherwise false.`

export async function judgeTurn(opts: {
  scenario: Scenario
  teacherName: string
  events: EventRow[]
  teacherMessage: string
  tension: number
  visibleDocs: DocLetter[]
  /** A colleague who came into the room, e.g. "Dr. Renée Castellanos, Principal". */
  staffInRoom?: string
}): Promise<Verdict> {
  const { scenario: s, teacherName, events, teacherMessage, tension, visibleDocs, staffInRoom } = opts
  const who = speakers(s, teacherName)
  const docs = visibleDocs
    .map((l) => s.documents[l] && `${l}. ${s.documents[l].title} (${s.documents[l].source}): ${s.documents[l].summary}`)
    .filter(Boolean)
    .join('\n')

  const content = `Scenario: ${s.title} (${s.topic}). ${s.setting.meeting_context}
Student: ${s.student_name}, grade ${s.grade}. Parent: ${s.parent_persona.name} (${s.parent_persona.relationship}).
Teacher's concern: ${s.teacher_concern}
Teacher's "BUT I notice" observation: ${s.student_strength}
What sets this parent off: ${(s.parent_persona.escalates_when ?? []).join('; ') || 'n/a'}
What calms this parent: ${(s.parent_persona.softens_when ?? []).join('; ') || 'n/a'}

Documents the teacher has on screen:
${docs}

Conversation so far (most recent ${GAME.judgeWindow} lines):
${roomTranscript(events.slice(-GAME.judgeWindow), who)}

${staffInRoom ? `Also in the room (joined at the teacher's request): ${staffInRoom}.
` : ''}Current tension: ${tension}/100.

The teacher's newest message (score this one):
${teacherName}: ${teacherMessage}`

  const verdict = await decide(Verdict, { system: SYSTEM, messages: [{ role: 'user', content }] })

  // Backstop: a teacher who addresses the student by name should get an answer from them.
  const student = firstName(s.student_name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  if (new RegExp(`\\b${student}\\b[^.!]*\\?`, 'i').test(teacherMessage)) verdict.student_should_respond = true
  if (!verdict.parent_should_respond && !verdict.student_should_respond) verdict.parent_should_respond = true
  return verdict
}
