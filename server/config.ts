import path from 'node:path'

const root = process.cwd()

export const paths = {
  root,
  content: path.join(root, 'content'),
  documents: path.join(root, 'content', 'documents'),
  seedFile: path.join(root, 'content', 'scenarios.seed.json'),
  schemaFile: path.join(root, 'content', 'schema', 'scenario.schema.json'),
  database: process.env.DATABASE_PATH ?? path.join(root, 'data', 'building-bridges.sqlite'),
}

/** The model that plays every AI role (parent, student, judge, contacts, debrief). */
export const MODEL = 'claude-sonnet-5'

export const GAME = {
  moodStart: { calm: 30, tense: 45, heated: 70 } as const,
  /** Tension never drops below this: a parent in a school meeting is at least a little guarded. */
  minTension: 26,
  fixedSurpriseTurn: 4,
  randomSurpriseTurn: { min: 3, max: 7 },
  sequenceLength: { min: 2, max: 5 },
  /** Largest tension swing the judge can apply in one turn. Kept small so the meter drifts rather than jumps. */
  maxTensionStep: 8,
  /** Turns of transcript the judge sees (the whole thing goes to characters). */
  judgeWindow: 16,
  maxTeacherMessageLength: 2000,
  /**
   * A conference ends once the teacher and family agree on next steps. If the
   * conversation is truly stuck, ending without a plan unlocks after this many
   * teacher turns (never before the teacher has said anything).
   */
  endWithoutPlanAfterTurns: 8,
}
