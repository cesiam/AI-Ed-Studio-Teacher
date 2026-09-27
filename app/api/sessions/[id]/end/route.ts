import { NextResponse } from 'next/server'
import { getSession } from '@/server/db/sessions'
import { handle } from '@/server/errors'
import { endConference } from '@/server/game/engine'
import { sessionView } from '@/server/game/views'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Teacher ends the conference; returns the session with the debrief filled in. */
export const POST = handle(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params
  await endConference(id)
  return NextResponse.json(sessionView(getSession(id)))
})
