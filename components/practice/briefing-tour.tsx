'use client'

import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'

const TOUR_KEY = 'bb-briefing-tour'

/** Whether this browser has finished or skipped the laptop tour. */
export function tourDone() {
  try {
    return localStorage.getItem(TOUR_KEY) === 'done'
  } catch {
    return false
  }
}

function markTourDone() {
  try {
    localStorage.setItem(TOUR_KEY, 'done')
  } catch {}
}

/** Each step spotlights the element tagged data-tour="<target>". */
const STEPS: { target: string; title: string; body: string }[] = [
  {
    target: 'laptop',
    title: 'This is your work laptop',
    body: 'Everything you need before the family arrives is here. Switch between apps with the dock along the bottom.',
  },
  {
    target: 'app-case',
    title: 'Case File',
    body: 'Why this meeting was called, who is coming, and links to every document in the student’s file.',
  },
  {
    target: 'app-records',
    title: 'StudentView',
    body: 'The student’s records: attendance, grades and notes. During the conference you can show a document to the family or print them a copy.',
  },
  {
    target: 'app-guide',
    title: 'Guide & Form',
    body: 'The conference guide beside your notes form, including the two-week action plan. It helps structure the conversation, but you don’t have to complete it.',
  },
  {
    target: 'app-chat',
    title: 'PFPS Chat',
    body: 'Need a second opinion? Message the counselor, nurse, principal or a colleague for quick advice, before or during the conference.',
  },
  {
    target: 'app-mail',
    title: 'PFPS Mail',
    body: 'Keep an eye on your inbox. New information can arrive while the conference is under way.',
  },
  {
    target: 'app-notes',
    title: 'Transcript',
    body: 'A running record of everything said once the family sits down.',
  },
  {
    target: 'app-mynotes',
    title: 'My Notes',
    body: 'A blank page for your own notes: questions to ask, things to remember. It saves as you type and stays with this session.',
  },
  {
    target: 'coach',
    title: 'Coach tips',
    body: 'After each exchange, the coach suggests a direction to move in. The words are yours. Turn it off here if you’d rather go it alone.',
  },
  {
    target: 'invite',
    title: 'Invite them in',
    body: 'When you’re ready, bring the family in. You can end the conference once you and the parent reach some kind of agreement.',
  },
]

type Box = { x: number; y: number; w: number; h: number }
const PAD = 8
const RADIUS = 16
const CARD_W = 340

function measure(target: string): Box | null {
  const el = document.querySelector(`[data-tour="${target}"]`)
  if (!el) return null
  const r = el.getBoundingClientRect()
  return { x: r.left - PAD, y: r.top - PAD, w: r.width + PAD * 2, h: r.height + PAD * 2 }
}

/** A rounded-rect hole cut out of a full-screen rect (even-odd fill). */
function holePath(b: Box, vw: number, vh: number) {
  const r = Math.min(RADIUS, b.w / 2, b.h / 2)
  const { x, y, w, h } = b
  return (
    `M0 0H${vw}V${vh}H0Z ` +
    `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}` +
    `H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`
  )
}

/**
 * First-time walkthrough of the briefing laptop. A translucent grey layer covers
 * the page and blocks it; only the highlighted feature stays lit and clickable.
 */
export function BriefingTour({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState(0)
  const [box, setBox] = useState<Box | null>(null)
  const [vp, setVp] = useState({ w: 0, h: 0 })

  const current = STEPS[step]

  useLayoutEffect(() => {
    if (!open) return
    const update = () => {
      setVp({ w: window.innerWidth, h: window.innerHeight })
      setBox(measure(current.target))
    }
    update()
    // Layout can shift as the laptop's apps load; keep the spotlight on target.
    const t = setInterval(update, 400)
    window.addEventListener('resize', update)
    return () => {
      clearInterval(t)
      window.removeEventListener('resize', update)
    }
  }, [open, current.target])

  const finish = useCallback(() => {
    markTourDone()
    setStep(0)
    onClose()
  }, [onClose])

  const next = useCallback(() => (step === STEPS.length - 1 ? finish() : setStep(step + 1)), [step, finish])
  const back = useCallback(() => setStep((s) => Math.max(0, s - 1)), [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish()
      else if (e.key === 'ArrowRight') next()
      else if (e.key === 'ArrowLeft') back()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, next, back, finish])

  if (!open || !vp.w) return null

  // The card sits below the spotlight when there's room, otherwise above it.
  const cardW = Math.min(CARD_W, vp.w - 32)
  let cardStyle: React.CSSProperties = { left: (vp.w - cardW) / 2, top: vp.h / 2 - 100, width: cardW }
  if (box) {
    const left = Math.min(vp.w - cardW - 16, Math.max(16, box.x + box.w / 2 - cardW / 2))
    const below = box.y + box.h + 14
    const fitsBelow = below + 220 < vp.h
    // A spotlight taller than most of the screen (the whole laptop): float the card over its middle.
    const huge = box.h > vp.h * 0.6
    cardStyle = huge
      ? { left: (vp.w - cardW) / 2, top: box.y + box.h / 2 - 90, width: cardW }
      : fitsBelow
        ? { left, top: below, width: cardW }
        : { left, bottom: vp.h - box.y + 14, width: cardW }
  }

  return (
    <div className="fixed inset-0 z-[90]" role="dialog" aria-modal="true" aria-label="Laptop tour">
      <svg className="absolute inset-0 h-full w-full" width={vp.w} height={vp.h} aria-hidden>
        <path
          d={box ? holePath(box, vp.w, vp.h) : `M0 0H${vp.w}V${vp.h}H0Z`}
          fillRule="evenodd"
          className="fill-[rgba(13,1,6,0.58)] [transition:d_.35s_cubic-bezier(.22,1,.36,1)]"
        />
      </svg>
      {box && (
        <div
          aria-hidden
          className="pointer-events-none absolute rounded-2xl ring-2 ring-scarlet transition-all duration-300"
          style={{ left: box.x, top: box.y, width: box.w, height: box.h }}
        />
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="absolute rounded-2xl bg-[#fbfbff] p-5 font-body text-[#0d0106] shadow-[0_18px_50px_rgba(13,1,6,.35)]"
          style={cardStyle}
        >
          <p className="text-xs font-semibold text-[#3626a7]">
            {step + 1} of {STEPS.length}
          </p>
          <h2 className="mt-1 font-display text-xl font-bold leading-tight">{current.title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-[#0d0106]/75">{current.body}</p>
          <div className="mt-5 flex items-center justify-between gap-3">
            <button type="button" onClick={finish} className="text-sm text-[#0d0106]/55 underline-offset-4 hover:underline">
              Skip tutorial
            </button>
            <div className="flex gap-2">
              {step > 0 && (
                <button
                  type="button"
                  onClick={back}
                  className="rounded-full border border-[#0d0106]/15 px-4 py-2 text-sm font-semibold hover:border-[#0d0106]/35"
                >
                  Back
                </button>
              )}
              <button
                type="button"
                onClick={next}
                autoFocus
                className="rounded-full bg-scarlet px-5 py-2 text-sm font-semibold text-[#fbfbff] transition-transform hover:scale-[1.03]"
              >
                {step === STEPS.length - 1 ? 'Got it' : 'Next'}
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
