'use client'

import { useState } from 'react'
import { FileText, Send } from 'lucide-react'
import type { ContactRole, DocLetter, ScenarioView } from '@/lib/api-types'
import { cn } from '@/lib/utils'

/** PFPS Chat: message the counselor, nurse, principal, or a colleague about the student. */
export function ChatApp({
  scenario,
  busy,
  onSend,
  onOpenDocument,
  only,
  initial,
}: {
  scenario: ScenarioView
  /** Lock the chat to one contact and hide the contact list. */
  only?: ContactRole
  /** Open on this contact (the list stays). */
  initial?: ContactRole
  busy: boolean
  onSend: (role: ContactRole, message: string) => Promise<void>
  onOpenDocument: (letter: DocLetter) => void
}) {
  const [picked, setRole] = useState<ContactRole>(initial ?? 'counselor')
  const role = only ?? picked
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState<string | null>(null)

  const contact = scenario.contacts.find((c) => c.role === role)!
  const thread = scenario.events.filter(
    (e) => (e.kind === 'contact_question' || e.kind === 'contact_reply') && e.meta?.role === role,
  )
  const docTitle = (letter: DocLetter) => scenario.documents.find((d) => d.letter === letter)?.title ?? `Document ${letter}`

  async function send(e: React.FormEvent) {
    e.preventDefault()
    const text = draft.trim()
    if (!text || busy) return
    setSending(text)
    setDraft('')
    try {
      await onSend(role, text)
    } catch {
      setDraft(text)
    } finally {
      setSending(null)
    }
  }

  return (
    <div className="flex h-full font-body">
      <aside className={cn('w-56 flex-none overflow-y-auto border-r border-coffee/10 bg-glaucous/10 p-2', only && 'hidden')}>
        {scenario.contacts.map((c) => (
          <button
            key={c.role}
            type="button"
            onClick={() => setRole(c.role)}
            className={cn(
              'mb-1 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left',
              c.role === role ? 'bg-royal text-[#fbfbff]' : 'hover:bg-coffee/5',
            )}
          >
            <span
              className={cn(
                'grid size-8 flex-none place-items-center rounded-full font-display text-xs font-bold',
                c.role === role ? 'bg-[#fbfbff] text-royal' : 'bg-coffee/10 text-coffee',
              )}
            >
              {initials(c.name)}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{c.name}</span>
              <span className={cn('block truncate text-xs', c.role === role ? 'text-[#fbfbff]/75' : 'text-coffee/60')}>
                {c.title}
              </span>
            </span>
          </button>
        ))}
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-5 py-4">
          {thread.length === 0 && !sending && (
            <p className="text-sm text-coffee/60">
              Ask {contact.name} what they know about {scenario.student_first_name}. They may be able to send you a
              record.
            </p>
          )}
          {thread.map((e) => {
            const mine = e.kind === 'contact_question'
            const shared = e.meta?.shared_document as DocLetter | null | undefined
            return (
              <div key={e.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                <div
                  className={cn(
                    'max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-snug',
                    mine ? 'bg-royal text-[#fbfbff]' : 'bg-coffee/5',
                  )}
                >
                  {e.content}
                  {shared && (
                    <button
                      type="button"
                      onClick={() => onOpenDocument(shared)}
                      className="mt-2 flex items-center gap-2 rounded-lg bg-ghost px-2.5 py-1.5 text-xs font-medium text-coffee ring-1 ring-coffee/10 hover:ring-royal"
                    >
                      <FileText className="size-4 text-scarlet" /> {docTitle(shared)}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
          {sending && (
            <>
              <div className="flex justify-end">
                <div className="max-w-[80%] rounded-2xl bg-royal/70 px-3.5 py-2 text-sm text-[#fbfbff]">{sending}</div>
              </div>
              <p className="text-xs text-coffee/60">{contact.name} is typing…</p>
            </>
          )}
        </div>
        <form onSubmit={send} className="flex gap-2 border-t border-coffee/10 p-3">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={`Message ${contact.name}`}
            className="min-w-0 flex-1 rounded-full border border-coffee/15 bg-ghost px-4 py-2 text-sm focus:border-royal focus:outline-none"
          />
          <button
            type="submit"
            disabled={busy || !draft.trim()}
            className="grid size-9 place-items-center rounded-full bg-royal text-[#fbfbff] disabled:opacity-40"
            aria-label="Send"
          >
            <Send className="size-4" />
          </button>
        </form>
      </section>
    </div>
  )
}

function initials(name: string) {
  return name
    .replace(/^(Dr|Mr|Ms|Mrs)\.?\s+/i, '')
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}
