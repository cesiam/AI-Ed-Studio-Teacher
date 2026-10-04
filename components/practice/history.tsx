'use client'

import { useEffect, useState } from 'react'
import { Download, Paperclip } from 'lucide-react'
import type { EventView, HistoryDetail, HistoryItem, ScenarioView } from '@/lib/api-types'
import { filledAnswers, NOTES_FORM_TITLE } from '@/lib/notes-form'
import { cn } from '@/lib/utils'
import { api } from './api'

/** Past conferences: pick a session on the left, read (or download) its transcripts on the right. */
export function History() {
  const [items, setItems] = useState<HistoryItem[] | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [detail, setDetail] = useState<HistoryDetail | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.history().then(
      (r) => {
        setItems(r.sessions)
        if (r.sessions[0]) setSelected(r.sessions[0].id)
      },
      (e: Error) => setError(e.message),
    )
  }, [])

  useEffect(() => {
    if (!selected) return
    setDetail(null)
    api.historyDetail(selected).then(setDetail, (e: Error) => setError(e.message))
  }, [selected])

  if (error) return <p className="mt-10 text-scarlet">{error}</p>
  if (!items) return <p className="mt-10 text-ghost/60">Loading your conferences…</p>
  if (items.length === 0) {
    return (
      <p className="mt-10 text-ghost/70">
        No conferences yet. <a href="/practice" className="text-scarlet underline-offset-4 hover:underline">Start one</a> and
        its transcript will show up here.
      </p>
    )
  }

  return (
    <div className="mt-10 grid gap-6 pb-20 lg:grid-cols-[320px_1fr]">
      <ul className="flex flex-col gap-2 lg:sticky lg:top-6 lg:max-h-[calc(100svh-3rem)] lg:overflow-y-auto">
        {items.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => setSelected(s.id)}
              className={cn(
                'w-full rounded-xl border px-4 py-3 text-left transition-colors',
                selected === s.id ? 'border-glaucous bg-royal/40' : 'border-ghost/10 hover:border-ghost/30',
              )}
            >
              <span className="block text-xs text-ghost/60">{new Date(s.created_at).toLocaleString()}</span>
              {s.conferences.map((c) => (
                <span key={c.idx} className="mt-1 flex items-baseline justify-between gap-2">
                  <span className="truncate font-medium">{c.title}</span>
                  <span className={cn('flex-none text-xs', c.ended_reason === 'walkout' ? 'text-scarlet' : 'text-ghost/60')}>
                    {c.status === 'pending' || c.status === 'briefing'
                      ? 'not played'
                      : c.ended_reason === 'walkout'
                        ? 'walked out'
                        : `${c.starting_tension} → ${c.tension}`}
                  </span>
                </span>
              ))}
            </button>
          </li>
        ))}
      </ul>

      <section className="min-w-0">
        {!detail ? (
          <p className="text-ghost/60">Opening transcript…</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-ghost/60">
                {new Date(detail.item.created_at).toLocaleString()} · you were {detail.item.teacher_name}
              </p>
              <div className="flex gap-2">
                {detail.item.status === 'active' && (
                  <a href={`/practice/${detail.item.id}`} className="rounded-full border border-glaucous/60 px-4 py-2 text-sm hover:border-glaucous">
                    Continue this session
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => download(detail)}
                  className="inline-flex items-center gap-2 rounded-full bg-scarlet px-4 py-2 text-sm font-semibold"
                >
                  <Download className="size-4" /> Download transcript
                </button>
              </div>
            </div>
            {detail.conferences.map((c) => (
              <Conference key={c.idx} scenario={c} teacherName={detail.item.teacher_name} />
            ))}
          </>
        )}
      </section>
    </div>
  )
}

function Conference({ scenario: s, teacherName }: { scenario: ScenarioView; teacherName: string }) {
  return (
    <article className="mt-6 rounded-3xl border border-ghost/10 bg-ghost/[0.03] p-5 sm:p-7">
      <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-ghost/10 pb-4">
        <div>
          <h2 className="font-display text-2xl font-bold">{s.title}</h2>
          <p className="text-sm text-ghost/60">
            {s.parent.name} ({s.parent.relationship}) and {s.student_first_name} · grade {s.grade}
          </p>
        </div>
        <p className="text-sm text-ghost/70">
          Tension {s.starting_tension} → <span className={s.tension > 50 ? 'text-scarlet' : 'text-brand'}>{s.tension}</span>
          {' · '}
          {s.turn_count} turn{s.turn_count === 1 ? '' : 's'}
          {s.ended_reason === 'walkout' && <span className="text-scarlet"> · walked out</span>}
        </p>
      </header>

      <ol className="mt-5 flex flex-col gap-3">
        {s.events.map((e) => (
          <Line key={e.id} event={e} teacherName={teacherName} />
        ))}
      </ol>

      {filledAnswers(s.notes_form).length > 0 && (
        <div className="mt-6 rounded-2xl border border-ghost/10 p-5 text-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-brand">{NOTES_FORM_TITLE}</p>
          <dl className="mt-2 grid gap-2">
            {filledAnswers(s.notes_form).map((a) => (
              <div key={a.label}>
                <dt className="text-xs text-ghost/60">{a.label}</dt>
                <dd className="whitespace-pre-line">{a.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {s.debrief && (
        <div className="mt-6 rounded-2xl bg-royal/30 p-5 text-sm leading-relaxed">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-brand">Debrief</p>
          <p className="mt-2">{s.debrief.summary}</p>
          {s.debrief.went_well.length > 0 && <List title="Went well" items={s.debrief.went_well} />}
          {s.debrief.try_next.length > 0 && <List title="Try next time" items={s.debrief.try_next} />}
        </div>
      )}
    </article>
  )
}

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <>
      <p className="mt-4 font-semibold">{title}</p>
      <ul className="mt-1 list-disc pl-5 text-ghost/85">
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </>
  )
}

function Line({ event: e, teacherName }: { event: EventView; teacherName: string }) {
  switch (e.kind) {
    case 'teacher':
      return (
        <li className="ml-auto max-w-[85%] rounded-2xl rounded-tr-md bg-royal px-4 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-ghost/60">{teacherName} (you)</p>
          <p className="mt-0.5">{e.content}</p>
        </li>
      )
    case 'parent':
    case 'student':
    case 'staff':
      return (
        <li className="max-w-[85%] rounded-2xl rounded-tl-md bg-ghost px-4 py-2.5 text-coffee">
          <p className={cn('text-[10px] font-semibold uppercase tracking-[0.25em]', e.kind === 'parent' ? 'text-brand-inverse' : e.kind === 'staff' ? 'text-scarlet' : 'text-coffee/70')}>
            {e.speaker}
          </p>
          <p className="mt-0.5">{e.content}</p>
        </li>
      )
    case 'tension': {
      const change = Number(e.meta?.change ?? 0)
      return (
        <li className="flex items-start gap-2 self-end text-xs text-ghost/60">
          <span className={cn('rounded-full px-1.5 font-bold text-ghost', change > 0 ? 'bg-scarlet' : change < 0 ? 'bg-royal' : 'bg-ghost/15')}>
            {change > 0 ? `+${change}` : change}
          </span>
          {e.content}
        </li>
      )
    }
    case 'surprise':
      return (
        <li className="flex items-center gap-1.5 self-center rounded-full border border-scarlet/50 px-3 py-1 text-xs text-ghost/80">
          <Paperclip className="size-3" /> {e.content}
        </li>
      )
    case 'agreement':
      return (
        <li className="self-center rounded-2xl border border-glaucous/50 px-4 py-2 text-sm">
          <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-brand">Agreed</span>
          <ul className="mt-1 list-disc pl-4 text-ghost/85">
            {((e.meta?.steps as string[]) ?? []).map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ul>
        </li>
      )
    case 'contact_question':
    case 'contact_reply':
      return (
        <li className="max-w-[85%] self-center text-xs italic text-ghost/60">
          Private chat · {e.speaker}: {e.content}
        </li>
      )
    default:
      return <li className="self-center text-xs italic text-ghost/60">{e.content}</li>
  }
}

function transcriptText({ item, conferences }: HistoryDetail): string {
  const out = [`Building Bridges transcript`, `Session ${item.id}`, `${new Date(item.created_at).toLocaleString()}`, '']
  for (const c of conferences) {
    out.push(`== ${c.title} ==`, `${c.parent.name} (${c.parent.relationship}) and ${c.student_first_name}, grade ${c.grade}`)
    out.push(`Tension ${c.starting_tension} -> ${c.tension}${c.ended_reason === 'walkout' ? ' (walked out)' : ''}`, '')
    for (const e of c.events) {
      if (e.kind === 'teacher') out.push(`${item.teacher_name} (teacher): ${e.content}`)
      else if (e.kind === 'parent' || e.kind === 'student' || e.kind === 'staff') out.push(`${e.speaker}: ${e.content}`)
      else if (e.kind === 'tension') out.push(`   [tension ${Number(e.meta?.change) > 0 ? '+' : ''}${e.meta?.change}: ${e.content}]`)
      else if (e.kind === 'surprise') out.push(`   [document arrived: ${e.content}]`)
      else if (e.kind === 'agreement') out.push(`   [agreed: ${((e.meta?.steps as string[]) ?? []).join('; ')}]`)
      else if (e.kind === 'contact_question' || e.kind === 'contact_reply') out.push(`   [private chat] ${e.speaker}: ${e.content}`)
      else out.push(`   [${e.content}]`)
    }
    const answers = filledAnswers(c.notes_form)
    if (answers.length) {
      out.push('', `${NOTES_FORM_TITLE}:`)
      answers.forEach((a) => out.push(`  ${a.label}: ${a.value}`))
    }
    if (c.debrief) {
      out.push('', 'Debrief:', c.debrief.summary)
      c.debrief.went_well.forEach((w) => out.push(`  + ${w}`))
      c.debrief.try_next.forEach((t) => out.push(`  > ${t}`))
    }
    out.push('', '')
  }
  return out.join('\n')
}

function download(detail: HistoryDetail) {
  const blob = new Blob([transcriptText(detail)], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `conference-${detail.item.created_at.slice(0, 10)}-${detail.item.id.slice(0, 8)}.txt`
  a.click()
  URL.revokeObjectURL(url)
}
