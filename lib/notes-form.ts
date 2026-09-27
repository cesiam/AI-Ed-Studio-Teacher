// The teacher's "Parent-Teacher Conference Notes Form" (from the course's
// In-the-Room Action Planning handout), as data. The laptop renders it as a
// fillable form; the history page prints what was filled in. Field ids are
// stored with each conference, so don't rename them.

export interface FormTable {
  id: string
  title: string
  intro: string
  /** Column headers. The first column is the row label. */
  columns: string[]
  rows: { id: string; label: string }[]
  /** Blank rows the teacher fills in entirely (no printed label). */
  openRows?: boolean
}

export const NOTES_FORM_TITLE = 'Parent-Teacher Conference Notes Form'
export const NOTES_FORM_INTRO =
  'Fill this in during the conference: write down what the parent says in the blank cells, then agree on next steps together before they leave.'

export const HEADER_FIELDS = [
  { id: 'student', label: 'Student' },
  { id: 'parent', label: 'Parent/guardian' },
  { id: 'teacher', label: 'Teacher' },
  { id: 'date', label: 'Conference date' },
]

export const FORM_TABLES: FormTable[] = [
  {
    id: 'plan',
    title: '1. Two-week action plan',
    intro:
      'Agree on up to three goals, each with a measurable target, a step at school, a step the parent will take at home, and one way to check progress.',
    columns: ['Area', 'Goal (measurable)', 'At school (teacher will…)', 'At home (parent will…)', 'Progress check', 'Check date'],
    rows: [
      { id: 'academic', label: 'Academic' },
      { id: 'executive', label: 'Executive (starting, organizing, turning in work)' },
      { id: 'social', label: 'Social' },
    ],
  },
  {
    id: 'support',
    title: '2. If more support may be needed',
    intro: 'Use only if concerns go beyond small adjustments. Keep the tone focused on access to learning, not labels.',
    columns: ['Topic to discuss', 'What you share', 'Parent’s response', 'Follow-up (who, by when)'],
    rows: [
      { id: 'now', label: 'Supports available now while data is gathered' },
      { id: 'data', label: 'What data would guide an evaluation, who collects it, timeline' },
      { id: 'fit', label: 'How services would fit with regular class routines' },
    ],
  },
  {
    id: 'routines',
    title: '3. Turning concerns into routines',
    intro:
      'For each concern you raise, ask what the parent sees at home, then agree on one small routine for each setting. Example concerns: distracted during work time, incomplete homework, weak math facts, rarely participates.',
    columns: ['Concern you raised', 'What the parent sees at home', 'Home routine agreed', 'School routine you will use'],
    rows: [
      { id: '1', label: '' },
      { id: '2', label: '' },
      { id: '3', label: '' },
    ],
    openRows: true,
  },
  {
    id: 'contact',
    title: '4. Staying in touch',
    intro: 'Ask the parent how they want to hear from you and record their answers.',
    columns: ['Question', 'Parent’s response'],
    rows: [
      { id: 'channel', label: 'Preferred way to hear from you (email, portal, phone, text)' },
      { id: 'frequency', label: 'How often (weekly note with a win, a barrier, and a next step?)' },
      { id: 'language', label: 'Language or best time to reach them' },
      { id: 'metric', label: 'One number you will both track (e.g., on-time submissions)' },
      { id: 'stall', label: 'If the plan stalls, OK to set up a 10-minute call to adjust?' },
      { id: 'next', label: 'Next check-in date' },
    ],
  },
]

/** Field id for one cell: table.row.column (column index counts from 1, after the label column). */
export const cellId = (table: string, row: string, col: number) => `${table}.${row}.${col}`

/** Every filled-in answer with a readable label, for the transcript and history. */
export function filledAnswers(form: Record<string, string>): { label: string; value: string }[] {
  const out: { label: string; value: string }[] = []
  for (const f of HEADER_FIELDS) if (form[f.id]) out.push({ label: f.label, value: form[f.id] })
  if (form['plan.notes']) out.push({ label: 'Parent’s questions or concerns about the plan', value: form['plan.notes'] })
  for (const t of FORM_TABLES) {
    const section = t.title.replace(/^\d+\.\s*/, '')
    for (const r of t.rows) {
      if (t.openRows && form[cellId(t.id, r.id, 0)]) {
        out.push({ label: `${section} · Row ${r.id} · ${t.columns[0]}`, value: form[cellId(t.id, r.id, 0)] })
      }
      t.columns.slice(1).forEach((col, i) => {
        const value = form[cellId(t.id, r.id, i + 1)]
        if (value) out.push({ label: `${section} · ${r.label || `Row ${r.id}`} · ${col}`, value })
      })
    }
  }
  return out
}

export const GUIDE = {
  title: 'Parent–Teacher Conferences Without the Panic: A Therapist’s Guide to Actionable Next Steps',
  source: 'Manhattan Psychology Group',
  url: 'https://www.manhattanpsychologygroup.com/blog/parent-teacher-conferences/',
}
