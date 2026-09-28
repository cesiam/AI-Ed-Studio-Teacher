'use client'

import { useEffect, useRef, useState } from 'react'
import {
  animate,
  motion,
  useInView,
  useMotionValue,
} from 'motion/react'
import { Reveal } from './reveal'

function CountUp({ to, suffix = '', decimals = 0 }: { to: number; suffix?: string; decimals?: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  // Replays each time the number is well on screen, so it's never missed.
  const inView = useInView(ref, { amount: 0.9, margin: '0px 0px -15% 0px' })
  const value = useMotionValue(0)
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (!inView) {
      value.set(0)
      setDisplay(0)
      return
    }
    const controls = animate(value, to, {
      // Starts once the surrounding Reveal has faded the number in.
      delay: 0.5,
      duration: 2.4,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(v),
    })
    return () => controls.stop()
  }, [inView, to, value])

  return (
    <span ref={ref} className="tabular-nums">
      {display.toFixed(decimals)}
      {suffix}
    </span>
  )
}

// From the project's Stats sheet ("Student is repeatedly absent and missing content").
// Year ranges use a word joiner (\u2060) around the dash so they never break across lines.
const stats = [
  {
    value: 28,
    decimals: 0,
    label: 'of U.S. students were chronically absent in the 2022\u2060–\u206023 school year.',
    source: 'U.S. Department of Education',
  },
  {
    value: 17.1,
    decimals: 1,
    label: 'of Massachusetts students were chronically absent in 2025\u2060–\u206026, down from 22.2% in 2022\u2060–\u206023.',
    source: 'Massachusetts DESE, 2026 release',
  },
]

export function StatsSection() {
  return (
    <section className="relative z-10 border-y border-ghost/10 bg-coffee/60 px-6 py-28 backdrop-blur-sm sm:py-40">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <h2 className="max-w-3xl text-balance font-display text-3xl font-extrabold leading-[1.02] tracking-[-0.03em] text-ghost sm:text-5xl">
            Missed days add up — and it&apos;s{' '}
            <span className="marker-underline text-brand">measurable</span>.
          </h2>
        </Reveal>

        <div className="mt-16 grid gap-12 sm:grid-cols-2">
          {stats.map((s, i) => (
            <Reveal key={s.value} delay={i * 0.15}>
              <div>
                <motion.p className="font-display text-7xl font-extrabold leading-none tracking-[-0.04em] text-scarlet sm:text-8xl">
                  <CountUp to={s.value} decimals={s.decimals} suffix="%" />
                </motion.p>
                <p className="mt-5 max-w-sm font-body text-lg text-ghost/75">
                  {s.label}
                </p>
                <p className="mt-2 font-body text-xs font-semibold uppercase tracking-[0.18em] text-ghost/40">
                  {s.source}
                </p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.2}>
          <blockquote className="mt-20 max-w-3xl border-l-4 border-scarlet pl-6">
            <p className="font-display text-2xl font-bold leading-snug tracking-[-0.01em] text-ghost sm:text-3xl">
              “Chronic absenteeism is the single strongest predictor of dropping out before graduation.”
            </p>
            <footer className="mt-4 font-body text-sm text-ghost/50">
              New Jersey Department of Education. The conversation with a family is where turning it around
              starts.
            </footer>
          </blockquote>
        </Reveal>
      </div>
    </section>
  )
}
