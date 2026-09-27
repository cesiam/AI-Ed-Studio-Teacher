import { NextResponse } from 'next/server'
import { getSession } from '@/server/db/sessions'
import { handle } from '@/server/errors'
import { sessionView } from '@/server/game/views'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = handle(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params
  return NextResponse.json(sessionView(getSession(id)))
})
