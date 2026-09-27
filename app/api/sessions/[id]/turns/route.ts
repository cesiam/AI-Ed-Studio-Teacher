import { NextResponse } from 'next/server'
import { getSession } from '@/server/db/sessions'
import { handle, readJson } from '@/server/errors'
import { takeTurn } from '@/server/game/engine'
import { sessionView } from '@/server/game/views'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Teacher speaks. Body: { message: string, show?: DocLetter, print?: boolean, to?: 'both' | 'parent' | 'student' }
 * (show: turn the laptop around to show that document, or with print: hand them a printed copy;
 * to: who the teacher is addressing).
 */
export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params
  const body = await readJson(req)
  const to = body.to === 'parent' || body.to === 'student' || body.to === 'staff' ? body.to : 'both'
  await takeTurn(id, String(body.message ?? ''), typeof body.show === 'string' ? body.show : undefined, to, body.print === true)
  return NextResponse.json(sessionView(getSession(id)))
})
