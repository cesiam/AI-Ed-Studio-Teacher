'use client'

import { ExternalLink, Printer } from 'lucide-react'
import {
  cellId,
  FORM_TABLES,
  GUIDE,
  HEADER_FIELDS,
  NOTES_FORM_INTRO,
  NOTES_FORM_TITLE,
} from '@/lib/notes-form'

/**
 * The article, boiled down to what a teacher does in the room. Paraphrased;
 * the full article is one click away.
 */
const GUIDE_SECTIONS: { title: string; points: string[] }[] = [
  {
    title: 'In the room: use the minutes you get',
    points: [
      'Start with the child’s strengths.',
      'Listen, and reflect back what you hear.',
      'Ask for concrete examples instead of generalities.',
      'Design one routine together, then confirm how you’ll follow up.',
    ],
  },
  {
    title: 'Build a simple two-week action plan',
    points: [
      'One page, a few goals: academic, executive (starting, organizing, turning in work), social.',
      'For each: a measurable target, a cue at school, reinforcement at home, and a progress check.',
    ],
  },
  {
    title: 'If special education may be needed',
    points: ['Talk about supports available now, what data will be gathered and when, and how services would fit into regular class.'],
  },
  {
    title: 'Turn feedback into home routines',
    points: ['Translate each concern into something small and doable at home, like a timer, a checklist, or quick practice.'],
  },
  {
    title: 'Keep the communication loop light',
    points: ['A short, regular note (a win, a barrier, a next step) and one number you both track.'],
  },
  {
    title: 'Signs it’s working in two weeks',
    points: ['Fewer reminders, more complete work, better scores, smoother peer moments, calmer routines.'],
  },
]

export function GuidePane() {
  return (
    <div className="h-full overflow-y-auto px-5 py-4 font-body">
      <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-brand-inverse">Guide · {GUIDE.source}</p>
      <h2 className="mt-1 font-display text-lg font-bold leading-snug">{GUIDE.title}</h2>
      <p className="mt-2 text-sm text-coffee/70">Use this for guidance while you talk. The notes form next to it follows the same steps.</p>
      <a
        href={GUIDE.url}
        target="_blank"
        rel="noreferrer"
        className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-inverse underline-offset-4 hover:underline"
      >
        Read the full article <ExternalLink className="size-3.5" />
      </a>
      <ol className="mt-4 space-y-4">
        {GUIDE_SECTIONS.map((s) => (
          <li key={s.title}>
            <h3 className="text-sm font-semibold">{s.title}</h3>
            <ul className="mt-1 space-y-1 text-sm leading-snug text-coffee/80">
              {s.points.map((p) => (
                <li key={p} className="flex gap-2">
                  <span className="mt-1.5 size-1.5 flex-none rounded-full bg-scarlet" />
                  {p}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </div>
  )
}

const cell =
  'block w-full resize-none bg-transparent px-2 py-1.5 text-[13px] leading-snug text-coffee placeholder:text-coffee/55 focus:bg-glaucous/10 focus:outline-none'

/** The fillable notes form. Values live in the conference room so they survive closing the laptop. */
export function NotesFormPane({
  form,
  defaults,
  onChange,
}: {
  form: Record<string, string>
  /** Shown until the teacher types their own (student, parent, teacher, date). */
  defaults: Record<string, string>
  onChange: (field: string, value: string) => void
}) {
  const value = (id: string) => form[id] ?? defaults[id] ?? ''

  return (
    <div className="h-full overflow-y-auto px-5 py-4 font-body">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-brand-inverse">Optional · use it if it helps</p>
          <h2 className="font-display text-lg font-bold">{NOTES_FORM_TITLE}</h2>
        </div>
        <button
          type="button"
          onClick={() => printForm(value)}
          className="flex flex-none items-center gap-2 rounded-full border border-brand-inverse/40 px-3 py-1.5 text-sm font-semibold text-brand-inverse hover:bg-royal/5"
        >
          <Printer className="size-4" /> Print
        </button>
      </div>
      <p className="mt-1 text-sm text-coffee/70">{NOTES_FORM_INTRO}</p>

      <div className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-coffee/15 bg-coffee/15 sm:grid-cols-4">
        {HEADER_FIELDS.map((f) => (
          <label key={f.id} className="bg-ghost">
            <span className="block bg-coffee/[0.04] px-2 py-1 text-[11px] text-coffee/60">{f.label}</span>
            <input value={value(f.id)} onChange={(e) => onChange(f.id, e.target.value)} className={cell} />
          </label>
        ))}
      </div>

      {FORM_TABLES.map((t) => (
        <section key={t.id} className="mt-5">
          <h3 className="font-display text-base font-bold">{t.title}</h3>
          <p className="mt-0.5 text-[13px] leading-snug text-coffee/65">{t.intro}</p>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-left">
              <thead>
                <tr>
                  {t.columns.map((c) => (
                    <th key={c} className="border border-coffee/15 bg-coffee/[0.04] px-2 py-1 align-bottom text-[11px] font-normal text-coffee/60">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {t.rows.map((r) => (
                  <tr key={r.id}>
                    <td className="w-[26%] border border-coffee/15 align-top">
                      {t.openRows ? (
                        <textarea
                          rows={2}
                          aria-label={`${t.columns[0]}, row ${r.id}`}
                          value={value(cellId(t.id, r.id, 0))}
                          onChange={(e) => onChange(cellId(t.id, r.id, 0), e.target.value)}
                          className={cell}
                        />
                      ) : (
                        <span className="block px-2 py-1.5 text-[13px] leading-snug">{r.label}</span>
                      )}
                    </td>
                    {t.columns.slice(1).map((c, i) => (
                      <td key={c} className="border border-coffee/15 align-top">
                        <textarea
                          rows={2}
                          aria-label={`${r.label || `Row ${r.id}`}: ${c}`}
                          value={value(cellId(t.id, r.id, i + 1))}
                          onChange={(e) => onChange(cellId(t.id, r.id, i + 1), e.target.value)}
                          className={cell}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {t.id === 'plan' && (
            <label className="mt-2 block">
              <span className="text-[13px] text-coffee/70">Parent’s questions or concerns about the plan:</span>
              <textarea
                rows={2}
                value={value('plan.notes')}
                onChange={(e) => onChange('plan.notes', e.target.value)}
                className={`${cell} mt-1 rounded-lg border border-coffee/15`}
              />
            </label>
          )}
        </section>
      ))}
      <p className="mt-5 text-[11px] text-coffee/60">
        Sections follow parts 4 to 7 of “{GUIDE.title}” ({GUIDE.source}), rewritten for the teacher’s side. Saved automatically.
      </p>
    </div>
  )
}

const esc = (t: string) => t.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`)

/** Prints the form as filled in so far, e.g. a copy of the plan for the family to take home. */
function printForm(value: (id: string) => string) {
  const win = window.open('', '_blank', 'width=900,height=1000')
  if (!win) return
  const header = HEADER_FIELDS.map((f) => `<th>${esc(f.label)}</th>`).join('')
  const headerRow = HEADER_FIELDS.map((f) => `<td>${esc(value(f.id))}</td>`).join('')
  const tables = FORM_TABLES.map((t) => {
    const head = t.columns.map((c) => `<th>${esc(c)}</th>`).join('')
    const rows = t.rows
      .map((r) => {
        const first = t.openRows ? value(cellId(t.id, r.id, 0)) : r.label
        const rest = t.columns.slice(1).map((_, i) => `<td>${esc(value(cellId(t.id, r.id, i + 1)))}</td>`).join('')
        return `<tr><td>${esc(first)}</td>${rest}</tr>`
      })
      .join('')
    const notes = t.id === 'plan' ? `<p><b>Parent’s questions or concerns about the plan:</b> ${esc(value('plan.notes'))}</p>` : ''
    return `<h2>${esc(t.title)}</h2><p class="intro">${esc(t.intro)}</p><table><tr>${head}</tr>${rows}</table>${notes}`
  }).join('')
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(NOTES_FORM_TITLE)}</title><style>
body{font:13px/1.45 Georgia,serif;color:#0d0106;margin:32px}h1{font-size:22px;margin:0 0 4px}h2{font-size:16px;margin:22px 0 4px}
.intro{color:#555;margin:0 0 6px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #bbb;padding:6px;text-align:left;vertical-align:top;white-space:pre-wrap}
th{background:#f1f1f5;font:600 11px system-ui,sans-serif}.src{margin-top:24px;font-size:11px;color:#666}</style></head><body>
<h1>${esc(NOTES_FORM_TITLE)}</h1><table><tr>${header}</tr><tr>${headerRow}</tr></table>${tables}
<p class="src">Based on “${esc(GUIDE.title)}”, ${esc(GUIDE.source)}.</p></body></html>`)
  win.document.close()
  win.focus()
  win.print()
}
