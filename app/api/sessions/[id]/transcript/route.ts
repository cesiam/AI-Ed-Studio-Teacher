import { NextResponse } from 'next/server'
import { getEvents, getSession, getSessionScenarios } from '@/server/db/sessions'
import { handle } from '@/server/errors'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Full record of a session (config, seed, plan, every event) for review or export. */
export const GET = handle(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params
  const session = getSession(id)
  return NextResponse.json({
    session,
    scenarios: getSessionScenarios(id),
    events: getEvents(id),
  })
})
