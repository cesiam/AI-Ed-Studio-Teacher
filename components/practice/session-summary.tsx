'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { SessionView } from '@/lib/api-types'
import { api } from './api'
import { tensionColor } from './tension-meter'

export function SessionSummary({ session }: { session: SessionView }) {
  const router = useRouter()
  const [replaying, setReplaying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function replay() {
    setReplaying(true)
    try {
      const next = await api.createSession({ replay_of: session.id } as Parameters<typeof api.createSession>[0])
      router.push(`/practice/${next.id}`)
    } catch (e) {
      setError((e as Error).message)
      setReplaying(false)
    }
  }

  return (
    <main className="min-h-svh bg-coffee px-6 py-10 font-body text-ghost sm:px-10">
      <div className="mx-auto max-w-3xl">
        <a href="/" className="font-display text-lg font-bold tracking-tight">
          Building Bridges
        </a>
        <p className="mt-12 text-xs uppercase tracking-[0.4em] text-glaucous">Session complete</p>
        <h1 className="mt-3 font-display text-5xl font-bold leading-[0.95] tracking-tight">
          You built <span className="text-scarlet">{session.plan.filter((p) => p.ended_reason !== 'walkout').length}</span>{' '}
          of {session.plan.length} bridge{session.plan.length === 1 ? '' : 's'}.
        </h1>

        <ol className="mt-10 space-y-3">
          {session.plan.map((p) => (
            <li key={p.idx} className="flex items-center gap-4 rounded-2xl border border-ghost/10 px-5 py-4">
              <span className="font-display text-2xl font-bold text-ghost/40">{p.idx + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{p.title}</span>
                <span className="block text-sm text-ghost/55">
                  {p.ended_reason === 'walkout' ? 'Parent walked out' : 'Conference completed'}
                  {p.surprise_plan && ` · surprise ${p.surprise_plan.type} at turn ${p.surprise_plan.turn}`}
                </span>
              </span>
              <span className="font-display text-xl font-bold" style={{ color: tensionColor(p.tension) }}>
                {p.tension}
              </span>
            </li>
          ))}
        </ol>

        <p className="mt-8 text-sm text-ghost/50">
          {session.mode} · {session.temperature} temperature · started {({ calm: 'open', tense: 'guarded', heated: 'frustrated' } as const)[session.starting_mood]} · seed{' '}
          <span className="font-mono text-ghost/80">{session.seed}</span>
        </p>
        {error && <p className="mt-4 text-scarlet">{error}</p>}

        <div className="mt-8 flex flex-wrap gap-4">
          <button
            type="button"
            onClick={replay}
            disabled={replaying}
            className="rounded-full bg-scarlet px-7 py-3 font-semibold text-ghost transition-transform enabled:hover:scale-[1.03] disabled:opacity-50"
          >
            {replaying ? 'Setting up…' : 'Replay this session'}
          </button>
          <a href="/practice" className="rounded-full border border-glaucous/50 px-7 py-3 text-ghost/85 hover:border-glaucous">
            New session
          </a>
          <a href="/practice/history" className="rounded-full border border-glaucous/50 px-7 py-3 text-ghost/85 hover:border-glaucous">
            Read the transcript
          </a>
        </div>
      </div>
    </main>
  )
}
