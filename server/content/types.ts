// TypeScript mirror of content/schema/scenario.schema.json.
// The seed script validates the JSON against the schema before it reaches the DB,
// so code that reads scenarios back out can trust this shape.

export type DocLetter = 'A' | 'B' | 'C' | 'D' | 'E' | 'F'
export type SurpriseLetter = 'E' | 'F'
export type ContactRole = 'counselor' | 'nurse' | 'principal' | 'colleague'

export const CONTACT_ROLES: ContactRole[] = ['counselor', 'nurse', 'principal', 'colleague']
export const BRIEFING_DOCS: DocLetter[] = ['A', 'B', 'C', 'D']

export interface DocumentRecord {
  title: string
  file: string
  source: string
  summary: string
}

export interface PolicyDocument extends DocumentRecord {
  citation: string
}

export interface Delivery {
  channel: 'email' | 'chat' | 'portal'
  app: string
  from: string
  subject: string
  body: string
  attachment_name: string
  notification: string
}

export interface SurpriseDocument extends DocumentRecord {
  delivery: Delivery
}

export interface PersonaBase {
  name: string
  personality: string
  speaking_style: string
  knows: string[]
  hiding: string[]
  likely_claim: string
}

export interface ParentPersona extends PersonaBase {
  relationship: string
  softens_when?: string[]
  escalates_when?: string[]
}

export interface StudentPersona extends PersonaBase {
  age: number
  speaks_up_when?: string[]
}

export interface SupportContact {
  name: string
  title: string
  knows: string
  can_share: DocLetter | null
  /** Can be asked to walk into the room and join the conference. */
  can_join?: boolean
}

export interface Stat {
  text: string
  source: string
}

export interface Research {
  prevalence: Stat
  why_address_it: Stat
  massachusetts: Stat
}

export interface Scenario {
  id: string
  status: 'ready' | 'stub'
  title: string
  topic: string
  research: Research
  raised_by: 'teacher' | 'parent'
  student_name: string
  grade: number
  setting: {
    school: string
    teacher_role: string
    meeting_context: string
  }
  teacher_concern: string
  student_strength: string
  /** A is required. The rest are optional: a tutorial may have only one or two records and no surprise. */
  documents: {
    A: DocumentRecord
    B?: DocumentRecord
    C?: DocumentRecord
    D?: PolicyDocument
    E?: SurpriseDocument
    F?: SurpriseDocument
  }
  /** A gentle first conference: shown first in setup, with coaching tips and no walkout. */
  tutorial?: boolean
  parent_persona: ParentPersona
  student_persona: StudentPersona
  support_contacts: Record<ContactRole, SupportContact>
}

export interface SeedFile {
  scenarios: Scenario[]
}

export function docFor(scenario: Scenario, letter: DocLetter): DocumentRecord | undefined {
  return scenario.documents[letter]
}

/** Which of A-F this scenario actually has. */
export function docLetters(scenario: Scenario): DocLetter[] {
  return (['A', 'B', 'C', 'D', 'E', 'F'] as const).filter((l) => scenario.documents[l])
}

export function firstName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  // Skip a title so "Dr. Lakshmi Natarajan" is "Lakshmi", not "Dr.".
  return (/^(Dr|Mr|Mrs|Ms|Mx)\.?$/i.test(parts[0]) && parts.length > 1 ? parts[1] : parts[0]) ?? fullName
}
