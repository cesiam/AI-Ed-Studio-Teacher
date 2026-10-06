'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { CreateSessionRequest, Mode, Mood, ScenarioSummary, Temperature } from '@/lib/api-types'
import { COACH_STYLES, DEFAULT_COACH_STYLE, isCoachStyle, type CoachStyle } from '@/lib/coach-styles'
import { gradeLabel, levelFor, SCHOOL_LEVELS, type SchoolLevel } from '@/lib/school-level'
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
  /** Nobody has practiced in this browser yet: point them at the easy scenario. */
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
  // Coach tips: null until the teacher flips the switch, so the default can follow the pick.
  const [coachChoice, setCoachChoice] = useState<boolean | null>(null)
  const [coachDefault, setCoachDefault] = useState(false)
  const [coachStyle, setCoachStyle] = useState<CoachStyle>(DEFAULT_COACH_STYLE)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // "New here" is per browser: session history lives on the server and is
    // shared, so it can't tell whether this visitor has practiced before.
    const isNew = !hasPracticed()
    try {
      setCoachDefault(localStorage.getItem('bb-coach') === 'on')
      const savedStyle = localStorage.getItem('bb-coach-style')
      if (isCoachStyle(savedStyle)) setCoachStyle(savedStyle)
    } catch {}
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
        // Leo's tutorial is the default pick; fall back to the first ready scenario.
        const pick =
          r.scenarios.find((s) => s.tutorial && s.status === 'ready') ?? r.scenarios.find((s) => s.status === 'ready')
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
  // Which U.S. school level to practice for; 'all' shows every scenario.
  const [level, setLevel] = useState<SchoolLevel | 'all'>('all')
  const inLevel = (s: ScenarioSummary) => level === 'all' || levelFor(s.grade) === level
  // Cards are numbered in list order (the tutorial is 00), not by internal id.
  const listNumber = (s: ScenarioSummary) =>
    s.tutorial ? '00' : String(visible.filter((x) => !x.tutorial).indexOf(s) + 1).padStart(2, '0')
  // Tutorial first, then by grade (K to 12), so the list reads elementary, middle, high.
  const visible = scenarios
    .filter(inLevel)
    .sort((a, b) => Number(b.tutorial) - Number(a.tutorial) || a.grade - b.grade || a.id.localeCompare(b.id))

  function chooseLevel(next: SchoolLevel | 'all') {
    setLevel(next)
    // Drop picks that don't belong to the new level.
    setPicked((cur) => cur.filter((id) => {
      const s = scenarios.find((x) => x.id === id)
      return s && (next === 'all' || levelFor(s.grade) === next)
    }))
  }

  function toggle(id: string) {
    setPicked((cur) => {
      if (cur.includes(id)) return cur.filter((x) => x !== id)
      if (needed === 1) return [id]
      return cur.length >= needed ? cur : [...cur, id]
    })
  }

  // Matches the laptop's default: on for the tutorial, otherwise this browser's last choice.
  const tutorialOnly = handPicked && picked.length > 0 && picked.every((id) => scenarios.find((s) => s.id === id)?.tutorial)
  const coachOn = coachChoice ?? (tutorialOnly || coachDefault)

  /** Hand the choice to the briefing and conference (see useCoachSetting). */
  function saveCoachChoice(sessionId: string) {
    try {
      localStorage.setItem(`bb-coach:${sessionId}`, coachOn ? 'on' : 'off')
      localStorage.setItem(`bb-coach-style:${sessionId}`, coachStyle)
      localStorage.setItem('bb-coach-style', coachStyle)
      if (coachChoice !== null && !tutorialOnly) localStorage.setItem('bb-coach', coachOn ? 'on' : 'off')
    } catch {}
  }

  async function submit(req: CreateSessionRequest) {
    setSubmitting(true)
    setError(null)
    try {
      const session = await api.createSession(req)
      markPracticed()
      saveCoachChoice(session.id)
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
      level,
    })
  }

  const ready = !handPicked || picked.length === needed
  return (
    <form onSubmit={onSubmit} className="mt-12 flex flex-col gap-10 pb-20 font-body">
      <Field label="What does the family call you?" hint="Used by the parent and student, e.g. “Ms. Rivera”.">
        <input
          value={teacherName}
          onChange={(e) => setTeacherName(e.target.value)}
          placeholder="Ms. Rivera"
          maxLength={60}
          className="w-full max-w-sm rounded-xl border border-ghost/15 bg-ghost/5 px-4 py-3 text-ghost placeholder:text-ghost/55 focus:border-glaucous focus:outline-none"
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

      <Field label="School level" hint="Scenarios are set in a PFPS school at that level, with grades and situations to match.">
        <Segmented
          value={level}
          onChange={chooseLevel}
          options={[
            { value: 'all', label: 'All levels' },
            ...SCHOOL_LEVELS.map((l) => ({ value: l.value, label: `${l.label} · ${l.grades}` })),
          ]}
        />
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
            {visible.map((s) => {
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
                      // For newcomers the easy scenario pulses so it's the obvious place to start.
                      firstVisit && s.tutorial && 'pulse-ring',
                    )}
                  >
                    <span
                      className={cn(
                        'grid size-7 flex-none place-items-center rounded-full font-display text-sm font-bold',
                        on ? 'bg-scarlet text-ghost' : 'bg-ghost/10 text-ghost/60',
                      )}
                    >
                      {on ? (temperature === 'low' && needed > 1 ? pos + 1 : '✓') : listNumber(s)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate font-medium">{s.title}</span>
                        {s.tutorial && <span className="flex-none rounded-full bg-glaucous/30 px-2 text-[10px] uppercase tracking-wider">Easy</span>}
                      </span>
                      <span className="block truncate text-xs text-ghost/60">
                        {s.status === 'stub'
                          ? `Draft · ${gradeLabel(s.grade)} · ${s.topic}`
                          : `${s.student_name} · ${gradeLabel(s.grade)} · raised by ${s.raised_by}`}
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
            {visible.filter((s) => s.status === 'ready' && !s.tutorial).length} ready ones
            {level !== 'all' && ` at the ${SCHOOL_LEVELS.find((l) => l.value === level)?.label.toLowerCase()} level`}.
          </p>
          <ScenarioUpload onAdded={onAdded} />
        </Field>
      )}

      <Field label="Coach tips" hint="After each exchange, a suggestion for where to steer next, in the style you pick. It never tells you what to say.">
        <button
          type="button"
          role="switch"
          aria-checked={coachOn}
          onClick={() => setCoachChoice(!coachOn)}
          className="flex items-center gap-3 text-sm text-ghost/75 hover:text-ghost"
        >
          <span aria-hidden className={cn('relative h-6 w-11 rounded-full transition-colors', coachOn ? 'bg-royal' : 'bg-ghost/45')}>
            <span className={cn('absolute top-1 size-4 rounded-full bg-[#fbfbff] shadow transition-[left]', coachOn ? 'left-6' : 'left-1')} />
          </span>
          <span className="font-semibold text-ghost">{coachOn ? 'On' : 'Off'}</span>
          <span>You can change this again at the laptop or during the conference.</span>
        </button>
        {coachOn && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" role="radiogroup" aria-label="Coach style">
            {COACH_STYLES.map((c) => (
              <button
                type="button"
                role="radio"
                aria-checked={coachStyle === c.value}
                key={c.value}
                onClick={() => setCoachStyle(c.value)}
                className={cn(
                  'flex flex-col items-start rounded-2xl border p-4 text-left transition-colors',
                  coachStyle === c.value ? 'border-scarlet bg-scarlet/10' : 'border-ghost/15 hover:border-glaucous',
                )}
              >
                <span className="font-display text-lg font-bold">{c.label}</span>
                <span className="mt-1 block text-sm leading-snug text-ghost/65">{c.blurb}</span>
              </button>
            ))}
          </div>
        )}
      </Field>

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
          className="mt-3 w-full max-w-xs rounded-xl border border-ghost/15 bg-ghost/5 px-4 py-2 text-ghost placeholder:text-ghost/55 focus:border-glaucous focus:outline-none"
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
        {!ready && <span className="text-sm text-ghost/60">Pick {needed - picked.length} more.</span>}
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
      {/* The bar itself is the control: drag the round knob to set where the meter
          starts, and the end handles to set how low and high it can go. */}
      <TensionBar value={value} set={set} pos={pos} />
      <div className="mt-1 flex justify-between text-[11px] text-ghost/60">
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
                {b.label} <span className="font-normal text-ghost/60">{from}–{b.upTo}</span>
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

const BAR_THUMBS: { key: keyof Tension; label: string }[] = [
  { key: 'min', label: 'Lowest tension it can go' },
  { key: 'start', label: 'Starting tension' },
  { key: 'max', label: 'Highest tension it can go' },
]

/** The tension bar with three draggable handles. Clicking the track moves the nearest handle. */
function TensionBar({
  value,
  set,
  pos,
}: {
  value: Tension
  set: (key: keyof Tension, n: number) => void
  pos: (v: number) => number
}) {
  const track = useRef<HTMLDivElement>(null)
  const dragging = useRef<keyof Tension | null>(null)

  const valueAt = (clientX: number) => {
    const r = track.current!.getBoundingClientRect()
    const t = Math.min(1, Math.max(0, (clientX - r.left) / r.width))
    return Math.round(FLOOR + t * (100 - FLOOR))
  }
  const nearest = (v: number): keyof Tension => {
    // Ties go to the start knob, the one people move most.
    const order: (keyof Tension)[] = ['start', 'min', 'max']
    return order.reduce((best, k) => (Math.abs(value[k] - v) < Math.abs(value[best] - v) ? k : best), 'start' as keyof Tension)
  }

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>, key?: keyof Tension) => {
    e.preventDefault()
    const v = valueAt(e.clientX)
    const k = key ?? nearest(v)
    dragging.current = k
    track.current!.setPointerCapture(e.pointerId)
    set(k, v)
  }
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragging.current) set(dragging.current, valueAt(e.clientX))
  }
  const stop = () => (dragging.current = null)

  const onKey = (key: keyof Tension) => (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 5 : 1
    const delta = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? step : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -step : 0
    if (e.key === 'Home') set(key, FLOOR)
    else if (e.key === 'End') set(key, 100)
    else if (delta) set(key, value[key] + delta)
    else return
    e.preventDefault()
  }

  return (
    <div
      ref={track}
      onPointerDown={(e) => onPointerDown(e)}
      onPointerMove={onPointerMove}
      onPointerUp={stop}
      onPointerCancel={stop}
      data-cursor="hover"
      className="relative flex h-8 cursor-pointer touch-none items-center"
    >
      <div className="relative h-3 w-full rounded-full bg-ghost/10">
        <div
          className="absolute inset-y-0 rounded-full bg-gradient-to-r from-glaucous to-scarlet"
          style={{ left: `${pos(value.min)}%`, right: `${100 - pos(value.max)}%` }}
        />
      </div>
      {BAR_THUMBS.map(({ key, label }) => (
        <span
          key={key}
          role="slider"
          tabIndex={0}
          aria-label={label}
          aria-valuemin={FLOOR}
          aria-valuemax={100}
          aria-valuenow={value[key]}
          onKeyDown={onKey(key)}
          onPointerDown={(e) => {
            e.stopPropagation()
            onPointerDown(e as unknown as React.PointerEvent<HTMLDivElement>, key)
          }}
          className={cn(
            'absolute top-1/2 -translate-x-1/2 -translate-y-1/2 border-2 border-coffee shadow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-glaucous',
            key === 'start' ? 'z-10 size-6 rounded-full bg-ghost' : 'h-5 w-2.5 rounded-full bg-ghost/80',
          )}
          style={{ left: `${pos(value[key])}%` }}
        />
      ))}
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-display text-lg font-bold">{label}</h2>
      {hint && <p className="mt-0.5 text-sm text-ghost/60">{hint}</p>}
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
