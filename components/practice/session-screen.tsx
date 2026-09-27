'use client'

import { useCallback, useEffect, useState } from 'react'
import type { ContactRole, DocLetter, SessionView } from '@/lib/api-types'
import { api } from './api'
import { ConferenceRoom, type Busy } from './conference-room'
import { SessionSummary } from './session-summary'

/** Loads a session and routes between briefing, conference, debrief, and summary. */
export function SessionScreen({ sessionId }: { sessionId: string }) {
  const [session, setSession] = useState<SessionView | null>(null)
  const [busy, setBusy] = useState<Busy>(null)
  const [pendingLine, setPendingLine] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.session(sessionId).then(setSession, (e: Error) => setError(e.message))
  }, [sessionId])

  const run = useCallback(
    async (kind: Exclude<Busy, null>, fn: () => Promise<SessionView>) => {
      setBusy(kind)
      setError(null)
      try {
        setSession(await fn())
      } catch (e) {
        setError((e as Error).message)
        // Resync: part of a turn may have been saved before a later step failed.
        api.session(sessionId).then(setSession, () => {})
        throw e
      } finally {
        setBusy(null)
      }
    },
    [sessionId],
  )

  const actions = {
    start: () => run('start', () => api.start(sessionId)).catch(() => {}),
    speak: async (message: string, show?: DocLetter, to?: 'both' | 'parent' | 'student' | 'staff', print?: boolean) => {
      setPendingLine(message || null)
      try {
        await run('speak', () => api.speak(sessionId, message, show, to, print))
        return true
      } catch {
        return false
      } finally {
        setPendingLine(null)
      }
    },
    consult: (role: ContactRole, message: string) => run('consult', () => api.consult(sessionId, role, message)),
    join: (role: ContactRole) => run('join', () => api.join(sessionId, role)).catch(() => {}),
    end: () => run('end', () => api.end(sessionId)).catch(() => {}),
    advance: () => run('advance', () => api.advance(sessionId)).catch(() => {}),
  }

  if (!session) {
    return (
      <main className="grid min-h-svh place-items-center bg-coffee font-body text-ghost/70">
        {error ?? 'Opening the classroom…'}
      </main>
    )
  }

  if (session.status === 'complete' || !session.current) {
    return <SessionSummary session={session} />
  }

  return (
    <ConferenceRoom
      session={session}
      scenario={session.current}
      busy={busy}
      pendingLine={pendingLine}
      error={error}
      onDismissError={() => setError(null)}
      actions={actions}
    />
  )
}
