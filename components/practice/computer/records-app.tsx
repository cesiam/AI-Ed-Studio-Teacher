import { MonitorUp, Printer } from 'lucide-react'
import type { DocLetter, ScenarioView } from '@/lib/api-types'
import { cn } from '@/lib/utils'

/** StudentView: the document list on the left, the selected document on the right. */
export function RecordsApp({
  scenario,
  selected,
  onSelect,
  onShow,
  onPrint,
  showTo,
}: {
  scenario: ScenarioView
  selected: DocLetter
  onSelect: (letter: DocLetter) => void
  /** Turn the laptop around so the family can read this document. */
  onShow?: (letter: DocLetter) => void
  /** Print a copy to hand to the family. */
  onPrint?: (letter: DocLetter) => void
  showTo?: string
}) {
  const doc = scenario.documents.find((d) => d.letter === selected) ?? scenario.documents[0]
  const delivery = scenario.surprise?.letter === doc.letter ? scenario.surprise.delivery : null

  return (
    <div className="flex h-full font-body">
      <aside className="w-52 flex-none overflow-y-auto border-r border-coffee/10 bg-glaucous/10 p-2">
        <p className="px-2 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-coffee/55">
          {scenario.student_name}
        </p>
        {scenario.documents.map((d) => (
          <button
            key={d.letter}
            type="button"
            onClick={() => onSelect(d.letter)}
            className={cn(
              'mb-1 flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left text-sm',
              d.letter === doc.letter ? 'bg-royal text-ghost' : 'hover:bg-coffee/5',
            )}
          >
            <span className="font-display font-bold">{d.letter}</span>
            <span className="min-w-0">
              <span className="block leading-snug">{d.title}</span>
              <span className={cn('block text-xs', d.letter === doc.letter ? 'text-ghost/70' : 'text-coffee/50')}>
                {d.received_from ? `from ${d.received_from}` : d.source}
              </span>
            </span>
          </button>
        ))}
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        {(onShow || onPrint) && (
          <div className="flex flex-none items-center justify-between gap-3 border-b border-coffee/10 px-4 py-2">
            <span className="truncate text-sm font-medium">{doc.title}</span>
            <span className="flex flex-none gap-2">
              {onPrint && (
                <button
                  type="button"
                  onClick={() => onPrint(doc.letter)}
                  className="flex items-center gap-2 rounded-full border border-royal/40 px-4 py-1.5 text-sm font-semibold text-royal hover:bg-royal/5"
                >
                  <Printer className="size-4" /> Print a copy
                </button>
              )}
              {onShow && (
                <button
                  type="button"
                  onClick={() => onShow(doc.letter)}
                  className="flex items-center gap-2 rounded-full bg-royal px-4 py-1.5 text-sm font-semibold text-ghost hover:bg-royal/90"
                >
                  <MonitorUp className="size-4" /> Show {showTo ?? 'them'}
                </button>
              )}
            </span>
          </div>
        )}
        {delivery && (
          <div className="flex-none border-b border-coffee/10 bg-scarlet/[0.06] px-5 py-3 text-sm">
            <p>
              <span className="font-semibold">{delivery.from}</span>
              <span className="text-coffee/50"> · {delivery.app}</span>
            </p>
            <p className="font-medium">{delivery.subject}</p>
            <p className="text-coffee/70">{delivery.body}</p>
          </div>
        )}
        <iframe key={doc.url} src={doc.url} title={doc.title} sandbox="" className="min-h-0 w-full flex-1 bg-ghost" />
      </div>
    </div>
  )
}
