'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { BookOpen, ClipboardList, FolderOpen, Mail, MessageCircle, NotebookPen } from 'lucide-react'
import type { ContactRole, DocLetter, ScenarioView } from '@/lib/api-types'
import { cn } from '@/lib/utils'
import { CaseFileApp } from './case-file-app'
import { ChatApp } from './chat-app'
import { GuidePane, NotesFormPane } from './guide-app'
import { MailApp } from './mail-app'
import { NotesApp } from './notes-app'
import { RecordsApp } from './records-app'

export type AppId = 'case' | 'records' | 'guide' | 'mail' | 'chat' | 'notes'

const APPS: { id: AppId; name: string; Icon: typeof Mail }[] = [
  { id: 'case', name: 'Case File', Icon: FolderOpen },
  { id: 'records', name: 'StudentView', Icon: BookOpen },
  { id: 'guide', name: 'Guide & Form', Icon: ClipboardList },
  { id: 'mail', name: 'PFPS Mail', Icon: Mail },
  { id: 'chat', name: 'PFPS Chat', Icon: MessageCircle },
  { id: 'notes', name: 'Transcript', Icon: NotebookPen },
]

/** The teacher's laptop screen, facing the teacher (and the viewer). */
export function Computer({
  scenario,
  teacherName,
  pendingTeacherLine,
  busy,
  onConsult,
  initialApp,
  initialDoc,
  chatWith,
  onShow,
  onPrint,
  showTo,
  notesForm,
}: {
  scenario: ScenarioView
  teacherName: string
  pendingTeacherLine: string | null
  busy: boolean
  onConsult: (role: ContactRole, message: string) => Promise<void>
  initialApp?: AppId
  initialDoc?: DocLetter
  /** Open PFPS Chat on this contact. */
  chatWith?: ContactRole
  /** During the conference: turn the laptop around to show the family a document. */
  onShow?: (letter: DocLetter) => void
  /** During the conference: print a copy to hand to the family. */
  onPrint?: (letter: DocLetter) => void
  /** Who the document would be shown to, for the button label. */
  showTo?: string
  /** The teacher's notes form (state lives above the laptop so it survives closing it). */
  notesForm: { form: Record<string, string>; defaults: Record<string, string>; onChange: (field: string, value: string) => void }
}) {
  const [app, setApp] = useState<AppId>(initialApp ?? (scenario.status === 'briefing' ? 'case' : 'notes'))
  const [doc, setDoc] = useState<DocLetter>(initialDoc ?? 'A')
  const [mailOpened, setMailOpened] = useState(false)
  const [toast, setToast] = useState<{ text: string; target: AppId } | null>(null)

  // A new surprise or shared document pops a notification, like a real desktop.
  const seen = useRef<Set<number>>(new Set(scenario.events.map((e) => e.id)))
  useEffect(() => {
    for (const e of scenario.events) {
      if (seen.current.has(e.id)) continue
      seen.current.add(e.id)
      if (e.kind === 'surprise') {
        setMailOpened(false)
        setToast({ text: e.content, target: 'mail' })
      } else if (e.kind === 'contact_reply' && e.meta?.shared_document && app !== 'chat') {
        setToast({ text: `New message from ${e.speaker} · 1 attachment`, target: 'chat' })
      }
    }
  }, [scenario.events, app])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 9000)
    return () => clearTimeout(t)
  }, [toast])

  function open(id: AppId) {
    setApp(id)
    if (id === 'mail') setMailOpened(true)
  }

  function openDocument(letter: DocLetter) {
    setDoc(letter)
    setApp('records')
  }

  const unreadMail = scenario.surprise && !mailOpened ? 1 : 0
  const room = scenario.meeting_context.match(/Room \w+/)?.[0]
  const current = APPS.find((a) => a.id === app)!

  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-[18px] bg-royal">
      {/* menu bar */}
      <div className="flex h-8 flex-none items-center justify-between bg-coffee/85 px-4 font-body text-xs text-ghost/85">
        <span className="font-semibold">
          PFPS <span className="font-normal text-ghost/55">· {current.name}</span>
        </span>
        <span className="text-ghost/55">
          {scenario.school}
          {room && ` · ${room}`}
        </span>
      </div>

      {/* window */}
      <div className="relative min-h-0 flex-1 p-3 sm:p-4">
        {app === 'guide' ? (
          // Split screen: the guide on the left, the form being filled in on the right.
          <div className="grid h-full grid-cols-1 gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <Window title="Guide · Manhattan Psychology Group">
              <GuidePane />
            </Window>
            <Window title="Conference Notes Form">
              <NotesFormPane {...notesForm} />
            </Window>
          </div>
        ) : (
          <Window title={current.name}>
            {app === 'case' && <CaseFileApp scenario={scenario} onOpenDocument={openDocument} onOpenGuide={() => open('guide')} />}
            {app === 'records' && (
              <RecordsApp scenario={scenario} selected={doc} onSelect={setDoc} onShow={onShow} onPrint={onPrint} showTo={showTo} />
            )}
            {app === 'mail' && <MailApp scenario={scenario} onOpenDocument={openDocument} />}
            {app === 'chat' && (
              <ChatApp scenario={scenario} busy={busy} onSend={onConsult} onOpenDocument={openDocument} initial={chatWith} />
            )}
            {app === 'notes' && <NotesApp scenario={scenario} teacherName={teacherName} pendingTeacherLine={pendingTeacherLine} />}
          </Window>
        )}

        <AnimatePresence>
          {toast && (
            <motion.button
              type="button"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              onClick={() => {
                open(toast.target)
                setToast(null)
              }}
              className="absolute right-5 top-5 z-20 flex max-w-xs items-center gap-3 rounded-2xl bg-ghost/95 px-4 py-3 text-left font-body text-sm text-coffee shadow-[0_8px_30px_rgba(13,1,6,.35)] ring-2 ring-scarlet"
            >
              <span className="grid size-10 flex-none place-items-center rounded-xl bg-royal text-ghost">
                {toast.target === 'mail' ? <Mail className="size-5" /> : <MessageCircle className="size-5" />}
              </span>
              <span className="font-medium leading-snug">{toast.text}</span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* dock */}
      <div className="flex flex-none justify-center pb-2">
        <nav className="flex gap-1 rounded-2xl bg-ghost/15 p-1.5 backdrop-blur" aria-label="Apps">
          {APPS.map(({ id, name, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => open(id)}
              title={name}
              className={cn(
                'relative flex w-[76px] flex-col items-center gap-1 rounded-xl px-2 py-1.5 font-body text-[10px] text-ghost transition-colors',
                app === id ? 'bg-ghost/20' : 'hover:bg-ghost/10',
              )}
            >
              <span
                className={cn(
                  'grid size-9 place-items-center rounded-xl',
                  id === 'mail' || id === 'chat' ? 'bg-coffee' : id === 'records' ? 'bg-glaucous' : 'bg-ghost text-royal',
                )}
              >
                <Icon className="size-5" />
              </span>
              <span className="truncate">{name}</span>
              {id === 'mail' && unreadMail > 0 && (
                <span className="absolute right-2.5 top-0.5 grid size-4 place-items-center rounded-full bg-scarlet text-[10px] font-bold text-ghost">
                  {unreadMail}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>
    </div>
  )
}

function Window({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl bg-ghost text-coffee shadow-[0_10px_40px_rgba(13,1,6,.35)]">
      <div className="flex h-8 flex-none items-center gap-1.5 border-b border-coffee/10 px-3">
        <span className="size-2.5 rounded-full bg-scarlet" />
        <span className="size-2.5 rounded-full bg-glaucous" />
        <span className="size-2.5 rounded-full bg-royal" />
        <span className="ml-3 truncate font-body text-xs font-semibold text-coffee/60">{title}</span>
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  )
}
