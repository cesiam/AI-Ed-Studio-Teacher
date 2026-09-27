import { z } from 'zod'
import { firstName, type Scenario } from '../content/types'
import type { EndedReason, EventRow, SessionScenarioRow, TensionMeta } from '../db/sessions'
import { decide } from './client'
import { speakers } from './characters'
import { said } from './transcript'
import { agreedSteps } from './agreement'

const Debrief = z.object({
  summary: z.string().describe('Two or three sentences on how the conference went.'),
  went_well: z.array(z.string()).describe('Up to three specific things the teacher did well, quoting them where useful.'),
  try_next: z.array(z.string()).describe('Up to three specific things to try next time, each with an example sentence the teacher could say.'),
  acknowledged_strength: z.boolean().describe('Did the teacher clearly share their "BUT I notice..." observation about the student?'),
  hidden_truths_surfaced: z.array(z.string()).describe('Which of the family\'s hidden facts came out in the conversation, if any.'),
})
export type Debrief = z.infer<typeof Debrief>

const SYSTEM = `You are an experienced instructional coach debriefing a teacher after a practice parent-teacher conference. Be warm, specific, and honest. Refer to what the teacher actually said. Keep every item to one or two sentences. All people and records are fictional.`

export async function debriefConference(opts: {
  scenario: Scenario
  teacherName: string
  row: SessionScenarioRow
  events: EventRow[]
  startingTension: number
  endedReason: EndedReason
}): Promise<Debrief> {
  const { scenario: s, teacherName, row, events, startingTension, endedReason } = opts
  const who = speakers(s, teacherName)
  const lines = events
    .map((e) => {
      switch (e.kind) {
        case 'teacher':
          return `${teacherName} (teacher): ${said(e)}`
        case 'parent':
          return `${who.parent}: ${e.content}`
        case 'student':
          return `${who.student}: ${e.content}`
        case 'tension': {
          const m = e.meta as unknown as TensionMeta
          return `  [tension ${m.before} -> ${m.after}: ${e.content}]`
        }
        case 'surprise':
          return `  [a surprise document arrived on the teacher's computer: ${e.content}]`
        case 'contact_question':
          return `  [teacher messaged ${String(e.meta?.role)}: ${e.content}]`
        case 'contact_reply':
          return `  [${String(e.meta?.role)} replied: ${e.content}]`
        case 'staff':
          return `${e.speaker} (joined the meeting): ${e.content}`
        case 'agreement':
          return `  [agreed next steps: ${((e.meta?.steps as string[]) ?? []).join('; ')}]`
        default:
          return `  [${e.content}]`
      }
    })
    .join('\n')

  const surprise = s.documents[row.surprise_type]
  const content = `Scenario: ${s.title} (${s.topic})
Student: ${s.student_name}, grade ${s.grade}. Parent: ${s.parent_persona.name}.
Teacher's concern: ${s.teacher_concern}
Teacher's "BUT I notice" observation: ${s.student_strength}
Parent's hidden facts: ${s.parent_persona.hiding.join(' | ')}
Student's hidden facts: ${s.student_persona.hiding.join(' | ')}
Surprise document: ${surprise ? `(${row.surprise_type}) ${surprise.title}. ${surprise.summary}` : 'none in this scenario'}
Agreed next steps: ${agreedSteps(events).join('; ') || 'none. The conference ended without an agreed plan; name this kindly in try_next with an example of how to propose one.'}
Tension started at ${startingTension} and ended at ${row.tension}.
Ended because: ${endedReason === 'walkout' ? `${firstName(s.parent_persona.name)} walked out` : 'the teacher ended the conference'}.

Full log:
${lines}`

  return decide(Debrief, {
    system: SYSTEM,
    messages: [{ role: 'user', content }],
    effort: 'medium',
    maxTokens: 6000,
  })
}
