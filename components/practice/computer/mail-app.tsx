'use client'

import { useState } from 'react'
import { FileText, Mail } from 'lucide-react'
import type { DocLetter, ScenarioView } from '@/lib/api-types'
import { cn } from '@/lib/utils'

interface MailItem {
  id: string
  from: string
  subject: string
  time: string
  body: string
  attachment?: { name: string; letter: DocLetter }
  highlight?: boolean
}

// Background inbox so the surprise lands somewhere that feels lived in.
const FILLER: MailItem[] = [
  {
    id: 'district',
    from: 'PFPS Communications',
    subject: 'Important district update',
    time: '9:12 AM',
    body: 'Reminder: early release on Wednesday, November 26. Buses will run 3 hours early. Have a restful Thanksgiving break.',
  },
  {
    id: 'hr',
    from: 'HR Department',
    subject: 'Professional development',
    time: 'Yesterday',
    body: 'Registration for the December PD day is open. Sessions include "Family Partnership in Secondary Schools" and "Grading for Equity."',
  },
]

export function MailApp({
  scenario,
  onOpenDocument,
}: {
  scenario: ScenarioView
  onOpenDocument: (letter: DocLetter) => void
}) {
  const surprise: MailItem | null =
    scenario.surprise && scenario.surprise.delivery.channel === 'email'
      ? {
          id: 'surprise',
          from: scenario.surprise.delivery.from,
          subject: scenario.surprise.delivery.subject,
          time: 'Just now',
          body: scenario.surprise.delivery.body,
          attachment: { name: scenario.surprise.delivery.attachment_name, letter: scenario.surprise.letter },
          highlight: true,
        }
      : scenario.surprise
        ? {
            // Non-email deliveries (chat, portal) still get an inbox notice pointing at the document.
            id: 'surprise',
            from: `${scenario.surprise.delivery.app}: ${scenario.surprise.delivery.from}`,
            subject: scenario.surprise.delivery.subject,
            time: 'Just now',
            body: scenario.surprise.delivery.body,
            attachment: { name: scenario.surprise.delivery.attachment_name, letter: scenario.surprise.letter },
            highlight: true,
          }
        : null

  const items = surprise ? [surprise, ...FILLER] : FILLER
  const [openId, setOpenId] = useState(items[0].id)
  const open = items.find((m) => m.id === openId) ?? items[0]

  return (
    <div className="flex h-full font-body">
      <aside className="w-64 flex-none overflow-y-auto border-r border-coffee/10 bg-glaucous/10">
        <h3 className="px-4 pb-2 pt-3 font-display text-lg font-bold">Inbox</h3>
        {items.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setOpenId(m.id)}
            className={cn(
              'flex w-full gap-3 border-b border-coffee/5 px-4 py-3 text-left',
              m.id === open.id ? (m.highlight ? 'bg-scarlet/15' : 'bg-coffee/5') : 'hover:bg-coffee/5',
            )}
          >
            <Mail className={cn('mt-0.5 size-4 flex-none', m.highlight ? 'text-scarlet' : 'text-coffee/50')} />
            <span className="min-w-0 flex-1">
              <span className="flex justify-between gap-2 text-xs text-coffee/50">
                <span className="truncate font-semibold text-coffee">{m.from}</span>
                <span className="flex-none">{m.time}</span>
              </span>
              <span className="block truncate text-sm text-coffee/75">{m.subject}</span>
            </span>
          </button>
        ))}
      </aside>

      <article className="min-w-0 flex-1 overflow-y-auto px-6 py-5">
        <p className="text-sm">
          <span className="font-semibold">From:</span> {open.from}
        </p>
        <p className="mt-1 text-sm">
          <span className="font-semibold">Subject:</span> {open.subject}
        </p>
        <hr className="my-4 border-coffee/10" />
        <p className="leading-relaxed">{open.body}</p>
        {open.attachment && (
          <button
            type="button"
            onClick={() => onOpenDocument(open.attachment!.letter)}
            className="mt-5 inline-flex items-center gap-3 rounded-xl bg-coffee/5 px-4 py-3 text-sm font-medium hover:bg-royal/10"
          >
            <span className="grid size-9 place-items-center rounded-lg bg-scarlet text-ghost">
              <FileText className="size-5" />
            </span>
            {open.attachment.name}
          </button>
        )}
      </article>
    </div>
  )
}
