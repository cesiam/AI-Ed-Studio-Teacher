'use client'

import { useState } from 'react'
import { Upload } from 'lucide-react'
import type { ScenarioSummary } from '@/lib/api-types'
import { cn } from '@/lib/utils'
import { api } from './api'

/**
 * Lets a teacher add their own scenario: either describe a situation (Claude
 * writes it up with personas and documents) or upload a scenario file in the
 * seed format.
 */
export function ScenarioUpload({ onAdded }: { onAdded: (added: ScenarioSummary[]) => void }) {
  const [open, setOpen] = useState(false)
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  async function upload(body: { json: unknown } | { description: string }) {
    setBusy(true)
    setError(null)
    setDone(null)
    try {
      const { scenarios } = await api.uploadScenario(body)
      setDone(`Added ${scenarios.map((s) => `“${s.title}”`).join(', ')}.`)
      setDescription('')
      onAdded(scenarios)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function onFile(file: File) {
    setError(null)
    const text = await file.text()
    if (file.name.toLowerCase().endsWith('.json')) {
      let json: unknown
      try {
        json = JSON.parse(text)
      } catch {
        setError(`${file.name} isn't valid JSON.`)
        return
      }
      upload({ json })
    } else {
      // A written description: drop it in the box so the teacher can check it first.
      setDescription(text)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 inline-flex items-center gap-2 rounded-full border border-dashed border-ghost/30 px-4 py-2 text-sm text-ghost/75 hover:border-glaucous hover:text-ghost"
      >
        <Upload className="size-4" /> Add your own scenario
      </button>
    )
  }

  return (
    <div className="mt-4 rounded-2xl border border-ghost/15 bg-ghost/[0.04] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-base font-bold">Add your own scenario</h3>
          <p className="mt-0.5 text-sm text-ghost/55">
            Describe a conference you want to practice: the student, the concern, what the parent believes, and anything
            the family isn’t saying. Claude writes the parent, student, colleagues and six documents. Use made-up names.
          </p>
        </div>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-ghost/50 hover:text-ghost">
          Close
        </button>
      </div>

      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={6}
        maxLength={20000}
        disabled={busy}
        placeholder="e.g. Jordan, a 7th grader, has stopped turning in science labs since January. Dad thinks the teacher has it out for Jordan after a seating change. What Dad doesn't know: Jordan has been covering for a friend…"
        className="mt-4 w-full resize-y rounded-xl border border-ghost/15 bg-coffee/60 px-4 py-3 text-[15px] text-ghost placeholder:text-ghost/35 focus:border-glaucous focus:outline-none"
      />

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={busy || description.trim().length < 40}
          onClick={() => upload({ description })}
          className="rounded-full bg-scarlet px-6 py-2.5 font-semibold text-ghost transition-transform enabled:hover:scale-[1.03] disabled:opacity-40"
        >
          {busy ? 'Writing the scenario… (1–2 minutes)' : 'Create scenario'}
        </button>
        <label
          className={cn(
            'cursor-pointer rounded-full border border-ghost/20 px-4 py-2 text-sm text-ghost/75 hover:border-glaucous hover:text-ghost',
            busy && 'pointer-events-none opacity-40',
          )}
        >
          Upload a file (.txt, .md, or scenario .json)
          <input
            type="file"
            accept=".txt,.md,.json,text/plain,text/markdown,application/json"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (file) onFile(file)
            }}
          />
        </label>
      </div>

      {error && <p className="mt-3 whitespace-pre-line rounded-xl border border-scarlet/50 bg-scarlet/10 px-4 py-2 text-sm">{error}</p>}
      {done && <p className="mt-3 text-sm text-glaucous">{done}</p>}
    </div>
  )
}
