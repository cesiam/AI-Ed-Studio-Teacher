'use client'

import { motion } from 'motion/react'
import type { ScenarioView, SessionView } from '@/lib/api-types'
import { tensionColor } from './tension-meter'

export function Debrief({
  session,
  scenario: s,
  busy,
  onContinue,
}: {
  session: SessionView
  scenario: ScenarioView
  busy: boolean
  onContinue: () => void
}) {
  const d = s.debrief
  const isLast = s.idx === session.plan.length - 1
  const plan = session.plan[s.idx]?.surprise_plan
  const surpriseDoc = s.documents.find((doc) => doc.letter === plan?.type)
  const actionPlan = s.events.filter((e) => e.kind === 'agreement').flatMap((e) => (e.meta?.steps as string[]) ?? [])

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-coffee/75 p-4 backdrop-blur-sm">
      <motion.article
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl rounded-3xl bg-ghost p-6 font-body text-coffee shadow-2xl sm:p-8"
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-royal">
          Debrief{session.plan.length > 1 && ` · Scenario ${s.idx + 1} of ${session.plan.length}`}
        </p>
        <h2 className="mt-1 font-display text-3xl font-bold leading-tight">
          {s.ended_reason === 'walkout' ? (
            <>
              {s.parent.name} <span className="text-scarlet">walked out.</span>
            </>
          ) : (
            s.title
          )}
        </h2>

        <div className="mt-5 grid grid-cols-3 gap-3 text-center">
          <Stat label="Tension" value={`${s.starting_tension} → ${s.tension}`} color={tensionColor(s.tension)} />
          <Stat label="Turns" value={String(s.turn_count)} />
          <Stat
            label="Strength shared"
            value={d ? (d.acknowledged_strength ? 'Yes' : 'Not yet') : '—'}
            color={d?.acknowledged_strength ? '#3626a7' : '#ff331f'}
          />
        </div>

        {d ? (
          <>
            <p className="mt-6 leading-relaxed">{d.summary}</p>
            <Section title="The plan you agreed on" items={actionPlan} />
            <Section title="What worked" items={d.went_well} />
            <Section title="Try next time" items={d.try_next} />
            {d.hidden_truths_surfaced.length > 0 && <Section title="What the family opened up about" items={d.hidden_truths_surfaced} />}
          </>
        ) : (
          <p className="mt-6 text-coffee/60">No debrief was recorded.</p>
        )}

        {plan && (
          <p className="mt-6 rounded-xl bg-glaucous/15 px-4 py-3 text-sm">
            Surprise document {plan.type}
            {surpriseDoc ? ` (“${surpriseDoc.title}”)` : ''} was scheduled for turn {plan.turn}
            {s.surprise ? '.' : ', but the conference ended first.'}
          </p>
        )}

        <div className="mt-8 flex justify-end">
          <button
            type="button"
            disabled={busy}
            onClick={onContinue}
            className="rounded-full bg-scarlet px-6 py-3 font-semibold text-ghost transition-transform enabled:hover:scale-[1.03] disabled:opacity-50"
          >
            {isLast ? 'Finish session' : 'Next family'}
          </button>
        </div>
      </motion.article>
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-2xl border border-coffee/10 px-2 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-coffee/50">{label}</p>
      <p className="mt-1 font-display text-xl font-bold" style={color ? { color } : undefined}>
        {value}
      </p>
    </div>
  )
}

function Section({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null
  return (
    <section className="mt-5">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.25em] text-coffee/55">{title}</h3>
      <ul className="mt-2 space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2 leading-relaxed">
            <span className="mt-2 size-1.5 flex-none rounded-full bg-scarlet" />
            {item}
          </li>
        ))}
      </ul>
    </section>
  )
}
