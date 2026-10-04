import { NextResponse } from 'next/server'
import { coachTip } from '@/server/ai/coach'
import { getScenario } from '@/server/db/scenarios'
import { getEvents, getSession, getSessionScenario } from '@/server/db/sessions'
import { handle } from '@/server/errors'
import { DEFAULT_COACH_STYLE, isCoachStyle } from '@/lib/coach-styles'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** A coach's suggestion for the teacher's next move, based on the conversation so far. */
export const GET = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params
  const requested = new URL(req.url).searchParams.get('style')
  const style = isCoachStyle(requested) ? requested : DEFAULT_COACH_STYLE
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
    style,
  })
  return NextResponse.json({ tip, after_event: events.at(-1)?.id ?? 0 })
})
