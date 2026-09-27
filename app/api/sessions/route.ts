import { NextResponse } from 'next/server'
import { getSession, listSessions } from '@/server/db/sessions'
import { handle, readJson } from '@/server/errors'
import { createSessionFromRequest } from '@/server/game/engine'
import { sessionView } from '@/server/game/views'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Recent sessions, for picking one to replay. */
export const GET = handle(async () => {
  const sessions = listSessions().map((s) => ({
    id: s.id,
    created_at: s.created_at,
    mode: s.mode,
    temperature: s.temperature,
    starting_mood: s.starting_mood,
    seed: s.seed,
    status: s.status,
    replay_of: s.replay_of,
  }))
  return NextResponse.json({ sessions })
})

/** Create a session. Body: CreateSessionRequest (see lib/api-types.ts). */
export const POST = handle(async (req: Request) => {
  const id = createSessionFromRequest(await readJson(req))
  return NextResponse.json(sessionView(getSession(id)), { status: 201 })
})
