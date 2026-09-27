import type { Scenario } from '../content/types'
import { notFound } from '../errors'
import { db } from './client'

interface ScenarioRow {
  id: string
  status: string
  title: string
  data: string
}

export function upsertScenario(s: Scenario): void {
  db()
    .prepare(
      `INSERT INTO scenarios (id, status, title, data, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         status = excluded.status, title = excluded.title,
         data = excluded.data, updated_at = excluded.updated_at`,
    )
    .run(s.id, s.status, s.title, JSON.stringify(s), new Date().toISOString())
}

export function listScenarios(): Scenario[] {
  const rows = db().prepare('SELECT data FROM scenarios ORDER BY id').all() as unknown as ScenarioRow[]
  return rows.map((r) => JSON.parse(r.data) as Scenario)
}

export function getScenario(id: string): Scenario {
  const row = db().prepare('SELECT data FROM scenarios WHERE id = ?').get(id) as unknown as
    | ScenarioRow
    | undefined
  if (!row) throw notFound(`Scenario ${id} not found. Did you run \`pnpm seed\`?`)
  return JSON.parse(row.data) as Scenario
}
