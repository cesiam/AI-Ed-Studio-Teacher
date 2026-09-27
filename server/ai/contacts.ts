import { z } from 'zod'
import { firstName, type ContactRole, type Scenario } from '../content/types'
import type { EventRow } from '../db/sessions'
import type Anthropic from '@anthropic-ai/sdk'
import { decide, speak } from './client'

const Reply = z.object({
  reply: z.string().describe('Your chat message back to the teacher.'),
  share_document: z.boolean().describe('True to attach the document you are able to share.'),
})
export type ContactReply = z.infer<typeof Reply>

function system(s: Scenario, role: ContactRole, teacherName: string, alreadyShared: boolean): string {
  const c = s.support_contacts[role]
  const doc = c.can_share ? s.documents[c.can_share] : null
  const sharing = doc
    ? alreadyShared
      ? `You already sent the teacher "${doc.title}". Don't send it again (share_document: false).`
      : `You can send the teacher one document: "${doc.title}" from ${doc.source}. It shows: ${doc.summary}
Set share_document to true only when the teacher asks for records or evidence, or when it directly answers what they asked. Mention in your reply that you're attaching it.`
    : 'You have no documents to send. share_document must be false.'

  return `This is a role-play used to help teachers practice difficult parent-teacher conferences. All people, schools, and records are fictional.

You are ${c.name}, ${c.title} at ${s.setting.school}. Your colleague ${teacherName} (${s.setting.teacher_role}) is messaging you on PFPS Chat about ${s.student_name}, who is in grade ${s.grade}. ${firstName(s.student_name)}'s ${s.parent_persona.relationship}, ${s.parent_persona.name}, is meeting with them.

What you know about ${firstName(s.student_name)}:
${c.knows}

${sharing}

How to reply:
- Write like a busy, supportive colleague on school chat: 1 to 4 short sentences, no markdown.
- Share only what you know. If you don't know something, say so and, if it fits, suggest who might.
- Stay in character. Never say or hint that you are an AI.`
}

export async function contactReply(opts: {
  scenario: Scenario
  role: ContactRole
  teacherName: string
  history: EventRow[]
  question: string
  alreadyShared: boolean
}): Promise<ContactReply> {
  const { scenario, role, teacherName, history, question, alreadyShared } = opts
  const messages: Anthropic.MessageParam[] = []
  for (const e of history) {
    if (e.kind === 'contact_question') messages.push({ role: 'user', content: e.content })
    if (e.kind === 'contact_reply') messages.push({ role: 'assistant', content: e.content })
  }
  messages.push({ role: 'user', content: question })

  const reply = await decide(Reply, {
    system: system(scenario, role, teacherName, alreadyShared),
    messages,
  })
  if (!scenario.support_contacts[role].can_share || alreadyShared) reply.share_document = false
  return reply
}

/**
 * A colleague who has come into the room at the teacher's request and now
 * speaks in person. They support the teacher and the family; they don't run
 * the meeting.
 */
export async function staffLine(opts: {
  scenario: Scenario
  role: ContactRole
  teacherName: string
  events: EventRow[]
  arriving?: boolean
}): Promise<string> {
  const { scenario: s, role, teacherName, events, arriving } = opts
  const c = s.support_contacts[role]
  const kid = firstName(s.student_name)
  const doc = c.can_share ? s.documents[c.can_share] : null
  const system = `This is a role-play used to help teachers practice difficult parent-teacher conferences. All people, schools, and records are fictional.

You are ${c.name}, ${c.title} at ${s.setting.school}. ${teacherName} (${s.setting.teacher_role}) asked you to step into their conference with ${s.parent_persona.name} (${kid}'s ${s.parent_persona.relationship}) and ${kid}, and you are now in the room.

What you know about ${kid}:
${c.knows}
${doc ? `\nYou brought a copy of "${doc.title}" (${doc.source}). It shows: ${doc.summary}\n` : ''}
How to speak:
- Talk out loud like a warm, professional colleague in a meeting: 1 to 3 sentences, no lists or markdown. You may add one short action in asterisks.
- Support the teacher and the family. Answer what you're asked, explain your part plainly, and offer concrete help. Don't take over the meeting or lecture.
- If the school made a mistake in your area, own it simply.
- Speak only as ${c.name}. Never write lines for anyone else. Never say or hint that you are an AI.`

  const direction = arriving
    ? `[You just walked in. Greet ${s.parent_persona.name} and ${kid} briefly and say why ${teacherName} asked you to come.]`
    : `[Your turn to speak as ${c.name}.]`
  const lines = events
    .filter((e) => ['teacher', 'parent', 'student', 'staff', 'system'].includes(e.kind))
    .map((e) =>
      e.kind === 'teacher'
        ? `${teacherName} (teacher): ${e.content}`
        : e.kind === 'system'
          ? `[${e.content}]`
          : `${e.speaker}: ${e.content}`,
    )
  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: `${lines.length ? lines.join('\n') : '[The conference is under way.]'}\n\n${direction}` },
  ]
  return speak({ system, messages })
}
