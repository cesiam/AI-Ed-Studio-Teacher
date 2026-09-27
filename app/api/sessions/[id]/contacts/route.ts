import { NextResponse } from 'next/server'
import { getSession } from '@/server/db/sessions'
import { handle, readJson } from '@/server/errors'
import { consultContact } from '@/server/game/engine'
import { sessionView } from '@/server/game/views'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Message a support contact. Body: { role: 'counselor'|'nurse'|'principal'|'colleague', message: string } */
export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params
  const body = await readJson(req)
  await consultContact(id, String(body.role ?? ''), String(body.message ?? ''))
  return NextResponse.json(sessionView(getSession(id)))
})
