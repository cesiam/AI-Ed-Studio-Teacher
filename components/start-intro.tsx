'use client'

import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'

const INTRO =
  "You're about to step into a practice parent-teacher conference as the teacher, facing a real, difficult situation. First, you'll choose the scenario you want to work on."

/** Milliseconds before the next character: a little uneven, with a beat after punctuation, like real typing. */
function delayAfter(ch: string) {
  if (ch === '.') return 420
  if (ch === ',') return 180
  return 22 + Math.random() * 30
}

/**
 * The /start intro types itself out as if written just now; the steps and the
 * button follow once it's done. It always plays in full; Skip intro goes straight to setup.
 */
export function StartIntro({ steps }: { steps: { title: string; body: string }[] }) {
  const reduce = useReducedMotion()
  const [typed, setTyped] = useState(0)
  const done = reduce || typed >= INTRO.length
  const shown = done ? INTRO.length : typed

  useEffect(() => {
    if (done) return
    const t = setTimeout(() => setTyped((n) => n + 1), typed === 0 ? 600 : delayAfter(INTRO[typed - 1]))
    return () => clearTimeout(t)
  }, [typed, done])

  return (
    <>
      <p
        aria-label={INTRO}
        className="mt-10 text-center font-body text-lg leading-relaxed text-ghost/80 sm:text-xl sm:leading-relaxed"
      >
        {/* The whole sentence is laid out from the start (the untyped part is
            transparent), so words never shift as it types. The caret takes no width. */}
        <span aria-hidden>
          {INTRO.slice(0, shown)}
          <span className="relative inline-block w-0">
            <span
              className={`absolute -left-px -bottom-[0.25em] h-[1.1em] w-[2px] bg-scarlet ${done ? 'animate-[caret_1s_linear_3_forwards]' : ''}`}
            />
          </span>
          <span className="text-transparent">{INTRO.slice(shown)}</span>
        </span>
      </p>

      {/* Fades out once the steps appear, but keeps its space so nothing jumps. */}
      <a
        href="/practice"
        data-cursor="hover"
        aria-hidden={done}
        tabIndex={done ? -1 : 0}
        className={`mt-6 rounded-full border border-ghost/20 px-5 py-2 font-body text-sm font-semibold text-ghost/80 transition-[opacity,color,border-color] duration-500 hover:border-glaucous hover:text-ghost ${done ? 'pointer-events-none opacity-0' : ''}`}
      >
        Skip intro
      </a>

      <ol className="mt-12 w-full space-y-8">
        {steps.map((s, i) => (
          <motion.li
            key={s.title}
            initial={false}
            animate={done ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
            transition={{ duration: 0.6, delay: done && !reduce ? 0.25 + i * 0.18 : 0, ease: [0.22, 1, 0.36, 1] }}
            className="grid grid-cols-[3rem_1fr] items-start gap-5"
          >
            <span
              aria-hidden
              className="flex h-12 w-12 items-center justify-center rounded-full bg-glaucous/20 font-display text-lg font-bold text-ghost"
            >
              {i + 1}
            </span>
            <p className="pt-2.5 font-body text-base leading-relaxed text-ghost/75 sm:text-lg sm:leading-relaxed">
              <strong className="font-semibold text-ghost">{s.title}</strong> {s.body}
            </p>
          </motion.li>
        ))}
      </ol>

      <motion.a
        href="/practice"
        data-cursor="hover"
        initial={false}
        animate={done ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
        transition={{ duration: 0.6, delay: done && !reduce ? 0.25 + steps.length * 0.18 : 0, ease: [0.22, 1, 0.36, 1] }}
        className="mt-14 rounded-full bg-scarlet px-8 py-4 font-body text-base font-semibold text-ghost transition-transform hover:scale-[1.03]"
      >
        Choose your scenario
      </motion.a>
    </>
  )
}
