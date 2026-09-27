/**
 * Validates content/scenarios.seed.json against the JSON schema and loads it
 * into SQLite. Re-running updates scenarios in place; sessions are kept.
 *
 *   pnpm seed            validate + upsert scenarios
 *   pnpm seed --reset    delete the database first (removes all sessions)
 *   pnpm seed --check    validate only, don't touch the database
 */
import fs from 'node:fs'
import path from 'node:path'
import Ajv from 'ajv'
import { paths } from '../server/config'
import type { SeedFile } from '../server/content/types'

const args = new Set(process.argv.slice(2))

function fail(msg: string): never {
  console.error(`\n✗ ${msg}\n`)
  process.exit(1)
}

const schema = JSON.parse(fs.readFileSync(paths.schemaFile, 'utf8'))
let seed: SeedFile
try {
  seed = JSON.parse(fs.readFileSync(paths.seedFile, 'utf8'))
} catch (err) {
  fail(`Could not parse ${paths.seedFile}: ${(err as Error).message}`)
}

const validate = new Ajv({ allErrors: true }).compile(schema)
if (!validate(seed)) {
  const lines = (validate.errors ?? []).map((e) => `  ${e.instancePath || '(root)'} ${e.message}`)
  fail(`scenarios.seed.json does not match the schema:\n${lines.join('\n')}`)
}

const ids = seed.scenarios.map((s) => s.id)
const dupes = ids.filter((id, i) => ids.indexOf(id) !== i)
if (dupes.length) fail(`Duplicate scenario ids: ${[...new Set(dupes)].join(', ')}`)

// Content checks the schema can't express.
const warnings: string[] = []
for (const s of seed.scenarios) {
  for (const [letter, doc] of Object.entries(s.documents)) {
    if (!doc.file.startsWith(`${s.id}${letter}-`)) {
      warnings.push(`${s.id}: document ${letter} file "${doc.file}" should start with "${s.id}${letter}-"`)
    }
    if (s.status === 'ready' && !fs.existsSync(path.join(paths.documents, doc.file))) {
      warnings.push(`${s.id}: missing content/documents/${doc.file} (a placeholder will be shown)`)
    }
  }
  if (s.status === 'ready' && JSON.stringify(s).includes('TODO')) {
    warnings.push(`${s.id}: marked "ready" but still contains TODO text`)
  }
}

if (args.has('--check')) {
  warnings.forEach((w) => console.warn(`! ${w}`))
  console.log(`✓ ${seed.scenarios.length} scenarios valid.`)
  process.exit(0)
}

if (args.has('--reset')) {
  for (const suffix of ['', '-wal', '-shm']) fs.rmSync(paths.database + suffix, { force: true })
  console.log(`Deleted ${paths.database}`)
}

// Import after the optional reset so the connection opens a fresh file.
async function load() {
  const { upsertScenario } = await import('../server/db/scenarios')
  const { transaction } = await import('../server/db/client')
  transaction(() => seed.scenarios.forEach(upsertScenario))

  warnings.forEach((w) => console.warn(`! ${w}`))
  const ready = seed.scenarios.filter((s) => s.status === 'ready').length
  console.log(`✓ Seeded ${seed.scenarios.length} scenarios (${ready} ready, ${seed.scenarios.length - ready} stubs) into ${paths.database}`)
}

load().catch((err) => fail(err instanceof Error ? err.message : String(err)))
