import { NextResponse } from 'next/server'
import { coachTip } from '@/server/ai/coach'
import { getScenario } from '@/server/db/scenarios'
import { getEvents, getSession, getSessionScenario } from '@/server/db/sessions'
import { handle } from '@/server/errors'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** A coach's suggestion for the teacher's next move, based on the conversation so far. */
export const GET = handle(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params
  const session = getSession(id)
  const row = getSessionScenario(id, session.current_index)
  const events = getEvents(id, row.idx)
  const tip = await coachTip({
    sessionId: id,
    scenario: getScenario(row.scenario_id),
    teacherName: session.config.teacher_name,
    events,
    form: row.form ?? {},
    turn: row.turn_count,
  })
  return NextResponse.json({ tip, after_event: events.at(-1)?.id ?? 0 })
})
