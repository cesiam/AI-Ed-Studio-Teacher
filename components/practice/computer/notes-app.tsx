'use client'

import { useEffect, useRef } from 'react'
import { Paperclip } from 'lucide-react'
import type { ScenarioView } from '@/lib/api-types'
import { cn } from '@/lib/utils'

/** Running conference notes: everything said in the room, with each tension change. */
export function NotesApp({
  scenario,
  teacherName,
  pendingTeacherLine,
}: {
  scenario: ScenarioView
  teacherName: string
  pendingTeacherLine: string | null
}) {
  const bottom = useRef<HTMLDivElement>(null)
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'end' })
  }, [scenario.events.length, pendingTeacherLine])

  const room = scenario.events.filter((e) => e.kind !== 'contact_question' && e.kind !== 'contact_reply')

  return (
    <div className="h-full overflow-y-auto px-6 py-5 font-body">
      <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-coffee/60">Conference notes</p>
      {room.length === 0 && !pendingTeacherLine && (
        <p className="mt-3 text-sm text-coffee/60">Nothing yet. Notes appear here once the family sits down.</p>
      )}
      <ol className="mt-3 space-y-3">
        {room.map((e) => {
          if (e.kind === 'tension') {
            const change = Number(e.meta?.change ?? 0)
            return (
              <li key={e.id} className="flex items-start gap-2 pl-4 text-xs text-coffee/60">
                <span
                  className={cn(
                    'flex-none rounded-full px-1.5 font-bold',
                    change > 0 ? 'bg-scarlet text-ghost' : change < 0 ? 'bg-royal text-ghost' : 'bg-coffee/10',
                  )}
                >
                  {change > 0 ? `+${change}` : change}
                </span>
                <span>
                  {e.content} <span className="text-coffee/60">(now {String(e.meta?.after)})</span>
                </span>
              </li>
            )
          }
          if (e.kind === 'surprise') {
            return (
              <li key={e.id} className="flex items-center gap-2 rounded-lg border border-scarlet/40 bg-scarlet/5 px-3 py-2 text-xs">
                <Paperclip className="size-3.5 flex-none text-scarlet" /> {e.content}
              </li>
            )
          }
          if (e.kind === 'agreement') {
            return (
              <li key={e.id} className="rounded-lg border border-royal/30 bg-royal/5 px-3 py-2 text-xs">
                <span className="font-semibold uppercase tracking-wider text-brand-inverse">Agreed</span>
                <ul className="mt-1 list-disc pl-4">
                  {((e.meta?.steps as string[]) ?? []).map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ul>
              </li>
            )
          }
          if (e.kind === 'system') {
            return (
              <li key={e.id} className="text-center text-sm font-semibold text-scarlet">
                {e.content}
              </li>
            )
          }
          const who = e.kind === 'teacher' ? `You (${teacherName})` : e.speaker
          return (
            <li key={e.id}>
              <span
                className={cn(
                  'text-xs font-semibold uppercase tracking-wider',
                  e.kind === 'teacher' ? 'text-brand-inverse' : e.kind === 'student' ? 'text-coffee/70' : 'text-coffee',
                )}
              >
                {who}
              </span>
              <p className="leading-relaxed">{e.content}</p>
            </li>
          )
        })}
        {pendingTeacherLine && (
          <li className="opacity-60">
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-inverse">You ({teacherName})</span>
            <p className="leading-relaxed">{pendingTeacherLine}</p>
          </li>
        )}
      </ol>
      <div ref={bottom} />
    </div>
  )
}
