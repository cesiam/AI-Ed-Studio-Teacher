import { NextResponse } from 'next/server'
import { getSession } from '@/server/db/sessions'
import { handle, readJson } from '@/server/errors'
import { joinConference } from '@/server/game/engine'
import { sessionView } from '@/server/game/views'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Ask a colleague to come into the room. Body: { role: ContactRole } */
export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params
  const body = await readJson(req)
  await joinConference(id, String(body.role ?? ''))
  return NextResponse.json(sessionView(getSession(id)))
})
