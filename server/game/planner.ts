import { isSchoolLevel, levelFor } from '@/lib/school-level'
import { GAME } from '../config'
import type { SurpriseLetter } from '../content/types'
import { badRequest } from '../errors'
import { Rng } from './rng'
import { moodFor } from './tension'

export type Mode = 'single' | 'sequence'
export type Temperature = 'low' | 'medium' | 'high'
export type Mood = 'calm' | 'tense' | 'heated'

/** Everything needed to rebuild a session's plan. Stored with the session. */
export interface SessionConfig {
  mode: Mode
  /** Number of scenarios: 1 for single, 2-5 for sequence. */
  count: number
  temperature: Temperature
  starting_mood: Mood
  /** Teacher's picks (low/medium). In low, this is also the order. Empty for high. */
  scenario_ids: string[]
  /** Teacher's choice of surprise document (low only). */
  surprise_type: SurpriseLetter | null
  /** How the characters address the teacher, e.g. "Ms. Rivera". */
  teacher_name: string
  /** Teacher-set starting tension and band. Absent on older sessions (see tensionRange). */
  tension?: { start: number; min: number; max: number }
  /** Snapshot of the random pool (ready scenario ids) used by high temperature. */
  pool: string[]
}

export interface PlannedScenario {
  scenario_id: string
  surprise_type: SurpriseLetter
  surprise_turn: number
}

/**
 * Builds the scenario order and surprise schedule from config + seed.
 *
 *   low     teacher picks scenarios and order; surprise type is the teacher's; turn 4
 *   medium  teacher picks scenarios; order shuffled; surprise type random; turn 4
 *   high    scenarios and order random; surprise type random; turn random in 3..7
 *
 * Pure and deterministic: the draw order below must not change, or stored
 * seeds will stop replaying to the same plan.
 */
export function buildPlan(config: SessionConfig, seed: number): PlannedScenario[] {
  const rng = new Rng(seed)

  let ids: string[]
  switch (config.temperature) {
    case 'low':
      ids = [...config.scenario_ids]
      break
    case 'medium':
      ids = rng.shuffle(config.scenario_ids)
      break
    case 'high':
      ids = rng.shuffle(config.pool).slice(0, config.count)
      break
  }

  return ids.map((scenario_id) => {
    const surprise_type: SurpriseLetter =
      config.temperature === 'low' ? config.surprise_type! : rng.pick<SurpriseLetter>(['E', 'F'])
    const surprise_turn =
      config.temperature === 'high'
        ? rng.int(GAME.randomSurpriseTurn.min, GAME.randomSurpriseTurn.max)
        : GAME.fixedSurpriseTurn
    return { scenario_id, surprise_type, surprise_turn }
  })
}

/** Validates a raw setup request into a SessionConfig. Throws 400 on bad input. */
export function parseConfig(
  body: Record<string, unknown>,
  scenarios: { id: string; status: 'ready' | 'stub'; tutorial?: boolean; grade: number }[],
): SessionConfig {
  const mode = oneOf(body.mode, ['single', 'sequence'] as const, 'mode')
  const temperature = oneOf(body.temperature, ['low', 'medium', 'high'] as const, 'temperature')
  const tension = parseTension(body.tension)
  const starting_mood = tension ? moodFor(tension.start) : oneOf(body.starting_mood, ['calm', 'tense', 'heated'] as const, 'starting_mood')

  let count = 1
  if (mode === 'sequence') {
    count = Number(body.count)
    const { min, max } = GAME.sequenceLength
    if (!Number.isInteger(count) || count < min || count > max) {
      throw badRequest(`count must be an integer from ${min} to ${max} in sequence mode.`)
    }
  }

  const known = new Set(scenarios.map((s) => s.id))
  // Optional school level: random draws stay within it.
  const level = body.level === undefined || body.level === null || body.level === 'all' ? null : body.level
  if (level !== null && !isSchoolLevel(level)) throw badRequest('level must be elementary, middle, high or all.')
  // The tutorial is only played on purpose, never drawn at random.
  const pool = scenarios
    .filter((s) => s.status === 'ready' && !s.tutorial && (level === null || levelFor(s.grade) === level))
    .map((s) => s.id)

  let scenario_ids: string[] = []
  if (temperature === 'high') {
    if (pool.length < count) {
      throw badRequest(
        `High temperature draws from ready scenarios${level ? ` at the ${level} school level` : ''}, but only ${pool.length} ${pool.length === 1 ? 'is' : 'are'} ready and this session needs ${count}. Fill in more scenarios in content/scenarios.seed.json (and set status to "ready"), or use low/medium temperature.`,
      )
    }
  } else {
    if (!Array.isArray(body.scenario_ids)) throw badRequest('scenario_ids must be an array of scenario ids.')
    scenario_ids = body.scenario_ids.map(String)
    if (scenario_ids.length !== count) {
      throw badRequest(`Pick exactly ${count} scenario${count === 1 ? '' : 's'} (got ${scenario_ids.length}).`)
    }
    if (new Set(scenario_ids).size !== scenario_ids.length) throw badRequest('scenario_ids must not repeat.')
    for (const id of scenario_ids) if (!known.has(id)) throw badRequest(`Unknown scenario id: ${id}`)
  }

  let surprise_type: SurpriseLetter | null = null
  if (temperature === 'low') surprise_type = oneOf(body.surprise_type, ['E', 'F'] as const, 'surprise_type')

  const teacher_name =
    typeof body.teacher_name === 'string' && body.teacher_name.trim() ? body.teacher_name.trim().slice(0, 60) : 'the teacher'

  return { mode, count, temperature, starting_mood, scenario_ids, surprise_type, teacher_name, pool, ...(tension && { tension }) }
}

function parseTension(value: unknown): SessionConfig['tension'] {
  if (value === undefined || value === null) return undefined
  const t = value as Record<string, unknown>
  const [start, min, max] = [t.start, t.min, t.max].map(Number)
  const valid = [start, min, max].every((n) => Number.isInteger(n) && n >= 0 && n <= 100)
  if (!valid) throw badRequest('tension.start, tension.min and tension.max must be whole numbers from 0 to 100.')
  if (min < GAME.minTension) throw badRequest(`Tension can't go below ${GAME.minTension} (guarded).`)
  if (max - min < 10) throw badRequest('The tension range must span at least 10 points.')
  if (start < min || start > max) throw badRequest('The starting tension must sit inside the range.')
  return { start, min, max }
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], field: string): T {
  if (typeof value === 'string' && (allowed as readonly string[]).includes(value)) return value as T
  throw badRequest(`${field} must be one of: ${allowed.join(', ')}.`)
}
