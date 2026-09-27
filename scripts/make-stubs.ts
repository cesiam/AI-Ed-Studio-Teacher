/**
 * One-off helper that appends TODO stubs to content/scenarios.seed.json for
 * any scenario ids (02-11) that don't exist yet. Safe to re-run: existing
 * scenarios are never touched.
 *
 *   pnpm stubs
 */
import fs from 'node:fs'
import path from 'node:path'

const SEED_PATH = path.join(process.cwd(), 'content', 'scenarios.seed.json')
const TOTAL = 11

function stub(id: string) {
  const todo = (what: string) => `TODO: ${what}`
  const doc = (letter: string, what: string) => ({
    title: todo(`${what} title`),
    file: `${id}${letter}-todo.html`,
    source: todo('where this record lives'),
    summary: todo('what this document shows'),
  })
  const surprise = (letter: 'E' | 'F', what: string) => ({
    ...doc(letter, what),
    delivery: {
      channel: 'email',
      app: 'PFPS Mail',
      from: todo('sender name, office'),
      subject: todo('subject line'),
      body: todo('message body'),
      attachment_name: todo('Attachment_Name.pdf'),
      notification: todo('New message from ... · 1 attachment'),
    },
  })
  const contact = (role: string) => ({
    name: todo(`${role} name`),
    title: todo(`${role} title`),
    knows: todo(`what the ${role} knows about this student`),
    can_share: null,
  })

  const stat = (what: string) => ({ text: todo(what), source: todo('source') })

  return {
    id,
    status: 'stub',
    title: `Scenario ${id} (TODO)`,
    topic: todo('the situation this scenario practices'),
    research: {
      prevalence: stat('how common this is'),
      why_address_it: stat('why it matters'),
      massachusetts: stat('Massachusetts data'),
    },
    raised_by: 'teacher',
    student_name: todo('student name'),
    grade: 9,
    setting: {
      school: 'Pemberton Falls High School',
      teacher_role: todo('who the teacher is'),
      meeting_context: todo('when, where, and why the meeting is happening'),
    },
    teacher_concern: todo("the teacher's opening concern"),
    student_strength: todo('BUT I notice...'),
    documents: {
      A: doc('A', 'internal record'),
      B: doc('B', 'internal record'),
      C: doc('C', 'internal record'),
      D: { ...doc('D', 'cited policy'), citation: todo('policy citation') },
      E: surprise('E', 'school-dropped-the-ball document'),
      F: surprise('F', "document contradicting the family's claim"),
    },
    parent_persona: {
      name: todo('parent name'),
      relationship: todo('relationship to student'),
      personality: todo('personality'),
      speaking_style: todo('how they talk'),
      knows: [todo('what the parent knows')],
      hiding: [todo("what the parent is hiding or hasn't said")],
      likely_claim: todo('the claim document F contradicts'),
      softens_when: [todo('what calms them down')],
      escalates_when: [todo('what sets them off')],
    },
    student_persona: {
      name: todo('student name'),
      age: 14,
      personality: todo('personality'),
      speaking_style: todo('how they talk'),
      knows: [todo('what the student knows')],
      hiding: [todo("what the student is hiding or hasn't said")],
      likely_claim: todo("the student's version"),
      speaks_up_when: [todo('when the student jumps in')],
    },
    support_contacts: {
      counselor: contact('counselor'),
      nurse: contact('nurse'),
      principal: contact('principal'),
      colleague: contact('colleague'),
    },
  }
}

const seed = JSON.parse(fs.readFileSync(SEED_PATH, 'utf8'))
const existing = new Set(seed.scenarios.map((s: { id: string }) => s.id))
for (let n = 1; n <= TOTAL; n++) {
  const id = String(n).padStart(2, '0')
  if (!existing.has(id)) seed.scenarios.push(stub(id))
}
seed.scenarios.sort((a: { id: string }, b: { id: string }) => a.id.localeCompare(b.id))
fs.writeFileSync(SEED_PATH, JSON.stringify(seed, null, 2) + '\n')
console.log(`Wrote ${seed.scenarios.length} scenarios to ${SEED_PATH}`)
