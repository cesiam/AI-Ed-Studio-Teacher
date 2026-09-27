# Building Bridges

A practice room for difficult parent-teacher conferences. Teachers review a student's records, then sit across from an AI-played parent and student who stay in character. A tension meter responds to every turn, and a surprise document lands partway through.

All people, schools, and records are fictional (Pemberton Falls Public Schools, MA).

## Stack, and why

| Piece | Choice | Why |
| --- | --- | --- |
| App + API | **Next.js 16 (TypeScript)** with route handlers | The landing page is already Next. One process, one language, and types shared between the API and the UI (`lib/api-types.ts`). |
| Storage | **SQLite** via Node's built-in `node:sqlite` | Nothing to install or compile. A single file in `data/`. |
| AI | **Anthropic API**, model `claude-sonnet-5`, official `@anthropic-ai/sdk` | Plays the parent, student, and support contacts, scores tension, and writes the debrief. Scoring, contacts, and the debrief use structured outputs (zod) so the JSON is always valid. |
| Validation | **JSON Schema** (`ajv`) for content | You edit scenarios as JSON, and the seed script rejects anything malformed before it reaches the database. |

## Setup

Requires **Node 22.13 or newer** (for `node:sqlite`). Node 24 is recommended.

```bash
# 1. Install dependencies. The repo pins pnpm 12.3.4. If `pnpm` fails through
#    corepack, use `npx pnpm@12.3.4` in place of `pnpm` in any command below.
pnpm install

# 2. Add your Anthropic API key.
cp .env.example .env.local
#    then edit .env.local:  ANTHROPIC_API_KEY=sk-ant-...

# 3. Validate the scenarios and load them into SQLite.
pnpm seed

# 4. Run it.
pnpm dev
```

Open http://localhost:3000 for the landing page, or go straight to http://localhost:3000/practice.

If the API says your key "is not scoped to a workspace", either create a key inside a workspace in the Console, or add `ANTHROPIC_WORKSPACE_ID=wrkspc_...` to `.env.local`.

The API key is read only from the `ANTHROPIC_API_KEY` environment variable and is never sent to the browser. `.env.local` is git-ignored.

### Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Dev server |
| `pnpm build && pnpm start` | Production build and server |
| `pnpm seed` | Validate `content/scenarios.seed.json` and upsert it into SQLite. Sessions are kept. |
| `pnpm seed --reset` | Delete the database first (removes all sessions) |
| `pnpm seed:check` | Validate only. Also warns about missing document files and leftover `TODO`s in ready scenarios. |
| `pnpm stubs` | Add TODO stubs for any missing scenario ids 01–11. Never overwrites existing scenarios. |
| `pnpm typecheck` | TypeScript check |

Node prints `ExperimentalWarning: SQLite is an experimental feature` on startup. It's harmless.

## Project layout

```
app/
  page.tsx                   landing page (links to /practice)
  practice/                  setup screen, and /practice/[id] for a session
  api/                       route handlers (thin: parse the request, call the engine, return a view)
components/
  practice/                  session UI: room, figures, tension meter, debrief
    computer/                the teacher's laptop: Case File, StudentView, PFPS Mail, PFPS Chat, Notes
content/
  schema/scenario.schema.json  JSON Schema for scenarios
  scenarios.seed.json          all 11 scenarios (01 complete, 02-11 stubs)
  documents/                   HTML documents, e.g. 01A-attendance-letter.html
server/                      server-only code
  config.ts                  model id, paths, game constants
  content/                   scenario types, document loading
  db/                        SQLite connection, schema, and queries
  game/                      planner (temperature + seed), tension rules, engine, views
  ai/                        prompts and calls: characters, judge, contacts, debrief
lib/api-types.ts             response shapes shared by the API and the UI
scripts/                     seed and stub scripts
data/                        SQLite database (git-ignored; created by `pnpm seed`)
```

## Content

### Scenario format

`content/schema/scenario.schema.json` is the source of truth. Each scenario has:

- `id` (two digits, also the document file prefix), `status` (`ready` or `stub`), `title`, `raised_by` (`teacher` or `parent`), `student_name`, `grade`
- `topic`: the situation being practiced (e.g. "Parent reports bruises or bullying")
- `research`: `prevalence`, `why_address_it`, and `massachusetts`, each a `{ text, source }`. Shown to the teacher in the Case File during the briefing.
- `setting`: school, who the teacher is, and when/where the meeting happens
- `teacher_concern` and `student_strength` (the "BUT I notice…" observation)
- `documents`:
  - `A`, `B`, `C`: internal records
  - `D`: cited policy (adds `citation`)
  - `E`: reveals the school dropped the ball
  - `F`: contradicts the family's likely claim

  Each has a `title`, `file`, `source`, and `summary`. The summary is given to the tension judge and support contacts, never to the parent or student. E and F also have a `delivery` block (channel, app, sender, subject, body, attachment name, and notification text) so they arrive on the teacher's computer the way they would in real life.
- `parent_persona` and `student_persona`: `personality`, `speaking_style`, `knows[]`, `hiding[]` (hiding or hasn't said), and `likely_claim` (the claim F contradicts). The parent can also have `softens_when[]` and `escalates_when[]`; the student can have `speaks_up_when[]`.
- `support_contacts`: `counselor`, `nurse`, `principal`, and `colleague`, each with a `name`, `title`, what they `knows`, and `can_share` (a document letter, or `null`).

All 11 scenarios have their topic, title, who raised it, and research stats. Scenario 01 (Maya Reyes, chronic absence) is complete and is the model to copy. 02–11 still need students, personas, documents, and contacts.

### Filling in a stub

1. Replace every `TODO` in the scenario in `content/scenarios.seed.json`. Check `grade` too: stubs default to 9.
2. Add its six HTML files to `content/documents/`, named `<id><letter>-<slug>.html` (e.g. `02A-tardy-log.html`), and put those names in each document's `file` field.
3. Change `status` from `"stub"` to `"ready"`. Only ready scenarios can be drawn at High temperature.
4. Run `pnpm seed`.

A missing document file doesn't break anything: the teacher sees a placeholder with the expected file name and the document's summary.

### Documents

The six files for scenario 01 in `content/documents/` are **samples I generated** so the flow can be tested. Replace them with your own files of the same names, or change the `file` fields to match yours. Documents render in a sandboxed frame with no scripts. Relative images, stylesheets, and fonts (e.g. a logo at `content/documents/assets/pfps-seal.png`) are served from `/api/content/documents/…`.

## How a session works

### Setup (`/practice`)

1. **Mode**: `single`, or `sequence` with 2 to 5 scenarios back to back.
2. **Temperature**:

   | | Scenarios | Order | Surprise type | Surprise turn |
   | --- | --- | --- | --- | --- |
   | Low | teacher picks | teacher's order | teacher picks E or F | 4 |
   | Medium | teacher picks | shuffled | random | 4 |
   | High | random (ready scenarios only) | random | random | random, 3 to 7 |

3. **Starting mood**: calm, tense, or heated, which starts the tension meter at 20, 45, or 70.
4. **Seed**: every session stores a 32-bit seed. The plan (scenarios, order, surprise type, surprise turn) is a pure function of the config and the seed (`server/game/planner.ts`).

### Briefing

The teacher sees the case file (concern and strength) and documents A–D before anyone arrives. PFPS Chat is already open for questions to colleagues.

### Conference

The screen is the teacher's point of view: the parent and student sit across the desk, peeking over the laptop and looking straight at the teacher. Their eyes follow the cursor, the parent's brows knit as tension rises, and the room warms toward scarlet above 50.

Each teacher turn (`server/game/engine.ts` → `takeTurn`):

1. **Judge.** A separate Claude call scores the turn and returns JSON: `tension_change` (clamped to ±15), a one-line `reason`, and who should respond. Naming the student's strengths, listening, calmly citing documents, and owning school mistakes lower tension. Blame, jargon, dismissing the family's view, and threats raise it.
2. **Respond.** The parent usually answers, with their tone set by the new tension level: open, guarded, frustrated, or heated. The student speaks when addressed or when the moment calls for it. Each character has their own system prompt built from their persona, stays in character, never reveals it's an AI, and knows only what the persona lists plus what's said aloud. Neither can see the teacher's screen or chats.
3. **Surprise.** On its scheduled turn, the surprise document is delivered once, as a notification on the laptop (e.g. "New message from Attendance Office · 1 attachment") and an email with the attachment.
4. **Walkout.** If tension reaches 100, the parent says a last line and leaves, which ends the scenario.

The teacher can message support contacts at any time. Replies are in character, and a contact may attach the document they're allowed to share. Chats don't count as turns.

### Debrief

After the teacher ends the conference (or the parent walks out), a coaching call writes a short debrief: summary, what worked, what to try next, whether the "BUT I notice…" strength was shared, and which hidden facts came out. In sequence mode, **Next family** moves on to the next briefing.

### Replay

**Replay this session** (on the summary screen, or under **Replay a past session** on setup) creates a new session with the same config and seed, so the scenarios, order, surprise type, and surprise turn come out identical. The conversation itself plays out fresh: the model's wording isn't deterministic, and Sonnet 5 doesn't accept a sampling temperature. `GET /api/sessions/:id/transcript` returns a session's config, seed, plan, and every event, for review.

## API

All bodies are JSON. The response shapes are in `lib/api-types.ts`. Every session route returns the full `SessionView` after it acts.

| Method | Path | Body | Purpose |
| --- | --- | --- | --- |
| GET | `/api/scenarios` | | Scenario list (no persona details) |
| GET | `/api/sessions` | | Recent sessions |
| POST | `/api/sessions` | `{ mode, count?, temperature, starting_mood, scenario_ids?, surprise_type?, teacher_name?, seed? }` or `{ replay_of }` | Create a session |
| GET | `/api/sessions/:id` | | Current state |
| POST | `/api/sessions/:id/start` | | Briefing → conference; the parent speaks first |
| POST | `/api/sessions/:id/turns` | `{ message }` | Teacher speaks |
| POST | `/api/sessions/:id/contacts` | `{ role, message }` | Message the counselor, nurse, principal, or colleague |
| POST | `/api/sessions/:id/end` | | End the conference and write the debrief |
| POST | `/api/sessions/:id/advance` | | Next scenario, or complete the session |
| GET | `/api/sessions/:id/transcript` | | Full record for review |
| GET | `/api/sessions/:id/scenarios/:idx/documents/:letter` | | Document HTML. A–D always; E/F only once delivered or shared |

Errors come back as `{ "error": "..." }` with a 4xx or 5xx status. A second request to a session while one is still running gets a 409.

Personas, hidden facts, likely claims, and undelivered surprise documents never leave the server.

## Cost

A teacher turn makes 2 to 3 model calls (judge, parent, and sometimes the student). Starting a conference makes 1, a chat message 1, and a debrief 1. System prompts are marked for prompt caching.
