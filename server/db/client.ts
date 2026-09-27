import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { paths } from '../config'

// One connection per process. Next's dev server reloads modules on edit, so the
// handle lives on globalThis to avoid leaking a new connection on every reload.
const globalForDb = globalThis as unknown as { __bbDb?: DatabaseSync }

const SCHEMA = `
CREATE TABLE IF NOT EXISTS scenarios (
  id          TEXT PRIMARY KEY,
  status      TEXT NOT NULL CHECK (status IN ('ready', 'stub')),
  title       TEXT NOT NULL,
  data        TEXT NOT NULL,              -- full scenario JSON
  updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id            TEXT PRIMARY KEY,
  created_at    TEXT NOT NULL,
  mode          TEXT NOT NULL CHECK (mode IN ('single', 'sequence')),
  temperature   TEXT NOT NULL CHECK (temperature IN ('low', 'medium', 'high')),
  starting_mood TEXT NOT NULL CHECK (starting_mood IN ('calm', 'tense', 'heated')),
  seed          INTEGER NOT NULL,         -- replaying a session = same config + same seed
  config        TEXT NOT NULL,            -- JSON: the full request that built the plan
  current_index INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL CHECK (status IN ('active', 'complete')),
  replay_of     TEXT REFERENCES sessions(id)
);

CREATE TABLE IF NOT EXISTS session_scenarios (
  session_id      TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  idx             INTEGER NOT NULL,
  scenario_id     TEXT NOT NULL REFERENCES scenarios(id),
  surprise_type   TEXT NOT NULL CHECK (surprise_type IN ('E', 'F')),
  surprise_turn   INTEGER NOT NULL,
  status          TEXT NOT NULL CHECK (status IN ('pending', 'briefing', 'conference', 'ended')),
  tension         INTEGER NOT NULL,
  turn_count      INTEGER NOT NULL DEFAULT 0,
  surprise_delivered_turn INTEGER,
  revealed_docs   TEXT NOT NULL DEFAULT '[]',   -- JSON array of extra letters (E/F) the teacher can open
  ended_reason    TEXT,
  debrief         TEXT,                          -- JSON
  form            TEXT,                          -- JSON: the teacher's conference notes form, { field: text }
  PRIMARY KEY (session_id, idx)
);

CREATE TABLE IF NOT EXISTS events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id  TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  idx         INTEGER NOT NULL,          -- which scenario in the session
  turn        INTEGER NOT NULL,          -- teacher turn number (0 = before the first teacher turn)
  kind        TEXT NOT NULL,             -- see EventKind in server/db/sessions.ts
  speaker     TEXT,
  content     TEXT NOT NULL,
  meta        TEXT,                      -- JSON
  created_at  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS events_by_scenario ON events (session_id, idx, id);
`

export function db(): DatabaseSync {
  if (!globalForDb.__bbDb) {
    fs.mkdirSync(path.dirname(paths.database), { recursive: true })
    const conn = new DatabaseSync(paths.database)
    conn.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;')
    conn.exec(SCHEMA)
    // Databases created before the notes form existed need the column added.
    const cols = conn.prepare('PRAGMA table_info(session_scenarios)').all() as { name: string }[]
    if (!cols.some((c) => c.name === 'form')) conn.exec('ALTER TABLE session_scenarios ADD COLUMN form TEXT')
    globalForDb.__bbDb = conn
  }
  return globalForDb.__bbDb
}

/** Runs fn inside a transaction; rolls back if it throws. */
export function transaction<T>(fn: () => T): T {
  const conn = db()
  conn.exec('BEGIN')
  try {
    const result = fn()
    conn.exec('COMMIT')
    return result
  } catch (err) {
    conn.exec('ROLLBACK')
    throw err
  }
}
