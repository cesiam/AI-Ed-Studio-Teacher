import { ClipboardList } from 'lucide-react'
import type { DocLetter, Research, ScenarioView } from '@/lib/api-types'
import { GUIDE } from '@/lib/notes-form'

const RESEARCH_ROWS: { key: keyof Research; label: string }[] = [
  { key: 'prevalence', label: 'How common' },
  { key: 'why_address_it', label: 'Why address it' },
  { key: 'massachusetts', label: 'In Massachusetts' },
]

const TUTORIAL_STEPS = [
  'Glance at the two records below. That’s all the prep you need.',
  'Press “Invite them in”, then talk (type or use the mic). Open with something Leo does well.',
  'Mid-conversation you can open the laptop to check a record or show it to his mom. End whenever you’ve agreed on a next step.',
]

export function CaseFileApp({
  scenario: s,
  onOpenDocument,
  onOpenGuide,
}: {
  scenario: ScenarioView
  onOpenDocument: (letter: DocLetter) => void
  onOpenGuide?: () => void
}) {
  const [but, ...rest] = s.student_strength.split(/(?<=^BUT)\s/)
  const hasBut = but === 'BUT' && rest.length > 0

  return (
    <div className="h-full overflow-y-auto px-6 py-5 font-body">
      <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-royal">
        Scenario {s.scenario_id} · Raised by {s.raised_by}
      </p>
      <h2 className="mt-1 font-display text-2xl font-bold leading-tight">{s.title}</h2>
      <p className="mt-0.5 font-medium text-royal">{s.topic}</p>
      <p className="mt-1 text-sm text-coffee/60">
        {s.student_name}, grade {s.grade} · Parent: {s.parent.name} ({s.parent.relationship}) · You: {s.teacher_role}
      </p>
      <p className="mt-3 text-sm text-coffee/75">{s.meeting_context}</p>

      {onOpenGuide && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-royal/25 bg-royal/[0.06] p-4">
          <div className="min-w-0 max-w-xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-royal">Suggested reading · use it for guidance</p>
            <p className="mt-1 font-semibold leading-snug">“{GUIDE.title}”</p>
            <p className="text-sm text-coffee/60">
              {GUIDE.source}. If it helps, keep it open next to the optional notes form during the conference.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenGuide}
            className="flex flex-none items-center gap-2 rounded-full bg-royal px-4 py-2 text-sm font-semibold text-ghost hover:bg-royal/90"
          >
            <ClipboardList className="size-4" /> Open guide &amp; notes form
          </button>
        </div>
      )}

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-coffee/10 p-4">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.25em] text-coffee/55">Your concern</h3>
          <p className="mt-2 leading-relaxed">{s.teacher_concern}</p>
        </section>
        <section className="rounded-xl bg-royal/10 p-4">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.25em] text-royal">What you notice</h3>
          <p className="mt-2 leading-relaxed">
            {hasBut ? (
              <>
                <span className="font-bold text-royal">BUT</span> {rest.join(' ')}
              </>
            ) : (
              s.student_strength
            )}
          </p>
        </section>
      </div>

      {s.tutorial ? (
        <>
          <h3 className="mt-6 text-[11px] font-semibold uppercase tracking-[0.25em] text-coffee/55">How this works</h3>
          <ol className="mt-2 grid gap-3 md:grid-cols-3">
            {TUTORIAL_STEPS.map((step, i) => (
              <li key={i} className="rounded-xl border border-coffee/10 p-3 text-sm leading-snug">
                <span className="font-display text-lg font-bold text-scarlet">{i + 1}</span>
                <p className="mt-1">{step}</p>
              </li>
            ))}
          </ol>
        </>
      ) : (
        <>
          <h3 className="mt-6 text-[11px] font-semibold uppercase tracking-[0.25em] text-coffee/55">
            Why this conversation matters
          </h3>
          <dl className="mt-2 grid gap-3 md:grid-cols-3">
            {RESEARCH_ROWS.map(({ key, label }) => (
              <div key={key} className="rounded-xl border border-coffee/10 p-3">
                <dt className="text-[10px] font-semibold uppercase tracking-[0.2em] text-scarlet">{label}</dt>
                <dd className="mt-1 text-sm leading-snug">{s.research[key].text}</dd>
                <dd className="mt-1 text-xs text-coffee/50">{s.research[key].source}</dd>
              </div>
            ))}
          </dl>
        </>
      )}

      <h3 className="mt-6 text-[11px] font-semibold uppercase tracking-[0.25em] text-coffee/55">Records on file</h3>
      <ul className="mt-2 grid gap-2 sm:grid-cols-2">
        {s.documents.map((d) => (
          <li key={d.letter}>
            <button
              type="button"
              onClick={() => onOpenDocument(d.letter)}
              className="flex w-full items-center gap-3 rounded-lg border border-coffee/10 px-3 py-2 text-left text-sm hover:border-royal"
            >
              <span className="grid size-7 flex-none place-items-center rounded-md bg-coffee font-display text-xs font-bold text-ghost">
                {d.letter}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-medium">{d.title}</span>
                <span className="block truncate text-xs text-coffee/55">{d.citation ?? d.source}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
