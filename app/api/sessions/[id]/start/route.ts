import { NextResponse } from 'next/server'
import { getSession } from '@/server/db/sessions'
import { handle } from '@/server/errors'
import { startConference } from '@/server/game/engine'
import { sessionView } from '@/server/game/views'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Briefing -> conference. The parent speaks first. */
export const POST = handle(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params
  await startConference(id)
  return NextResponse.json(sessionView(getSession(id)))
})
