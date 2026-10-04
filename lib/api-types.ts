// Shapes returned by the /api routes. Safe to import from client components:
// these views never contain persona secrets or unrevealed documents.

export type Mode = 'single' | 'sequence'
export type Temperature = 'low' | 'medium' | 'high'
export type Mood = 'calm' | 'tense' | 'heated'
export type DocLetter = 'A' | 'B' | 'C' | 'D' | 'E' | 'F'
export type ContactRole = 'counselor' | 'nurse' | 'principal' | 'colleague'
export type ScenarioStatus = 'pending' | 'briefing' | 'conference' | 'ended'

export interface Stat {
  text: string
  source: string
}

export interface Research {
  prevalence: Stat
  why_address_it: Stat
  massachusetts: Stat
}

export interface ScenarioSummary {
  id: string
  status: 'ready' | 'stub'
  title: string
  topic: string
  raised_by: 'teacher' | 'parent'
  student_name: string
  grade: number
  tutorial: boolean
}

export interface CreateSessionRequest {
  mode: Mode
  count?: number
  temperature: Temperature
  starting_mood: Mood
  scenario_ids?: string[]
  surprise_type?: 'E' | 'F'
  teacher_name?: string
  /** Optional: exact starting tension and the band it may move in (0-100). Overrides starting_mood. */
  tension?: { start: number; min: number; max: number }
  /** Optional: keep random draws to one U.S. school level. */
  level?: 'elementary' | 'middle' | 'high' | 'all'
  /** Optional: reuse a seed. */
  seed?: number
  /** Optional: replay another session exactly (same config and seed). Other fields are ignored. */
  replay_of?: string
}

export interface DeliveryView {
  channel: 'email' | 'chat' | 'portal'
  app: string
  from: string
  subject: string
  body: string
  attachment_name: string
  notification: string
}

export interface DocumentView {
  letter: DocLetter
  title: string
  source: string
  citation?: string
  kind: 'record' | 'policy' | 'surprise'
  url: string
  /** How an E/F document reached the teacher. */
  received_from?: string
}

export interface EventView {
  id: number
  turn: number
  kind: 'teacher' | 'parent' | 'student' | 'tension' | 'surprise' | 'contact_question' | 'contact_reply' | 'system' | 'agreement' | 'staff'
  speaker: string | null
  content: string
  meta: Record<string, unknown> | null
  created_at: string
}

export interface DebriefView {
  summary: string
  went_well: string[]
  try_next: string[]
  acknowledged_strength: boolean
  hidden_truths_surfaced: string[]
}

export interface ScenarioView {
  idx: number
  scenario_id: string
  title: string
  tutorial: boolean
  topic: string
  research: Research
  raised_by: 'teacher' | 'parent'
  student_name: string
  student_first_name: string
  grade: number
  school: string
  teacher_role: string
  meeting_context: string
  /** How the parent seems on arrival, matched to the starting tension. */
  arrival: string
  /** Resting facial expressions for this scenario, added on top of tension. brow: + angry, - worried. */
  demeanor: { parent: { brow: number; smile: number }; student: { brow: number; smile: number } }
  teacher_concern: string
  student_strength: string
  parent: { name: string; relationship: string }
  status: ScenarioStatus
  tension: number
  starting_tension: number
  /** The band the meter can move in. A walkout only happens when max is 100. */
  tension_range: { min: number; max: number }
  turn_count: number
  ended_reason: 'teacher_ended' | 'walkout' | null
  documents: DocumentView[]
  contacts: { role: ContactRole; name: string; title: string; can_join: boolean }[]
  /** A colleague the teacher asked to come in, now sitting in on the conference. */
  in_room: { role: ContactRole; name: string; title: string } | null
  events: EventView[]
  surprise: { letter: 'E' | 'F'; turn: number; delivery: DeliveryView } | null
  debrief: DebriefView | null
  /** The teacher's conference notes form: field id -> what they wrote. */
  notes_form: Record<string, string>
}

export interface PlanItemView {
  idx: number
  scenario_id: string
  title: string
  student_name: string
  status: ScenarioStatus
  tension: number
  ended_reason: 'teacher_ended' | 'walkout' | null
  /** Only shown when known in advance (low temperature) or after the scenario ends. */
  surprise_plan: { type: 'E' | 'F'; turn: number } | null
}

export interface SessionView {
  id: string
  created_at: string
  mode: Mode
  temperature: Temperature
  starting_mood: Mood
  seed: number
  teacher_name: string
  status: 'active' | 'complete'
  replay_of: string | null
  current_index: number
  plan: PlanItemView[]
  current: ScenarioView | null
}

/** One past session in the transcript history. */
export interface HistoryItem {
  id: string
  created_at: string
  teacher_name: string
  status: 'active' | 'complete'
  conferences: {
    idx: number
    title: string
    student_name: string
    parent_name: string
    status: ScenarioStatus
    starting_tension: number
    tension: number
    turn_count: number
    ended_reason: 'teacher_ended' | 'walkout' | null
  }[]
}

/** Every conference in a past session, with its full transcript and debrief. */
export interface HistoryDetail {
  item: HistoryItem
  conferences: ScenarioView[]
}

export interface ApiError {
  error: string
}
