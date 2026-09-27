import { NextResponse } from 'next/server'
import { getSession } from '@/server/db/sessions'
import { handle } from '@/server/errors'
import { historyDetail } from '@/server/game/views'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** One past session: every conference's transcript, tension changes, and debrief. */
export const GET = handle(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params
  return NextResponse.json(historyDetail(getSession(id)))
})
