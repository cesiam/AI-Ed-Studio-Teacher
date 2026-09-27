import { NextResponse } from 'next/server'
import { listSessionsWithConferences } from '@/server/db/sessions'
import { handle } from '@/server/errors'
import { historyItem } from '@/server/game/views'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Past sessions that got as far as a conference, newest first. */
export const GET = handle(async () => {
  return NextResponse.json({ sessions: listSessionsWithConferences().map(historyItem) })
})
