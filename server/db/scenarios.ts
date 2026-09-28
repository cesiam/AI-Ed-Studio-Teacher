import fs from 'node:fs'
import { paths } from '../config'
import type { Scenario, SeedFile } from '../content/types'
import { notFound } from '../errors'
import { db, transaction } from './client'

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

// The database file isn't committed (data/ is gitignored), so a fresh deploy
// starts empty. Load the committed seed once per server start, the same
// upsert `pnpm seed` does: fills an empty database and picks up content
// edits on redeploy, while sessions and uploaded scenarios are left alone.
// (`pnpm seed` still validates the file against the schema; run it after edits.)
const globalForSeed = globalThis as unknown as { __bbSeeded?: boolean }

function ensureSeeded(): void {
  if (globalForSeed.__bbSeeded) return
  const seed = JSON.parse(fs.readFileSync(paths.seedFile, 'utf8')) as SeedFile
  transaction(() => seed.scenarios.forEach(upsertScenario))
  globalForSeed.__bbSeeded = true
}

export function listScenarios(): Scenario[] {
  ensureSeeded()
  const rows = db().prepare('SELECT data FROM scenarios ORDER BY id').all() as unknown as ScenarioRow[]
  return rows.map((r) => JSON.parse(r.data) as Scenario)
}

export function getScenario(id: string): Scenario {
  ensureSeeded()
  const row = db().prepare('SELECT data FROM scenarios WHERE id = ?').get(id) as unknown as
    | ScenarioRow
    | undefined
  if (!row) throw notFound(`Scenario ${id} not found.`)
  return JSON.parse(row.data) as Scenario
}
