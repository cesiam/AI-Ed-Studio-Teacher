import { NextResponse } from 'next/server'
import { getSession } from '@/server/db/sessions'
import { handle } from '@/server/errors'
import { advance } from '@/server/game/engine'
import { sessionView } from '@/server/game/views'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** After a debrief: go to the next scenario's briefing, or complete the session. */
export const POST = handle(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params
  advance(id)
  return NextResponse.json(sessionView(getSession(id)))
})
