import fs from 'node:fs'
import path from 'node:path'
import Ajv from 'ajv'
import { z } from 'zod'
import { speak } from '../ai/client'
import { paths } from '../config'
import { getScenario, listScenarios, RETIRED_SCENARIO_IDS, upsertScenario } from '../db/scenarios'
import { transaction } from '../db/client'
import { badRequest, HttpError } from '../errors'
import { CONTACT_ROLES, type DocLetter, type Scenario } from './types'

// ---------------------------------------------------------------------------
// Validation: uploads go through the same JSON schema as the seed file.
// ---------------------------------------------------------------------------

let validator: ReturnType<Ajv['compile']> | null = null

function validate(scenarios: Scenario[]): void {
  validator ??= new Ajv({ allErrors: true }).compile(JSON.parse(fs.readFileSync(paths.schemaFile, 'utf8')))
  if (validator({ scenarios })) return
  const lines = (validator.errors ?? []).slice(0, 8).map((e) => `${e.instancePath.replace(/^\/scenarios\/\d+/, '') || '(root)'} ${e.message}`)
  throw badRequest(`That scenario doesn't match the format:\n${lines.join('\n')}`)
}

/** Next free two-digit id ("12", "13", ...). */
function nextIds(n: number): string[] {
  const taken = new Set([...listScenarios().map((s) => s.id), ...RETIRED_SCENARIO_IDS])
  const ids: string[] = []
  for (let i = 1; i <= 99 && ids.length < n; i++) {
    const id = String(i).padStart(2, '0')
    if (!taken.has(id)) ids.push(id)
  }
  if (ids.length < n) throw badRequest('There is no room for more scenarios (ids go up to 99).')
  return ids
}

// ---------------------------------------------------------------------------
// Upload 1: a scenario file in the seed format (one scenario, or { scenarios: [...] }).
// ---------------------------------------------------------------------------

export function importScenarioJson(raw: unknown): Scenario[] {
  const list = (raw && typeof raw === 'object' && Array.isArray((raw as { scenarios?: unknown }).scenarios)
    ? (raw as { scenarios: unknown[] }).scenarios
    : [raw]) as Scenario[]
  if (list.length === 0 || list.some((s) => !s || typeof s !== 'object' || Array.isArray(s))) {
    throw badRequest('Upload one scenario object, or { "scenarios": [...] }.')
  }

  // Never overwrite a scenario that's already here: give clashing uploads fresh ids.
  const taken = new Set([...listScenarios().map((s) => s.id), ...RETIRED_SCENARIO_IDS])
  const clashes = list.filter((s) => typeof s.id !== 'string' || taken.has(s.id))
  const fresh = nextIds(clashes.length)
  const scenarios = list.map((s) => ({ ...s, status: s.status ?? 'ready', id: clashes.includes(s) ? fresh.shift()! : s.id }))

  validate(scenarios)
  transaction(() => scenarios.forEach(upsertScenario))
  return scenarios
}

// ---------------------------------------------------------------------------
// Upload 2: a teacher's description of a situation, written up by Claude into a
// full scenario with personas, contacts, and six documents.
// ---------------------------------------------------------------------------

const Stat = z.object({ text: z.string(), source: z.string() })
const Delivery = z.object({
  channel: z.enum(['email', 'chat', 'portal']),
  app: z.string().describe('e.g. "PFPS Mail"'),
  from: z.string().describe('Name and office of the sender'),
  subject: z.string(),
  body: z.string().describe('The short message the document arrives with.'),
  attachment_name: z.string(),
  notification: z.string().describe('The one-line notification, e.g. "New message from Main Office · 1 attachment".'),
})
const Doc = z.object({
  letter: z.enum(['A', 'B', 'C', 'D', 'E', 'F']),
  title: z.string(),
  source: z.string().describe('Office or system it comes from, e.g. "Attendance Office" or "StudentView".'),
  summary: z.string().describe('One or two sentences on what the document shows, including the key facts.'),
  html: z
    .string()
    .describe(
      'The document itself as an HTML fragment (no <html>, <head>, <style>, or <script>): headings, paragraphs, and tables with realistic dates, names, and numbers. Optional classes: "flag" for alarming figures, "note" for a boxed footnote, "hand" for handwriting.',
    ),
  citation: z.string().nullable().describe('D only: the policy citation, e.g. "PFPS Policy JH, Sections 2-4". Null for the others.'),
  delivery: Delivery.nullable().describe('E and F only: how it reaches the teacher mid-conference. Null for A-D.'),
})
const Contact = z.object({
  role: z.enum(['counselor', 'nurse', 'principal', 'colleague']),
  name: z.string(),
  title: z.string(),
  knows: z.string().describe('What this person knows about the student and family.'),
  can_share: z.enum(['A', 'B', 'C', 'D', 'E', 'F']).nullable().describe('A document they can send the teacher if asked, or null.'),
})
const persona = {
  name: z.string(),
  personality: z.string(),
  speaking_style: z.string(),
  knows: z.array(z.string()),
  hiding: z.array(z.string()),
  likely_claim: z.string(),
}

const Generated = z.object({
  title: z.string().describe('Short, like "Chronic Absence: Maya".'),
  topic: z.string(),
  research: z.object({ prevalence: Stat, why_address_it: Stat, massachusetts: Stat }),
  raised_by: z.enum(['teacher', 'parent']),
  student_name: z.string(),
  grade: z.number().int(),
  setting: z.object({ school: z.string(), teacher_role: z.string(), meeting_context: z.string() }),
  teacher_concern: z.string(),
  student_strength: z.string().describe('Begins "BUT I notice..."'),
  documents: z
    .array(Doc)
    .describe(
      "Exactly six, letters A-F in order. A-C: records the teacher reviews beforehand. D: the policy that applies. E: surprise showing the school dropped the ball. F: surprise that contradicts the family's claim.",
    ),
  parent_persona: z.object({
    ...persona,
    relationship: z.string(),
    softens_when: z.array(z.string()),
    escalates_when: z.array(z.string()),
  }),
  student_persona: z.object({ ...persona, age: z.number().int(), speaks_up_when: z.array(z.string()) }),
  support_contacts: z.array(Contact).describe('Exactly four: counselor, nurse, principal, colleague.'),
})

const SYSTEM = `You write practice scenarios for Building Bridges, a simulator where teachers rehearse difficult parent-teacher conferences with AI role-players. A teacher will describe a situation; turn it into one complete scenario.

Everything is fictional and set in Pemberton Falls Public Schools, Massachusetts. Keep the names the teacher gives (they are asked to use made-up ones) and invent the rest. Leave out anything that could identify a real student, such as a real school or address.

Keep it consistent with the rest of the district so nobody gets confused:
- Every school is named "Pemberton Falls <Elementary|Middle|High> School" (grade K-5 elementary, 6-8 middle, 9-12 high). Use the same school name in the setting, every document, and every contact. Never invent other school names.
- Follow Massachusetts rules and terms: DESE, MCAS, IEPs and 504 plans, and M.G.L. citations where a law applies (for example, M.G.L. c. 76, § 1A: after 5 unexcused absences the school notifies the family and the principal tries to meet with them). District policies use the MASC letter codes (e.g. Policy JH for attendance).
- Make the numbers in the documents add up (dates, weekdays, counts, percentages).

What makes a good scenario:
- The parent is a reasonable, loving adult with a real point of view, not a villain. They have a believable claim, a few facts they know, and 2 or 3 things they are hiding that explain the situation.
- The student has their own view and secrets, and talks like a kid their age.
- Documents A-C are records the teacher reviews beforehand; D is the policy that applies. E shows the school made a mistake; F contradicts what the family will say. The truth sits somewhere in between.
- The "BUT I notice..." strength is specific and genuine.
- Support contacts each know something useful; at most two can share a document.
- Research: only real, well-known statistics from sources you are confident about (U.S. Department of Education, DESE, CDC, and so on), quoted accurately. If you aren't sure of a number, give a general finding without inventing figures.

Match the depth and tone of this example scenario:
${exampleScenario()}`

function exampleScenario(): string {
  try {
    const { documents, ...rest } = getScenario('01')
    return JSON.stringify(rest, null, 1)
  } catch {
    return '(no example available)'
  }
}

/**
 * The scenario shape is too big for strict structured outputs, so Claude gets
 * it as a JSON Schema in the prompt and the reply is checked against the same
 * zod schema, with one retry that shows it what was wrong.
 */
async function writeScenario(description: string): Promise<z.infer<typeof Generated>> {
  const shape = JSON.stringify(z.toJSONSchema(Generated))
  const system = `${SYSTEM}\n\nReply with a single JSON object and nothing else, matching this JSON Schema:\n${shape}`
  const messages: { role: 'user' | 'assistant'; content: string }[] = [
    { role: 'user', content: `The teacher's description:\n\n${description}` },
  ]
  for (let attempt = 0; attempt < 2; attempt++) {
    const reply = await speak({ system, messages, effort: 'medium', maxTokens: 20000 })
    const json = reply.slice(reply.indexOf('{'), reply.lastIndexOf('}') + 1)
    let parsed: unknown
    try {
      parsed = JSON.parse(json)
    } catch {
      parsed = null
    }
    const result = Generated.safeParse(parsed)
    if (result.success) return result.data
    const problems = parsed == null ? 'The reply was not valid JSON.' : z.prettifyError(result.error).slice(0, 2000)
    messages.push({ role: 'assistant', content: reply }, { role: 'user', content: `That didn't match the schema:\n${problems}\nReply with the corrected, complete JSON object only.` })
  }
  throw new HttpError(502, "Claude's scenario didn't come out in the right shape. Try again.")
}

export async function generateScenario(description: string): Promise<Scenario> {
  const text = description.trim()
  if (text.length < 40) throw badRequest('Describe the situation in a few sentences at least.')
  if (text.length > 20000) throw badRequest('That description is too long (max 20,000 characters).')

  const g = await writeScenario(text)

  const letters: DocLetter[] = ['A', 'B', 'C', 'D', 'E', 'F']
  const docs = new Map(g.documents.map((d) => [d.letter, d]))
  const contacts = new Map(g.support_contacts.map((c) => [c.role, c]))
  const missing = [...letters.filter((l) => !docs.has(l)), ...CONTACT_ROLES.filter((r) => !contacts.has(r))]
  if (missing.length) throw new HttpError(502, `The generated scenario was missing ${missing.join(', ')}. Try again.`)

  const [id] = nextIds(1)
  const slug = (title: string) =>
    title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'document'

  const documents = {} as Scenario['documents']
  for (const letter of letters) {
    const { letter: _, html, citation, delivery, ...doc } = docs.get(letter)!
    const file = `${id}${letter}-${slug(doc.title)}.html`
    fs.writeFileSync(path.join(paths.documents, file), documentPage(doc.title, doc.source, g.setting.school, clean(html)))
    ;(documents as Record<DocLetter, unknown>)[letter] = {
      ...doc,
      file,
      ...(letter === 'D' && { citation: citation || doc.source }),
      ...((letter === 'E' || letter === 'F') && delivery && { delivery }),
    }
  }
  const support_contacts = Object.fromEntries(
    CONTACT_ROLES.map((role) => {
      const { role: _, ...c } = contacts.get(role)!
      return [role, c]
    }),
  ) as Scenario['support_contacts']

  const scenario: Scenario = {
    ...g,
    id,
    status: 'ready',
    grade: Math.max(0, Math.min(12, g.grade)),
    student_persona: { ...g.student_persona, age: Math.max(4, Math.min(20, g.student_persona.age)) },
    documents,
    support_contacts,
  }
  try {
    validate([scenario])
  } catch (err) {
    for (const letter of letters) fs.rmSync(path.join(paths.documents, documents[letter]!.file), { force: true })
    throw err instanceof HttpError ? new HttpError(502, `The generated scenario didn't validate. Try again.\n${err.message}`) : err
  }
  upsertScenario(scenario)
  return scenario
}

/** Documents are served sandboxed with scripts off; this just keeps the markup tidy. */
function clean(html: string): string {
  return html
    .replace(/<(script|style|iframe|object|embed|link|meta)\b[\s\S]*?(<\/\1>|\/?>)/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript:/gi, '')
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`)

/** The same letterhead look as the hand-made documents. */
function documentPage(title: string, source: string, school: string, body: string): string {
  return `<!doctype html>
<!-- Generated from a teacher's scenario description. -->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<style>
  :root { --ink: #0d0106; --accent: #3626a7; --soft: #657ed4; --alert: #ff331f; --paper: #fbfbff; }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--paper); color: var(--ink); font: 14px/1.5 Georgia, 'Times New Roman', serif; }
  .sheet { max-width: 760px; margin: 0 auto; padding: 32px 36px 48px; }
  header { display: flex; gap: 16px; align-items: center; border-bottom: 3px double var(--accent); padding-bottom: 14px; }
  .seal { width: 58px; height: 58px; border-radius: 50%; border: 2px solid var(--accent); display: grid; place-items: center; font: 700 12px/1 system-ui, sans-serif; color: var(--accent); flex: none; }
  .org h1 { margin: 0; font-size: 22px; color: var(--accent); font-weight: 600; }
  .org p { margin: 2px 0 0; font: 12px/1.4 system-ui, sans-serif; color: rgba(13,1,6,.65); }
  h2 { text-align: center; font: 700 17px/1.3 system-ui, sans-serif; margin: 26px 0 16px; }
  h3 { font: 700 14px/1.3 system-ui, sans-serif; margin: 20px 0 6px; }
  table { width: 100%; border-collapse: collapse; margin: 14px 0; font: 13px/1.4 system-ui, sans-serif; }
  th, td { border: 1px solid rgba(13,1,6,.25); padding: 7px 9px; text-align: left; vertical-align: top; }
  th { background: rgba(101,126,212,.14); }
  .hand { font-family: 'Segoe Script', 'Bradley Hand', 'Comic Sans MS', cursive; color: var(--accent); font-size: 15px; }
  .flag { color: var(--alert); font-weight: 700; }
  .note { font: 12px/1.5 system-ui, sans-serif; color: rgba(13,1,6,.7); border-left: 3px solid var(--soft); padding: 6px 10px; margin: 16px 0; }
</style>
</head>
<body><div class="sheet">
<header>
  <div class="seal">PFPS</div>
  <div class="org"><h1>Pemberton Falls Public Schools</h1><p>${esc(school)} &nbsp;|&nbsp; ${esc(source)}</p></div>
</header>
<h2>${esc(title)}</h2>
${body}
</div></body></html>
`
}
