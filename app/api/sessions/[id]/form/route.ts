import { NextResponse } from 'next/server'
import { getSession, getSessionScenario, updateSessionScenario } from '@/server/db/sessions'
import { badRequest, handle, readJson } from '@/server/errors'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Saves the teacher's conference notes form. Body: { idx: number, form: { [field]: string } } */
export const PUT = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params
  const body = await readJson(req)
  const idx = Number(body.idx)
  const raw = body.form
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw badRequest('form must be an object.')
  const entries = Object.entries(raw as Record<string, unknown>)
  if (entries.length > 200) throw badRequest('Too many fields.')
  const form: Record<string, string> = {}
  for (const [key, value] of entries) {
    if (typeof value !== 'string' || key.length > 60) throw badRequest('Form fields must be text.')
    if (value.trim()) form[key] = value.slice(0, 2000)
  }
  getSession(id)
  getSessionScenario(id, idx)
  updateSessionScenario(id, idx, { form })
  return NextResponse.json({ ok: true })
})
