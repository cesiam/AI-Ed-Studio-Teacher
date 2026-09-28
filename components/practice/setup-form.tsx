'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { CreateSessionRequest, Mode, Mood, ScenarioSummary, Temperature } from '@/lib/api-types'
import { cn } from '@/lib/utils'
import { api } from './api'
import { ScenarioUpload } from './scenario-upload'

const TEMPERATURES: { value: Temperature; label: string; blurb: string }[] = [
  { value: 'low', label: 'Low', blurb: 'You pick the scenarios and their order, and which surprise document arrives. It lands on turn 4.' },
  { value: 'medium', label: 'Medium', blurb: 'You pick the scenarios; the order is shuffled. The surprise is random and lands on turn 4.' },
  { value: 'high', label: 'High', blurb: 'Scenarios, order, and surprise are all random. The surprise lands anywhere from turn 3 to 7.' },
]

const MOODS: { value: Mood; label: string; start: number }[] = [
  // Guarded starts at the top of its band, on alert but still listening.
  { value: 'calm', label: 'Guarded', start: 50 },
  { value: 'tense', label: 'Frustrated', start: 60 },
  { value: 'heated', label: 'Heated', start: 80 },
]

type RecentSession = Awaited<ReturnType<typeof api.recentSessions>>['sessions'][number]

const PRACTICED_KEY = 'bb-practiced'

function hasPracticed() {
  try {
    return localStorage.getItem(PRACTICED_KEY) === '1'
  } catch {
    return false
  }
}

function markPracticed() {
  try {
    localStorage.setItem(PRACTICED_KEY, '1')
  } catch {}
}

export function SetupForm() {
  const router = useRouter()
  const [scenarios, setScenarios] = useState<ScenarioSummary[]>([])
  const [recent, setRecent] = useState<RecentSession[]>([])
  /** Nobody has played here yet: point them at the easy scenario. */
  const [firstVisit, setFirstVisit] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [teacherName, setTeacherName] = useState('')
  const [mode, setMode] = useState<Mode>('single')
  const [count, setCount] = useState(2)
  const [temperature, setTemperature] = useState<Temperature>('low')
  const [surpriseType, setSurpriseType] = useState<'E' | 'F'>('F')
  // Default: Guarded, at the top of its band.
  const [mood, setMood] = useState<Mood>('calm')
  const [tension, setTension] = useState({ start: GUARDED_MAX, min: FLOOR, max: 100 })
  const [picked, setPicked] = useState<string[]>([])
  const [seed, setSeed] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // "New here" is per browser: session history lives on the server and is
    // shared, so it can't tell whether this visitor has practiced before.
    const isNew = !hasPracticed()
    setFirstVisit(isNew)
    if (isNew) {
      // Start newcomers on the easy tutorial: same Guarded start, but capped
      // well below 100 so the parent can never walk out.
      setTension({ start: GUARDED_MAX, min: FLOOR, max: 60 })
    }
    api
      .scenarios()
      .then((r) => {
        setScenarios(r.scenarios)
        const tut = r.scenarios.find((s) => s.tutorial && s.status === 'ready')
        const firstReady = r.scenarios.find((s) => s.status === 'ready' && !s.tutorial) ?? tut
        const pick = isNew && tut ? tut : firstReady
        if (pick) setPicked((cur) => (cur.length ? cur : [pick.id]))
      })
      .catch((e: Error) => setLoadError(e.message))
    api.recentSessions().then(
      (r) => setRecent(r.sessions.slice(0, 5)),
      () => {},
    )
  }, [])

  const needed = mode === 'single' ? 1 : count

  function onAdded(added: ScenarioSummary[]) {
    api.scenarios().then((r) => setScenarios(r.scenarios), () => {})
    // Select what was just added (up to the number this session needs).
    const ids = added.map((s) => s.id)
    setPicked((cur) => (needed === 1 ? ids.slice(0, 1) : [...cur.filter((id) => !ids.includes(id)), ...ids].slice(-needed)))
  }
  const handPicked = temperature !== 'high'

  function toggle(id: string) {
    setPicked((cur) => {
      if (cur.includes(id)) return cur.filter((x) => x !== id)
      if (needed === 1) return [id]
      return cur.length >= needed ? cur : [...cur, id]
    })
  }

  async function submit(req: CreateSessionRequest) {
    setSubmitting(true)
    setError(null)
    try {
      const session = await api.createSession(req)
      markPracticed()
      router.push(`/practice/${session.id}`)
    } catch (e) {
      setError((e as Error).message)
      setSubmitting(false)
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    submit({
      mode,
      count: mode === 'sequence' ? count : undefined,
      temperature,
      starting_mood: mood,
      tension,
      scenario_ids: handPicked ? picked : undefined,
      surprise_type: temperature === 'low' ? surpriseType : undefined,
      teacher_name: teacherName || undefined,
      seed: seed.trim() ? Number(seed) : undefined,
    })
  }

  const ready = !handPicked || picked.length === needed
  const tutorial = scenarios.find((s) => s.tutorial && s.status === 'ready')

  function startTutorial() {
    if (!tutorial) return
    submit({
      mode: 'single',
      temperature: 'low',
      surprise_type: 'F',
      starting_mood: 'calm',
      tension: { start: 30, min: FLOOR, max: 60 },
      scenario_ids: [tutorial.id],
      teacher_name: teacherName || undefined,
    })
  }

  return (
    <form onSubmit={onSubmit} className="mt-12 flex flex-col gap-10 pb-20 font-body">
      {tutorial && (
        <div
          className={cn(
            'relative flex flex-wrap items-center justify-between gap-4 rounded-3xl border px-6 py-5',
            firstVisit
              ? 'border-scarlet bg-royal/50 shadow-[0_0_0_4px_rgba(255,51,31,0.18),0_0_60px_rgba(255,51,31,0.25)]'
              : 'border-glaucous/40 bg-royal/30',
          )}
        >
          {firstVisit && (
            <span className="absolute -top-3 left-6 rounded-full bg-scarlet px-3 py-0.5 text-[11px] font-semibold uppercase tracking-[0.2em]">
              First time? Start here
            </span>
          )}
          <div className="max-w-xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-glaucous">New here? Start with the tutorial</p>
            <p className="mt-1 font-display text-xl font-bold">A friendly check-in with {tutorial.student_name.split(' ')[0]}’s mom</p>
            <p className="mt-1 text-sm text-ghost/65">
              A short, low-stakes conference with two short documents and no surprises. Tips along the way show you how it works.
            </p>
          </div>
          <button
            type="button"
            onClick={startTutorial}
            disabled={submitting}
            className="rounded-full bg-scarlet px-6 py-3 font-semibold text-ghost transition-transform enabled:hover:scale-[1.03] disabled:opacity-40"
          >
            {submitting ? 'Setting up…' : 'Start the tutorial'}
          </button>
        </div>
      )}

      <Field label="What does the family call you?" hint="Used by the parent and student, e.g. “Ms. Rivera”.">
        <input
          value={teacherName}
          onChange={(e) => setTeacherName(e.target.value)}
          placeholder="Ms. Rivera"
          maxLength={60}
          className="w-full max-w-sm rounded-xl border border-ghost/15 bg-ghost/5 px-4 py-3 text-ghost placeholder:text-ghost/35 focus:border-glaucous focus:outline-none"
        />
      </Field>

      <Field label="Mode">
        <Segmented
          value={mode}
          onChange={(v) => {
            setMode(v)
            setPicked((p) => (v === 'single' ? p.slice(0, 1) : p))
          }}
          options={[
            { value: 'single', label: 'Single conference' },
            { value: 'sequence', label: 'Back-to-back sequence' },
          ]}
        />
        {mode === 'sequence' && (
          <div className="mt-4 flex items-center gap-3">
            <span className="text-sm text-ghost/70">How many?</span>
            <Segmented
              value={String(count)}
              onChange={(v) => {
                setCount(Number(v))
                setPicked((p) => p.slice(0, Number(v)))
              }}
              options={[2, 3, 4, 5].map((n) => ({ value: String(n), label: String(n) }))}
            />
          </div>
        )}
      </Field>

      <Field label="Temperature" hint="How unpredictable the session is. Every session stores its random seed so it can be replayed exactly.">
        <div className="grid gap-3 sm:grid-cols-3">
          {TEMPERATURES.map((t) => (
            <button
              type="button"
              key={t.value}
              onClick={() => setTemperature(t.value)}
              className={cn(
                'rounded-2xl border p-4 text-left transition-colors',
                temperature === t.value ? 'border-scarlet bg-scarlet/10' : 'border-ghost/15 hover:border-glaucous',
              )}
            >
              <span className="font-display text-xl font-bold">{t.label}</span>
              <span className="mt-1 block text-sm leading-snug text-ghost/65">{t.blurb}</span>
            </button>
          ))}
        </div>
        {temperature === 'low' && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="text-sm text-ghost/70">Surprise document:</span>
            <Segmented
              value={surpriseType}
              onChange={setSurpriseType}
              options={[
                { value: 'E', label: 'E · the school dropped the ball' },
                { value: 'F', label: "F · contradicts the family's claim" },
              ]}
            />
          </div>
        )}
      </Field>

      {handPicked ? (
        <Field
          label={needed === 1 ? 'Scenario' : `Scenarios (${picked.length} of ${needed})`}
          hint={
            needed === 1
              ? undefined
              : temperature === 'low'
                ? 'Click in the order you want to play them.'
                : 'The order will be shuffled.'
          }
        >
          {loadError && <p className="text-scarlet">{loadError}</p>}
          <ul className="grid gap-2 sm:grid-cols-2">
            {scenarios.map((s) => {
              const pos = picked.indexOf(s.id)
              const on = pos >= 0
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => toggle(s.id)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors',
                      on ? 'border-glaucous bg-royal/40' : 'border-ghost/10 hover:border-ghost/30',
                      firstVisit && s.tutorial && 'ring-2 ring-scarlet/70',
                    )}
                  >
                    <span
                      className={cn(
                        'grid size-7 flex-none place-items-center rounded-full font-display text-sm font-bold',
                        on ? 'bg-scarlet text-ghost' : 'bg-ghost/10 text-ghost/50',
                      )}
                    >
                      {on ? (temperature === 'low' && needed > 1 ? pos + 1 : '✓') : s.id}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate font-medium">{s.title}</span>
                        {s.tutorial && <span className="flex-none rounded-full bg-glaucous/30 px-2 text-[10px] uppercase tracking-wider">Easy</span>}
                      </span>
                      <span className="block truncate text-xs text-ghost/50">
                        {s.status === 'stub'
                          ? `Draft · ${s.topic}`
                          : `${s.student_name} · grade ${s.grade} · raised by ${s.raised_by}`}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
          <ScenarioUpload onAdded={onAdded} />
        </Field>
      ) : (
        <Field label="Scenarios">
          <p className="text-ghost/70">
            The system will draw {needed} scenario{needed === 1 ? '' : 's'} at random from the{' '}
            {scenarios.filter((s) => s.status === 'ready' && !s.tutorial).length} ready ones.
          </p>
          <ScenarioUpload onAdded={onAdded} />
        </Field>
      )}

      <Field
        label="How does the parent walk in?"
        hint="Pick a mood or set the exact starting tension, then choose how low and high it can go. The parent only walks out if the top is 100."
      >
        <Segmented
          value={moodFor(tension.start)}
          onChange={(v) => {
            const start = MOODS.find((m) => m.value === v)!.start
            setMood(v)
            setTension((t) => ({ start, min: Math.min(t.min, start), max: Math.max(t.max, start) }))
          }}
          options={MOODS.map((m) => ({ value: m.value, label: `${m.label} · ${m.start}` }))}
        />
        <TensionRange
          value={tension}
          onChange={(t) => {
            setTension(t)
            setMood(moodFor(t.start))
          }}
        />
      </Field>

      <details className="text-sm text-ghost/60">
        <summary className="cursor-pointer select-none">Advanced: use a specific seed</summary>
        <input
          value={seed}
          onChange={(e) => setSeed(e.target.value.replace(/\D/g, ''))}
          placeholder="e.g. 2841937651"
          inputMode="numeric"
          className="mt-3 w-full max-w-xs rounded-xl border border-ghost/15 bg-ghost/5 px-4 py-2 text-ghost placeholder:text-ghost/35 focus:border-glaucous focus:outline-none"
        />
      </details>

      {error && <p className="rounded-xl border border-scarlet/50 bg-scarlet/10 px-4 py-3 text-ghost">{error}</p>}

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={!ready || submitting}
          className="rounded-full bg-scarlet px-8 py-4 font-semibold text-ghost transition-transform enabled:hover:scale-[1.03] disabled:opacity-40"
        >
          {submitting ? 'Setting up…' : 'Enter the classroom'}
        </button>
        {!ready && <span className="text-sm text-ghost/50">Pick {needed - picked.length} more.</span>}
      </div>

      {recent.length > 0 && (
        <Field label="Replay a past session" hint="Same scenarios, order, surprise, and timing. The conversation itself will play out fresh.">
          <ul className="flex flex-col gap-2">
            {recent.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 rounded-xl border border-ghost/10 px-4 py-2 text-sm">
                <span className="text-ghost/70">
                  {new Date(s.created_at).toLocaleString()} · {s.mode} · {s.temperature} · seed {s.seed}
                </span>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => submit({ replay_of: s.id } as CreateSessionRequest)}
                  className="rounded-full border border-glaucous/50 px-4 py-1 text-ghost/85 hover:border-glaucous"
                >
                  Replay
                </button>
              </li>
            ))}
          </ul>
        </Field>
      )}
    </form>
  )
}

type Tension = { start: number; min: number; max: number }

/** Tension never goes below guarded: a parent in a school meeting is always a little on alert. */
const FLOOR = 26
/** The top of the Guarded band (see TENSION_BANDS); the default starting tension. */
const GUARDED_MAX = 50

/** The mood whose band a starting tension falls in, so the mood buttons follow the meter. */
function moodFor(start: number): Mood {
  return start <= GUARDED_MAX ? 'calm' : start <= 75 ? 'tense' : 'heated'
}

/** What the parent sounds like in each part of the meter (matches the tone bands the parent is played with). */
const TENSION_BANDS = [
  { upTo: 50, label: 'Guarded', example: '“Okay… she’s never had problems before. What’s going on?”' },
  { upTo: 75, label: 'Frustrated', example: '“With respect, nobody called me about this.”' },
  { upTo: 100, label: 'Heated', example: '“I took off work for this. Maybe I should see the principal.”' },
]

/** Starting tension plus the band it may move in. Keeps min <= start <= max and at least 10 points of room. */
function TensionRange({ value, onChange }: { value: Tension; onChange: (t: Tension) => void }) {
  const { start, min, max } = value
  const set = (key: keyof Tension, n: number) => {
    const t = { ...value, [key]: n }
    if (key === 'min') t.min = Math.max(FLOOR, Math.min(n, t.max - 10))
    if (key === 'max') t.max = Math.max(n, t.min + 10, FLOOR + 10)
    t.start = Math.max(t.min, Math.min(t.max, t.start))
    onChange(t)
  }
  const rows: { key: keyof Tension; label: string }[] = [
    { key: 'start', label: 'Starts at' },
    { key: 'min', label: 'Lowest it can go' },
    { key: 'max', label: 'Highest it can go' },
  ]

  // The bar runs from the floor (26) to 100, same as the sliders.
  const pos = (v: number) => ((v - FLOOR) / (100 - FLOOR)) * 100

  return (
    <div className="mt-5 max-w-xl">
      {/* preview: the reachable band, and where the meter starts */}
      <div className="relative h-3 rounded-full bg-ghost/10" aria-hidden>
        <div className="absolute inset-y-0 rounded-full bg-gradient-to-r from-glaucous to-scarlet" style={{ left: `${pos(min)}%`, right: `${100 - pos(max)}%` }} />
        <div className="absolute top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-coffee bg-ghost" style={{ left: `${pos(start)}%` }} />
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-ghost/40">
        <span>{FLOOR} guarded (lowest)</span>
        <span>100 walks out</span>
      </div>
      <ul className="mt-3 grid gap-2 sm:grid-cols-3">
        {TENSION_BANDS.map((b, i) => {
          const from = i === 0 ? FLOOR : TENSION_BANDS[i - 1].upTo + 1
          const here = start >= from && start <= b.upTo
          const reachable = b.upTo >= min && from <= max
          return (
            <li
              key={b.label}
              className={cn(
                'rounded-xl border px-3 py-2 text-xs leading-snug transition-colors',
                here ? 'border-scarlet bg-scarlet/10' : 'border-ghost/10',
                !reachable && 'opacity-35',
              )}
            >
              <span className="block font-semibold text-ghost">
                {b.label} <span className="font-normal text-ghost/45">{from}–{b.upTo}</span>
              </span>
              <span className="mt-0.5 block text-ghost/60">{b.example}</span>
              {here && <span className="mt-1 block text-[10px] uppercase tracking-wider text-scarlet">Starts here</span>}
            </li>
          )
        })}
      </ul>
      <div className="mt-4 grid gap-3">
        {rows.map(({ key, label }) => (
          <label key={key} className="grid grid-cols-[9.5rem_1fr_2.5rem] items-center gap-3 text-sm text-ghost/70">
            {label}
            <input
              type="range"
              min={FLOOR}
              max={100}
              value={value[key]}
              onChange={(e) => set(key, Number(e.target.value))}
              className="w-full accent-scarlet"
            />
            <span className="text-right font-display font-bold text-ghost">{value[key]}</span>
          </label>
        ))}
      </div>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-display text-lg font-bold">{label}</h2>
      {hint && <p className="mt-0.5 text-sm text-ghost/50">{hint}</p>}
      <div className="mt-3">{children}</div>
    </div>
  )
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
}) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-full border border-ghost/15 p-1">
      {options.map((o) => (
        <button
          type="button"
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'rounded-full px-4 py-2 text-sm transition-colors',
            value === o.value ? 'bg-ghost text-coffee' : 'text-ghost/70 hover:text-ghost',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
