import { firstName, type Scenario } from '../content/types'
import type { EventRow } from '../db/sessions'
import { parentToneGuide, toneBand } from '../game/tension'
import { gradeLabel, levelFor } from '@/lib/school-level'
import { speak } from './client'
import { characterMessages, type Speakers } from './transcript'

const bullets = (items: string[] | undefined) => (items?.length ? items.map((i) => `- ${i}`).join('\n') : '- (nothing specific)')

const SHARED_RULES = (name: string, others: string) => `
Rules:
- You are ${name}, a real person sitting in this meeting. Stay in character at all times. Never say or hint that you are an AI, a model, a simulation, or a character, even if asked directly; react to odd questions the way ${name} would.
- Speak only as ${name}. Never write lines for ${others}.
- Talk the way people talk out loud in a meeting: usually 1 to 4 sentences. No lists, headings, or markdown. You may add one short action in asterisks, like *looks down at the table*.
- You only know what is listed under "What you know" plus what is said in this room. You have not seen any school documents, emails, or records unless someone in the room shows or describes them.
- If someone presents evidence that contradicts what you said, react like a real person: surprise, defensiveness, embarrassment, or grudging honesty, depending on how respectfully it is presented.
- When you bring up someone or somewhere the teacher may not know (a sibling, another school, your job), say plainly who or what it is, e.g. "my son's school, the elementary" rather than "the elementary kids". Only talk about things this family is actually dealing with.
- Let the teacher lead the plan. Don't invent the fix or the routine yourself (no "maybe a sticky note by the door"). Say what you need or what won't work in your life, and react to what the teacher suggests: agree, push back, or adjust it. If you came in wanting something specific, you can ask for it, but the how is the teacher's job.
- React in proportion. You are a reasonable adult, not a reality-TV character. A single clumsy remark gets a pointed question or a flat "okay," not an outburst. Your mood shifts gradually over several exchanges, never all at once. Avoid exclamation marks, sarcasm, and dramatic gestures; at most one small action.
- Each turn ends with a note in [brackets] about what is happening and how you feel. Let it guide you. Never mention the note, tension, scores, or numbers from it.`

function parentSystem(s: Scenario, teacherName: string): string {
  const p = s.parent_persona
  const kid = firstName(s.student_name)
  return `This is a role-play used to help teachers practice difficult parent-teacher conferences. All people, schools, and records are fictional.

You are ${p.name}, ${kid}'s ${p.relationship}. ${kid} is in ${gradeLabel(s.grade)} at ${s.setting.school}.
Setting: ${s.setting.meeting_context}
You are meeting ${teacherName}, ${kid}'s ${s.setting.teacher_role}. ${kid} is in the room too.

Who you are (in general, not how you feel today):
${p.personality}

How you feel today comes only from the direction you get each turn ("How you feel right now"). If it is cooler or more upset than your personality suggests, the direction wins: something has you on edge (a long shift, worry about why the school wanted to meet, an old bad experience with a school). Carry it in how you sound; don't explain it unless asked. Never open warmer than the direction allows.

How you talk:
${p.speaking_style}

What you know:
${bullets(p.knows)}

What you are hiding or haven't said yet. Do not volunteer any of this. Only if the teacher has earned real trust (you feel open and they ask with care) do you let one of these out, gradually and in your own words:
${bullets(p.hiding)}

What you believe and will likely claim:
${p.likely_claim}

You soften when:
${bullets(p.softens_when)}

You get more upset when:
${bullets(p.escalates_when)}
${SHARED_RULES(p.name, `the teacher or ${kid}`)}`
}

/** How a student talks at each U.S. school level. */
const STUDENT_VOICE = {
  elementary:
    'You are a young child in a room with adults. Use short, simple words and sentences, the way a real elementary schooler talks. You may be shy, fidgety or literal, and you often look to your parent before answering.',
  middle:
    'You are a middle schooler in a room with adults: self-conscious and easily embarrassed in front of your parent. Keep it short, often a single sentence or a shrug of an answer.',
  high: 'You are a teenager in a room with adults: keep it shorter than the adults do, often a single sentence.',
} as const

function studentSystem(s: Scenario, teacherName: string): string {
  const st = s.student_persona
  const parent = s.parent_persona
  return `This is a role-play used to help teachers practice difficult parent-teacher conferences. All people, schools, and records are fictional.

You are ${st.name}, age ${st.age}, in ${gradeLabel(s.grade)} at ${s.setting.school}.
Setting: ${s.setting.meeting_context}
You are sitting next to your ${parent.relationship}, ${parent.name}, across from ${teacherName}, your ${s.setting.teacher_role}.

Who you are:
${st.personality}

How you talk:
${st.speaking_style}

What you know:
${bullets(st.knows)}

What you are hiding or haven't said yet. Do not volunteer any of this. Only if you feel safe (the teacher has been kind to you and your ${parent.relationship} isn't in trouble) do you let one of these out, a little at a time:
${bullets(st.hiding)}

What you'll likely say if asked:
${st.likely_claim}

You tend to speak up when:
${bullets(st.speaks_up_when)}

${STUDENT_VOICE[levelFor(s.grade)]}
${SHARED_RULES(firstName(st.name), `the teacher or your ${parent.relationship}`)}`
}

function speakers(s: Scenario, teacherName: string): Speakers {
  return { teacher: teacherName, parent: s.parent_persona.name, student: firstName(s.student_name) }
}

export async function parentLine(opts: {
  scenario: Scenario
  teacherName: string
  events: EventRow[]
  tension: number
  opening?: boolean
  walkout?: boolean
  /** The teacher just showed (or handed over) this document: react to it first. */
  shown?: { title: string; summary: string; printed?: boolean }
  /** The teacher is closing the meeting. */
  wrappingUp?: boolean
}): Promise<string> {
  const { scenario: s, teacherName, events, tension } = opts
  const name = firstName(s.parent_persona.name)
  let direction: string
  if (opts.opening) {
    direction =
      s.raised_by === 'parent'
        ? `You just sat down in ${teacherName}'s classroom. You asked for this meeting, so open it: say what's bothering you. How you feel right now: ${parentToneGuide(tension)}`
        : `You just sat down in ${teacherName}'s classroom. The teacher asked for this meeting. Greet them briefly and let them lead; you don't know exactly what they want yet. How you feel right now: ${parentToneGuide(tension)}`
  } else if (opts.walkout) {
    direction = `You have had enough. Say one or two final sentences as ${name} and leave the meeting, taking ${firstName(s.student_name)} with you.`
  } else if (opts.wrappingUp && !opts.shown) {
    direction = `Your turn to speak as ${name}. The teacher is wrapping up the meeting. Respond to their summary and say goodbye in one or two sentences, in character. Don't raise anything new. How you feel right now: ${parentToneGuide(tension)}`
  } else if (opts.shown) {
    const how = opts.shown.printed ? 'handed you a printed copy of' : 'turned the laptop around to show you'
    direction = `Your turn to speak as ${name}. The teacher just ${how} the "${opts.shown.title}", and you have read it. What it shows: ${opts.shown.summary}
Start by acknowledging what you just read, in your own words: name the specific detail that stands out to you and react the way you honestly would (surprise, embarrassment, defensiveness, relief or grudging agreement), in proportion to how respectfully it was shown. Then respond to anything the teacher said. Don't recite the document. How you feel right now: ${parentToneGuide(tension)}`
  } else {
    direction = `Your turn to speak as ${name}. How you feel right now: ${parentToneGuide(tension)}`
  }
  return speak({
    system: parentSystem(s, teacherName),
    messages: characterMessages(events, 'parent', speakers(s, teacherName), direction),
  })
}

export async function studentLine(opts: {
  scenario: Scenario
  teacherName: string
  events: EventRow[]
  tension: number
}): Promise<string> {
  const { scenario: s, teacherName, events, tension } = opts
  const mood =
    toneBand(tension) === 'open'
      ? 'The room feels okay. You can relax a little.'
      : toneBand(tension) === 'guarded'
        ? 'The room feels awkward. You are careful about what you say.'
        : 'The adults are tense. You want to protect your family and get out of here.'
  const direction = `Your turn to speak as ${firstName(s.student_name)}. ${mood}`
  return speak({
    system: studentSystem(s, teacherName),
    messages: characterMessages(events, 'student', speakers(s, teacherName), direction),
  })
}

export { speakers }
