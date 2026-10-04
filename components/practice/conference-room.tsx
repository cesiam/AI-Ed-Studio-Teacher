'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ClipboardList, Clock, DoorOpen, FileText, Loader2, Mail, Mic, NotebookPen, Printer, Square, Timer } from 'lucide-react'
import type { ContactRole, DocLetter, ScenarioView, SessionView } from '@/lib/api-types'
import { COACH_STYLES, DEFAULT_COACH_STYLE, isCoachStyle, type CoachStyle } from '@/lib/coach-styles'
import { cn } from '@/lib/utils'
import { api } from './api'
import { BriefingTour, tourDone } from './briefing-tour'
import { Computer, type AppId } from './computer/computer'
import { Debrief } from './debrief'
import { glass, GlassButton } from './glass'
import { FamilyStage } from './stage/family-stage'
import { ENTRANCE_MS, useChoreography } from './stage/use-choreography'
import { tensionLabel } from './tension-meter'

export type Busy = 'start' | 'speak' | 'consult' | 'join' | 'end' | 'advance' | null

interface Actions {
  start: () => void
  speak: (message: string, show?: DocLetter, to?: 'both' | 'parent' | 'student' | 'staff', print?: boolean) => Promise<boolean>
  consult: (role: ContactRole, message: string) => Promise<void>
  join: (role: ContactRole) => void
  end: () => void
  advance: () => void
}

interface Props {
  session: SessionView
  scenario: ScenarioView
  busy: Busy
  pendingLine: string | null
  error: string | null
  onDismissError: () => void
  actions: Actions
}

/** Briefing happens at the laptop; the conference happens face to face. */
export function ConferenceRoom(props: Props) {
  // The family walks in as soon as the teacher invites them, before the first line comes back.
  const entering = props.busy === 'start'
  const notesForm = useNotesForm(props.session, props.scenario)
  const coach = useCoachSetting(props.session.id, props.scenario.tutorial)
  return props.scenario.status === 'briefing' && !entering ? (
    <Briefing {...props} notesForm={notesForm} coach={coach} />
  ) : (
    <Conference {...props} notesForm={notesForm} coach={coach} />
  )
}

/** Mirrors GAME.endWithoutPlanAfterTurns on the server, which enforces it. */
const END_WITHOUT_PLAN_AFTER = 8

type NotesForm = ReturnType<typeof useNotesForm>
type CoachSetting = ReturnType<typeof useCoachSetting>

/**
 * Coach tips on or off. Set at the laptop before the family arrives and carried
 * into the conference. On by default in the tutorial; everywhere else it's
 * opt-in. The choice sticks for this session, and outside the tutorial it also
 * becomes this browser's default.
 */
function useCoachSetting(sessionId: string, tutorial: boolean) {
  const [on, setOn] = useState(tutorial)
  const [style, setStyleState] = useState<CoachStyle>(DEFAULT_COACH_STYLE)
  const sessionKey = `bb-coach:${sessionId}`
  const styleKey = `bb-coach-style:${sessionId}`

  useEffect(() => {
    try {
      const forSession = localStorage.getItem(sessionKey)
      if (forSession) setOn(forSession === 'on')
      else if (!tutorial) setOn(localStorage.getItem('bb-coach') === 'on')
      const savedStyle = localStorage.getItem(styleKey) ?? localStorage.getItem('bb-coach-style')
      if (isCoachStyle(savedStyle)) setStyleState(savedStyle)
    } catch {}
  }, [sessionKey, styleKey, tutorial])

  const setStyle = (next: CoachStyle) => {
    setStyleState(next)
    try {
      localStorage.setItem(styleKey, next)
      localStorage.setItem('bb-coach-style', next)
    } catch {}
  }

  const set = (next: boolean) => {
    setOn(next)
    try {
      localStorage.setItem(sessionKey, next ? 'on' : 'off')
      if (!tutorial) localStorage.setItem('bb-coach', next ? 'on' : 'off')
    } catch {}
  }
  return { on, set, style, setStyle }
}

/** The teacher's notes form for this conference: kept here so it survives the laptop closing, saved as they type. */
function useNotesForm(session: SessionView, scenario: ScenarioView) {
  const [form, setForm] = useState<Record<string, string>>(scenario.notes_form)
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null)

  // A new family in a back-to-back sequence gets a fresh form.
  useEffect(() => {
    setForm(scenario.notes_form)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario.idx])

  const onChange = (field: string, value: string) => {
    setForm((cur) => {
      const next = { ...cur, [field]: value }
      if (pending.current) clearTimeout(pending.current)
      pending.current = setTimeout(() => api.saveForm(session.id, scenario.idx, next).catch(() => {}), 700)
      return next
    })
  }

  const date = scenario.meeting_context.match(/(January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}, \d{4}/)?.[0]
  const defaults = {
    student: scenario.student_name,
    parent: scenario.parent.name,
    teacher: session.teacher_name,
    date: date ?? new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
  }
  return { form, defaults, onChange }
}

// ---------------------------------------------------------------------------
// Briefing: the teacher at their laptop before the family arrives.
// ---------------------------------------------------------------------------

function Briefing({
  session,
  scenario,
  busy,
  pendingLine,
  error,
  onDismissError,
  actions,
  notesForm,
  coach,
}: Props & { notesForm: NotesForm; coach: CoachSetting }) {
  // First-timers get a walkthrough of the laptop; anyone can replay it from the footer.
  const [touring, setTouring] = useState(false)
  useEffect(() => setTouring(!tourDone()), [])

  return (
    <main className="relative flex h-svh flex-col overflow-hidden bg-coffee font-body text-ghost">
      <Ambient tension={20} />
      <TopBar session={session} scenario={scenario} right={<span className="text-xs uppercase tracking-[0.3em] text-brand">Briefing</span>} />

      <div className="relative z-10 px-6 pt-2 text-center">
        <p className="text-[11px] uppercase tracking-[0.4em] text-brand">Before they arrive</p>
        <p className="mx-auto mt-2 max-w-3xl text-balance font-display text-2xl font-bold sm:text-3xl">
          Review the records. <span className="text-scarlet">{scenario.parent.name}</span> and{' '}
          {scenario.student_first_name} are on their way.
        </p>
      </div>

      <div
        data-tour="laptop"
        className="relative z-10 mx-auto mt-5 min-h-0 w-[min(1180px,94%)] flex-1 rounded-t-[28px] bg-coffee px-3 pt-3 ring-1 ring-ghost/10 shadow-[0_-12px_60px_rgba(54,38,167,0.35)]"
      >
        <Computer
          key={scenario.idx}
          scenario={scenario}
          teacherName={session.teacher_name}
          pendingTeacherLine={pendingLine}
          busy={!!busy}
          onConsult={actions.consult}
          notesForm={notesForm}
        />
      </div>

      <footer className="relative z-10 flex-none border-t border-ghost/10 bg-coffee px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-3">
          <p className="min-w-0 flex-1 basis-[26rem] text-sm text-ghost/60">
            Read the records in StudentView, skim the guide in Guide &amp; Notes Form, and message a colleague in PFPS Chat if you want
            quick advice.{' '}
            <button type="button" onClick={() => setTouring(true)} className="text-brand underline-offset-4 hover:underline">
              Show me around
            </button>
          </p>
          <div className="flex flex-none items-center gap-4">
            <CoachSwitch coach={coach} />
            {coach.on && (
              <label className="flex items-center gap-2 text-sm text-ghost/75">
                <span className="sr-only">Coach style</span>
                <select
                  value={coach.style}
                  onChange={(e) => coach.setStyle(e.target.value as CoachStyle)}
                  title={COACH_STYLES.find((c) => c.value === coach.style)?.blurb}
                  className="rounded-full border border-ghost/20 bg-coffee px-3 py-1.5 text-sm font-semibold text-ghost focus:border-glaucous focus:outline-none"
                >
                  {COACH_STYLES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <button
              type="button"
              data-tour="invite"
              disabled={!!busy}
              onClick={actions.start}
              className="rounded-full bg-scarlet px-6 py-2.5 font-semibold text-ghost transition-transform enabled:hover:scale-[1.03] disabled:opacity-50"
            >
              {busy === 'start' ? 'They’re sitting down…' : 'Invite them in'}
            </button>
          </div>
        </div>
      </footer>

      <ErrorToast error={error} onDismiss={onDismissError} />
      <BriefingTour open={touring} onClose={() => setTouring(false)} />
    </main>
  )
}

// ---------------------------------------------------------------------------
// Conference: face to face. No laptop, just the family and a few glass controls.
// ---------------------------------------------------------------------------

const CONTACT_LABEL: Record<ContactRole, string> = {
  counselor: 'the counselor',
  nurse: 'the nurse',
  principal: 'the principal',
  colleague: 'a colleague',
}

/**
 * Where the teacher's attention is:
 *   room     facing the family, talking
 *   laptop   turned to the laptop (records, notes, messaging a colleague); the family watches over the screen
 *   showing  the laptop turned around so the family can read a document
 */
type View =
  | { kind: 'room' }
  | { kind: 'laptop'; app: AppId; doc?: DocLetter; role?: ContactRole; key: number }
  | { kind: 'showing'; letter: DocLetter }

function Conference({
  session,
  scenario,
  busy,
  pendingLine,
  error,
  onDismissError,
  actions,
  notesForm,
  coach,
}: Props & { notesForm: NotesForm; coach: CoachSetting }) {
  const waiting = busy === 'speak' || busy === 'start'
  const live = scenario.status === 'conference' || busy === 'start'
  const [view, setView] = useState<View>({ kind: 'room' })
  const { pose, talking, lines, settled } = useChoreography(scenario.events, waiting, view.kind === 'showing', scenario.student_first_name)
  const present = scenario.ended_reason !== 'walkout'
  const lastTension = [...scenario.events].reverse().find((e) => e.kind === 'tension')
  const parentFirst = scenario.parent.name.split(' ')[0]
  const onLaptop = view.kind === 'laptop'
  const actionPlan = scenario.events.filter((e) => e.kind === 'agreement').flatMap((e) => (e.meta?.steps as string[]) ?? [])
  const [needPlan, setNeedPlan] = useState(false)
  // Ending needs an agreed next step. A truly stuck conversation can end without one after a while.
  const stuck = scenario.turn_count >= END_WITHOUT_PLAN_AFTER
  const canEnd = actionPlan.length > 0 || stuck

  // Someone walking in: they stand in the doorway for a moment before joining.
  const staff = scenario.in_room
  const [staffEntering, setStaffEntering] = useState(false)
  const seenJoin = useRef(scenario.events.some((e) => e.kind === 'system' && e.meta?.joined))
  useEffect(() => {
    if (!staff || seenJoin.current) return
    seenJoin.current = true
    setStaffEntering(true)
    const t = setTimeout(() => setStaffEntering(false), ENTRANCE_MS)
    return () => clearTimeout(t)
  }, [staff])
  const joinable = scenario.contacts.filter((c) => c.can_join)
  useEffect(() => {
    if (actionPlan.length) setNeedPlan(false)
  }, [actionPlan.length])

  // Surprise documents buzz in once the family has finished speaking.
  const [toast, setToast] = useState<{ text: string; letter: DocLetter } | null>(null)
  const [unreadDocs, setUnreadDocs] = useState(0)
  const seenSurprise = useRef<Set<number>>(new Set(scenario.events.filter((e) => e.kind === 'surprise').map((e) => e.id)))
  useEffect(() => {
    if (!settled) return
    const fresh = scenario.events.filter((e) => e.kind === 'surprise' && !seenSurprise.current.has(e.id))
    for (const e of fresh) {
      seenSurprise.current.add(e.id)
      setToast({ text: e.content, letter: e.meta?.letter as DocLetter })
      setUnreadDocs((n) => n + 1)
    }
  }, [scenario.events, settled])
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 10000)
    return () => clearTimeout(t)
  }, [toast])

  // Once the conference is over there's nothing to show anyone.
  useEffect(() => {
    if (!live) setView((v) => (v.kind === 'showing' ? { kind: 'room' } : v))
  }, [live])

  const openLaptop = (app: AppId, extra: { doc?: DocLetter; role?: ContactRole } = {}) => {
    setView({ kind: 'laptop', app, ...extra, key: Date.now() })
    if (app === 'records') {
      setUnreadDocs(0)
      setToast(null)
    }
  }

  const showing = view.kind === 'showing' ? scenario.documents.find((d) => d.letter === view.letter) : undefined
  // A printed copy waits in the tray until the teacher's next line hands it over.
  const [handout, setHandout] = useState<DocLetter | null>(null)
  const handoutDoc = handout ? scenario.documents.find((d) => d.letter === handout) : undefined

  return (
    <main className="relative flex h-svh flex-col overflow-hidden bg-coffee font-body text-ghost">
      <Ambient tension={present ? scenario.tension : 0} />

      <TopBar
        session={session}
        scenario={scenario}
        center={
          <GlassTension
            value={scenario.tension}
            range={scenario.tension_range}
            change={lastTension ? Number(lastTension.meta?.change) : undefined}
            reason={lastTension?.content}
          />
        }
        right={
          scenario.status === 'conference' ? (
            <div className="flex items-center gap-2">
              <MeetingClock scenario={scenario} />
              {view.kind === 'room' && (
                <GlassButton
                  onClick={() => (actionPlan.length ? actions.end() : setNeedPlan(true))}
                  disabled={!!busy || !settled}
                  aria-disabled={!canEnd}
                  title={canEnd ? undefined : 'Reach an agreement with the parent first'}
                  className={cn('hover:border-scarlet/70', !canEnd && 'opacity-60')}
                >
                  {busy === 'end' ? 'Writing debrief…' : 'End conference'}
                </GlassButton>
              )}
            </div>
          ) : null
        }
      />

      {/* the family, across the desk. On the laptop, they slide up and peek over the screen. */}
      <section className="relative z-10 flex min-h-0 flex-1 items-end justify-center px-4">
        <motion.div
          className="flex h-full items-end justify-center"
          initial={false}
          animate={{ y: onLaptop ? '-17%' : '0%', x: staff ? '-14%' : '0%' }}
          transition={{ type: 'spring', stiffness: 120, damping: 22 }}
        >
          <FamilyStage
            tension={scenario.tension}
            demeanor={scenario.demeanor}
            pose={pose}
            talking={talking}
            lines={lines}
            parentName={scenario.parent.name}
            studentName={scenario.student_first_name}
            present={present}
            conferring={waiting}
            staff={staff}
            staffEntering={staffEntering}
          />
        </motion.div>
        <div aria-hidden className="pointer-events-none absolute inset-x-[6%] bottom-0 h-px bg-gradient-to-r from-transparent via-ghost/25 to-transparent" />

        {/* the teacher's laptop, screen toward the teacher */}
        <AnimatePresence>
          {view.kind === 'laptop' && (
            <motion.div
              key="laptop"
              className="absolute inset-x-0 bottom-0 z-20 mx-auto flex h-[60%] w-[min(1180px,96%)] flex-col rounded-t-[28px] bg-coffee px-3 pt-2 ring-1 ring-ghost/10 shadow-[0_-12px_60px_rgba(54,38,167,0.35)]"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 160, damping: 26 }}
            >
              <div className="flex flex-none items-center justify-between gap-3 px-2 pb-2">
                <p className="truncate text-xs text-ghost/60">
                  {present ? `${parentFirst} and ${scenario.student_first_name} are watching you. You can keep talking while you look.` : 'Your laptop'}
                </p>
                <GlassButton onClick={() => setView({ kind: 'room' })} className="flex-none py-1.5">
                  Close laptop
                </GlassButton>
              </div>
              <div className="min-h-0 flex-1">
                <Computer
                  key={view.key}
                  scenario={scenario}
                  teacherName={session.teacher_name}
                  pendingTeacherLine={pendingLine}
                  busy={!!busy}
                  onConsult={actions.consult}
                  initialApp={view.app}
                  initialDoc={view.doc}
                  chatWith={view.role}
                  showTo={parentFirst}
                  notesForm={notesForm}
                  onPrint={live && present ? (letter) => setHandout(letter) : undefined}
                  onShow={live && present && settled && !busy ? (letter) => setView({ kind: 'showing', letter }) : undefined}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* glass controls. On the laptop only the text box stays: the teacher can keep talking while they look. */}
      <footer className="relative z-20 flex-none px-4 pb-4 pt-3 sm:px-6">
        <div className="mx-auto flex max-w-5xl flex-col gap-3">
          {view.kind === 'showing' ? (
            <p className="text-center text-sm text-ghost/70">
              You turned the laptop around. {parentFirst} and {scenario.student_first_name} are reading{' '}
              <span className="font-semibold text-ghost">{showing?.title}</span>.
            </p>
          ) : onLaptop ? null : (
            <nav className="flex flex-wrap justify-center gap-2" aria-label="During the conference">
              {scenario.contacts.map((c) => (
                <GlassButton
                  key={c.role}
                  title={`${c.name}, ${c.title}`}
                  onClick={() => openLaptop('chat', { role: c.role })}
                  disabled={!live}
                >
                  Message {CONTACT_LABEL[c.role]}
                </GlassButton>
              ))}
              {joinable.map((c) =>
                staff?.role === c.role ? null : (
                  <GlassButton
                    key={`join-${c.role}`}
                    onClick={() => actions.join(c.role)}
                    disabled={!live || !!busy || !settled || !!staff}
                    className="flex items-center gap-2 border-glaucous/50"
                    title={`${c.name} can step into the meeting`}
                  >
                    <DoorOpen className="size-4" /> {busy === 'join' ? `${c.name} is on the way…` : `Ask ${c.name} to come in`}
                  </GlassButton>
                ),
              )}
              <GlassButton onClick={() => openLaptop('records')} className="relative flex items-center gap-2">
                <FileText className="size-4" /> Documents
                {unreadDocs > 0 && (
                  <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-scarlet text-[11px] font-bold">
                    {unreadDocs}
                  </span>
                )}
              </GlassButton>
              <GlassButton onClick={() => openLaptop('guide')} className="flex items-center gap-2">
                <ClipboardList className="size-4" /> Guide &amp; notes form
              </GlassButton>
              <GlassButton onClick={() => openLaptop('notes')} className="flex items-center gap-2">
                <NotebookPen className="size-4" /> Transcript
              </GlassButton>
            </nav>
          )}

          {/* The coach sits with the controls, below the desk line, so it never
              covers what the family is saying. */}
          {/* Coach and action plan share one fixed-height row below the desk line, so
              they never cover what the family says and never push the controls around.
              It stays while the laptop is open too. */}
          {live && view.kind !== 'showing' && (
            <div className="mx-auto flex h-24 w-full max-w-5xl gap-3">
              <CoachTip sessionId={session.id} scenario={scenario} ready={settled && !busy} coach={coach} />
              <ActionPlan
                steps={actionPlan}
                parent={parentFirst}
                nudge={needPlan}
                onEndAnyway={stuck ? actions.end : undefined}
                turnsLeft={END_WITHOUT_PLAN_AFTER - scenario.turn_count}
                busy={!!busy}
              />
            </div>
          )}

          {live ? (
            view.kind === 'showing' ? (
              <Composer
                key="showing"
                allowEmpty
                submitLabel="Show"
                onCancel={() => setView({ kind: 'room' })}
                disabled={!!busy}
                placeholder={`Say something as you show ${parentFirst} (optional)…`}
                status={waiting ? `${parentFirst} is reading…` : null}
                onSend={async (message) => {
                  const ok = await actions.speak(message, view.letter)
                  if (ok) setView({ kind: 'room' })
                  return ok
                }}
              />
            ) : (
              <Composer
                key="room"
                disabled={!!busy || !settled}
                allowEmpty={!!handout}
                attachment={
                  handoutDoc
                    ? { label: `Printed copy for ${parentFirst}: ${handoutDoc.title}`, onClear: () => setHandout(null) }
                    : undefined
                }
                placeholder={`Say something to ${parentFirst} and ${scenario.student_first_name}…`}
                status={
                  waiting
                    ? `${parentFirst} is thinking…`
                    : !settled
                      ? 'Listening…'
                      : busy === 'consult'
                        ? 'Waiting on a colleague…'
                        : null
                }
                onSend={async (message) => {
                  const ok = await actions.speak(message, handout ?? undefined, undefined, !!handout)
                  if (ok) setHandout(null)
                  return ok
                }}
              />
            )
          ) : (
            <p className="text-center text-sm text-ghost/60">
              {present ? 'The conference is over.' : `${scenario.parent.name} left the meeting.`}
            </p>
          )}
        </div>
      </footer>

      {/* notification, like a phone buzzing on the desk */}
      <AnimatePresence>
        {toast && (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: -16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            onClick={() => openLaptop('records', { doc: toast.letter })}
            className={cn(glass, 'absolute right-4 top-20 z-30 flex max-w-sm items-center gap-3 rounded-2xl px-4 py-3 text-left ring-1 ring-scarlet/60 sm:right-6')}
          >
            <span className="grid size-10 flex-none place-items-center rounded-xl bg-scarlet">
              <Mail className="size-5" />
            </span>
            <span>
              <span className="block text-sm font-medium leading-snug">{toast.text}</span>
              <span className="block text-xs text-ghost/60">Tap to open</span>
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      <ErrorToast error={error} onDismiss={onDismissError} />

      {scenario.status === 'ended' && settled && (
        <Debrief session={session} scenario={scenario} busy={busy === 'advance'} onContinue={actions.advance} />
      )}
    </main>
  )
}

/**
 * The time, so the teacher can pace the meeting. By default it's the meeting's
 * own clock (the scheduled start plus time elapsed); tap to switch to a timer
 * of how long the conference has run. The choice is remembered.
 */
function MeetingClock({ scenario }: { scenario: ScenarioView }) {
  const [mode, setMode] = useState<'clock' | 'timer'>('clock')
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    try {
      if (localStorage.getItem('bb-clock') === 'timer') setMode('timer')
    } catch {}
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  const toggle = () => {
    const next = mode === 'clock' ? 'timer' : 'clock'
    setMode(next)
    try {
      localStorage.setItem('bb-clock', next)
    } catch {}
  }

  const first = scenario.events[0]
  const startedAt = first ? new Date(first.created_at).getTime() : now
  const elapsed = Math.max(0, now - startedAt)
  let label: string
  if (mode === 'timer') {
    const m = Math.floor(elapsed / 60000)
    const sec = Math.floor((elapsed % 60000) / 1000)
    label = `${m}:${String(sec).padStart(2, '0')} elapsed`
  } else {
    // "3:15 PM" in the meeting context sets the scene's clock; otherwise use real time.
    const match = scenario.meeting_context.match(/\b(\d{1,2}):(\d{2})\s*(AM|PM)\b/i)
    let time = new Date(now)
    if (match) {
      const h = (Number(match[1]) % 12) + (match[3].toUpperCase() === 'PM' ? 12 : 0)
      time = new Date(2000, 0, 1, h, Number(match[2]))
      time = new Date(time.getTime() + elapsed)
    }
    label = time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }

  return (
    <button
      type="button"
      onClick={toggle}
      title={mode === 'clock' ? 'Meeting clock. Tap for a timer.' : 'Time since the family sat down. Tap for the clock.'}
      className={cn(glass, 'flex items-center gap-2 rounded-full px-3.5 py-2.5 font-body text-sm tabular-nums text-ghost/90')}
    >
      {mode === 'clock' ? <Clock className="size-4 text-brand" /> : <Timer className="size-4 text-brand" />}
      {label}
    </button>
  )
}

/**
 * The next steps everyone has agreed to. Ending without one is allowed, but the
 * first press of "End conference" asks the teacher to consider making a plan.
 */
function ActionPlan({
  steps,
  parent,
  nudge,
  onEndAnyway,
  turnsLeft,
  busy,
}: {
  steps: string[]
  parent: string
  nudge: boolean
  /** Only offered once the conversation has run long without a plan. */
  onEndAnyway?: () => void
  turnsLeft: number
  busy: boolean
}) {
  if (steps.length === 0 && !nudge) return null
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0, scale: nudge ? [1, 1.03, 1] : 1 }}
      className={cn(glass, 'h-full w-96 flex-none overflow-y-auto rounded-2xl px-4 py-2.5 text-sm', nudge && 'ring-1 ring-scarlet/70')}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-brand">Action plan</p>
      {steps.length ? (
        <ul className="mt-1.5 space-y-1">
          {steps.map((step) => (
            <li key={step} className="flex gap-2 leading-snug">
              <span className="mt-1.5 size-1.5 flex-none rounded-full bg-glaucous" />
              {step}
            </li>
          ))}
        </ul>
      ) : (
        <>
          <p className="mt-1 leading-snug text-ghost/80">
            End once you and {parent} agree on a next step: who does what, by when.
          </p>
          {onEndAnyway ? (
            <button
              type="button"
              onClick={onEndAnyway}
              disabled={busy}
              className="mt-2 rounded-full border border-ghost/25 px-3 py-1 text-xs text-ghost/80 hover:border-scarlet hover:text-ghost disabled:opacity-40"
            >
              End without a plan
            </button>
          ) : (
            turnsLeft > 0 && (
              <p className="mt-1 text-xs text-ghost/60">
                Stuck? You can end without one after {turnsLeft} more exchange{turnsLeft === 1 ? '' : 's'}.
              </p>
            )
          )}
        </>
      )}
    </motion.div>
  )
}

/**
 * Coach tips: after each exchange, one suggestion tied to what was just said,
 * nudging toward the guide's steps. It names the move; the words are the
 * teacher's. On/off lives in useCoachSetting.
 */
function CoachTip({ sessionId, scenario, ready, coach }: { sessionId: string; scenario: ScenarioView; ready: boolean; coach: CoachSetting }) {
  const { on, set: toggle, style } = coach
  const [tip, setTip] = useState<{ text: string; after: number; style: CoachStyle } | null>(null)
  const [loading, setLoading] = useState(false)
  const lastEvent = scenario.events.at(-1)?.id ?? 0

  // Ask for a fresh tip once the family has finished answering.
  useEffect(() => {
    if (!on || !ready || (tip?.after === lastEvent && tip.style === style)) return
    let alive = true
    setLoading(true)
    api
      .coach(sessionId, style)
      .then((r) => alive && setTip({ text: r.tip, after: r.after_event, style }))
      .catch(() => {})
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [on, ready, lastEvent, sessionId, style, tip?.after, tip?.style])

  // A fixed-height slot whatever the state (off, thinking, tip), so a tip
  // arriving never pushes the controls above it around.
  return (
    <div className="flex h-full min-w-0 flex-1 items-center justify-center">
      {!on ? (
        <button
          type="button"
          onClick={() => toggle(true)}
          className={cn(glass, 'rounded-full px-3.5 py-1.5 text-xs text-ghost/75 hover:text-ghost')}
        >
          Coach tips: off · turn on
        </button>
      ) : (
        <div className={cn(glass, 'flex h-full w-full items-start gap-3 overflow-hidden rounded-2xl px-4 py-2.5 text-sm')}>
          <span className="mt-0.5 flex-none text-[10px] font-semibold uppercase tracking-[0.25em] text-brand">
            Coach · {COACH_STYLES.find((c) => c.value === style)?.label}
          </span>
          <motion.span
            key={tip?.text ?? 'loading'}
            initial={{ opacity: 0 }}
            animate={{ opacity: loading || !ready ? 0.6 : 1 }}
            transition={{ duration: 0.3 }}
            className="line-clamp-3 min-w-0 flex-1 leading-snug"
          >
            {tip?.text ?? 'Thinking about your next move…'}
          </motion.span>
          <button type="button" onClick={() => toggle(false)} aria-label="Turn off coach tips" className="flex-none text-ghost/60 hover:text-ghost">
            ×
          </button>
        </div>
      )}
    </div>
  )
}

/** The coach on/off switch on the briefing footer, so it can be set before the family arrives. */
function CoachSwitch({ coach }: { coach: CoachSetting }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={coach.on}
      data-tour="coach"
      onClick={() => coach.set(!coach.on)}
      className="flex items-center gap-2.5 rounded-full py-1 text-sm text-ghost/75 hover:text-ghost"
    >
      Coach tips
      <span
        aria-hidden
        className={cn(
          'relative h-6 w-11 rounded-full transition-colors',
          coach.on ? 'bg-royal' : 'bg-ghost/45',
        )}
      >
        <span
          className={cn(
            'absolute top-1 size-4 rounded-full bg-[#fbfbff] shadow transition-[left]',
            coach.on ? 'left-6' : 'left-1',
          )}
        />
      </span>
      <span className="w-6 text-left font-semibold text-ghost">{coach.on ? 'On' : 'Off'}</span>
    </button>
  )
}

// ---------------------------------------------------------------------------
// Shared pieces
// ---------------------------------------------------------------------------

/** Soft light behind the family: cool when calm, warming to scarlet as tension climbs. */
function Ambient({ tension }: { tension: number }) {
  const heat = Math.max(0, (tension - 50) / 50)
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <motion.div
        className="absolute left-1/2 top-[38%] h-[70vh] w-[90vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-royal blur-[120px]"
        animate={{ opacity: 0.55 - heat * 0.35 }}
        transition={{ duration: 1.5 }}
      />
      <motion.div
        className="absolute left-1/2 top-[45%] h-[45vh] w-[55vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-glaucous blur-[110px]"
        animate={{ opacity: 0.28 - heat * 0.2 }}
        transition={{ duration: 1.5 }}
      />
      <motion.div
        className="absolute left-1/2 top-[40%] h-[60vh] w-[70vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-scarlet blur-[130px]"
        animate={{ opacity: heat * 0.42 }}
        transition={{ duration: 1.5 }}
      />
    </div>
  )
}

function TopBar({
  session,
  scenario,
  center,
  right,
}: {
  session: SessionView
  scenario: ScenarioView
  center?: React.ReactNode
  right?: React.ReactNode
}) {
  return (
    <header className="relative z-30 grid flex-none grid-cols-[1fr_auto_1fr] items-start gap-4 px-4 pt-4 sm:px-6">
      <div className="min-w-0">
        <a href="/practice" className="font-display text-base font-bold tracking-tight">
          Building Bridges
        </a>
        <p className="truncate text-xs text-ghost/60">
          {session.plan.length > 1 && <>Scenario {scenario.idx + 1} of {session.plan.length} · </>}
          {scenario.title}
          {scenario.status === 'conference' && <> · Turn {scenario.turn_count}</>}
        </p>
      </div>
      <div>{center}</div>
      <div className="flex justify-end">{right}</div>
    </header>
  )
}

function GlassTension({
  value,
  range,
  change,
  reason,
}: {
  value: number
  range: { min: number; max: number }
  change?: number
  reason?: string
}) {
  const limited = range.min > 0 || range.max < 100
  return (
    <div className={cn(glass, 'w-[min(360px,40vw)] rounded-2xl px-4 py-2.5')}>
      <div className="flex items-baseline justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-ghost/60">Tension</span>
        <span className="font-display text-sm font-bold">
          {tensionLabel(value)} · {value}
        </span>
      </div>
      <div
        className="relative mt-1.5 h-2 overflow-hidden rounded-full bg-ghost/10"
        role="meter"
        aria-valuemin={range.min}
        aria-valuemax={range.max}
        aria-valuenow={value}
        aria-label="Tension"
        title={limited ? `This session keeps tension between ${range.min} and ${range.max}` : undefined}
      >
        <motion.div
          className="h-full rounded-full"
          initial={false}
          animate={{ width: `${value}%`, backgroundColor: value <= 50 ? '#657ed4' : '#ff331f' }}
          transition={{ type: 'spring', stiffness: 80, damping: 18 }}
        />
        {/* the part of the meter this session can't reach */}
        {range.min > 0 && <span aria-hidden className="absolute inset-y-0 left-0 bg-coffee/55" style={{ width: `${range.min}%` }} />}
        {range.max < 100 && <span aria-hidden className="absolute inset-y-0 right-0 bg-coffee/55" style={{ width: `${100 - range.max}%` }} />}
      </div>
      {reason && (
        <motion.p key={reason} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-1.5 flex items-start gap-2 text-xs leading-snug text-ghost/75">
          {change !== undefined && (
            <span className={cn('flex-none rounded-full px-1.5 font-bold', change > 0 ? 'bg-scarlet' : change < 0 ? 'bg-royal' : 'bg-ghost/15')}>
              {change > 0 ? `+${change}` : change}
            </span>
          )}
          <span className="line-clamp-2">{reason}</span>
        </motion.p>
      )}
    </div>
  )
}

function ErrorToast({ error, onDismiss }: { error: string | null; onDismiss: () => void }) {
  return (
    <AnimatePresence>
      {error && (
        <motion.button
          type="button"
          onClick={onDismiss}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="absolute left-1/2 top-4 z-50 max-w-lg -translate-x-1/2 rounded-xl bg-scarlet px-4 py-2 text-left text-sm text-ghost shadow-lg"
        >
          {error} <span className="opacity-70">(dismiss)</span>
        </motion.button>
      )}
    </AnimatePresence>
  )
}

function Composer({
  disabled,
  placeholder,
  status,
  onSend,
  allowEmpty = false,
  submitLabel = 'Speak',
  onCancel,
  attachment,
}: {
  disabled: boolean
  placeholder: string
  status: string | null
  onSend: (message: string) => Promise<boolean>
  /** Something handed over with the next line (a printed copy). */
  attachment?: { label: string; onClear: () => void }
  /** Send even with nothing typed (showing a document speaks for itself). */
  allowEmpty?: boolean
  submitLabel?: string
  onCancel?: () => void
}) {
  const [draft, setDraft] = useState('')
  const mic = useMicrophone()
  const box = useRef<HTMLTextAreaElement>(null)

  async function send() {
    const text = draft.trim()
    if ((!text && !allowEmpty) || disabled) return
    setDraft('')
    const ok = await onSend(text)
    if (!ok) setDraft(text)
  }

  async function toggleMic() {
    if (mic.state === 'recording') {
      const heard = await mic.stop()
      if (!heard) return
      // Show what was heard so the teacher can fix it before the family hears it.
      setDraft((cur) => (cur.trim() ? `${cur.trim()} ${heard}` : heard))
      requestAnimationFrame(() => {
        const el = box.current
        if (!el) return
        el.focus()
        el.setSelectionRange(el.value.length, el.value.length)
      })
    } else {
      mic.start()
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {attachment && (
        <div className="flex justify-center">
          <span className="flex items-center gap-2 rounded-full bg-ghost px-3 py-1 text-xs font-medium text-coffee">
            <Printer className="size-3.5 text-brand-inverse" /> {attachment.label}
            <button type="button" onClick={attachment.onClear} aria-label="Don't hand it over" className="text-coffee/60 hover:text-coffee">
              ×
            </button>
          </span>
        </div>
      )}
      <form
        className={cn(glass, 'flex items-end gap-2 rounded-[26px] p-2')}
        onSubmit={(e) => {
          e.preventDefault()
          send()
        }}
      >
        <button
          type="button"
          onClick={toggleMic}
          disabled={mic.state === 'transcribing' || (disabled && mic.state !== 'recording')}
          aria-label={mic.state === 'recording' ? 'Stop recording' : 'Speak out loud'}
          aria-pressed={mic.state === 'recording'}
          title={mic.error ?? (mic.state === 'recording' ? 'Tap when you’re done talking' : 'Tap to talk')}
          className={cn(
            'relative grid size-12 flex-none place-items-center rounded-full transition-[background-color,transform] enabled:hover:scale-[1.05] disabled:opacity-40',
            mic.state === 'recording' ? 'bg-scarlet text-ghost' : 'bg-ghost/10 text-ghost/85 hover:bg-ghost/20',
          )}
        >
          {mic.state === 'recording' && <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-scarlet/50" />}
          {mic.state === 'transcribing' ? <Loader2 className="size-5 animate-spin" /> : mic.state === 'recording' ? <Square className="relative size-4 fill-current" /> : <Mic className="size-5" />}
        </button>
        <textarea
          ref={box}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
          rows={2}
          maxLength={2000}
          placeholder={
            mic.state === 'recording'
              ? 'Listening… tap the mic when you’re done, then check it and press Speak.'
              : mic.state === 'transcribing'
                ? 'Catching what you said…'
                : (mic.error ?? status ?? placeholder)
          }
          aria-label="What you say"
          className="block min-w-0 flex-1 resize-none bg-transparent px-3 py-2 text-[15px] text-ghost placeholder:text-ghost/55 focus:outline-none"
        />
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={disabled}
            className="rounded-full px-4 py-3 text-sm text-ghost/70 hover:text-ghost disabled:opacity-40"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={disabled || (!allowEmpty && !draft.trim())}
          className="rounded-full bg-scarlet px-6 py-3 font-semibold text-ghost shadow-[0_6px_24px_rgba(255,51,31,0.35)] transition-transform enabled:hover:scale-[1.03] disabled:opacity-40"
        >
          {submitLabel}
        </button>
      </form>
    </div>
  )
}

type MicState = 'idle' | 'recording' | 'transcribing'

/** Records the teacher's voice and turns it into text through /api/transcribe. */
function useMicrophone() {
  const [state, setState] = useState<MicState>('idle')
  const [error, setError] = useState<string | null>(null)
  const recorder = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])

  // Let go of the microphone if the teacher leaves mid-sentence.
  useEffect(() => () => recorder.current?.stream.getTracks().forEach((t) => t.stop()), [])

  async function start() {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const rec = new MediaRecorder(stream)
      chunks.current = []
      rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data)
      rec.start()
      recorder.current = rec
      setState('recording')
    } catch {
      setError('Microphone blocked. Allow mic access in your browser, or type instead.')
    }
  }

  /** Stops recording and resolves with what was heard ('' if nothing). */
  async function stop(): Promise<string> {
    const rec = recorder.current
    if (!rec) return ''
    recorder.current = null
    const stopped = new Promise((resolve) => (rec.onstop = resolve))
    rec.stop()
    await stopped
    rec.stream.getTracks().forEach((t) => t.stop())

    setState('transcribing')
    try {
      const { text } = await api.transcribe(new Blob(chunks.current, { type: rec.mimeType }))
      if (!text) setError('Didn’t catch that. Try again, or type instead.')
      return text
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t transcribe that.')
      return ''
    } finally {
      setState('idle')
    }
  }

  return { state, error, start, stop }
}
