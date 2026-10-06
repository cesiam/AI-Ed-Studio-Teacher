'use client'

/** Where the teacher's own notes live in the notes record (saved with the session, shown in history). */
export const MY_NOTES_KEY = 'my_notes'
export const MY_NOTES_MAX = 8000

/** A blank page for the teacher's own notes: questions to ask, things to remember, what they noticed. Saves as they type. */
export function MyNotesApp({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="flex h-full flex-col px-6 py-5 font-body">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-coffee/60">My notes</p>
        <p className="text-xs text-coffee/60">Only you see these. They save as you type.</p>
      </div>
      <label htmlFor="my-notes" className="sr-only">
        My notes
      </label>
      <textarea
        id="my-notes"
        value={value}
        maxLength={MY_NOTES_MAX}
        onChange={(e) => onChange(e.target.value)}
        placeholder={'Questions to ask, things to remember, what you noticed…\n\n• \n• '}
        className="mt-3 min-h-0 flex-1 resize-none rounded-xl border border-coffee/15 bg-transparent px-4 py-3 text-[15px] leading-relaxed text-coffee placeholder:text-coffee/55 focus:border-glaucous focus:outline-none"
      />
    </div>
  )
}
