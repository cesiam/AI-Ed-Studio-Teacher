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

// Year ranges use a word joiner (\u2060) around the dash so they never break across lines.
export function StatsSection() {
  return (
    <section className="relative z-10 border-y border-ghost/10 bg-coffee/60 px-6 py-28 backdrop-blur-sm sm:py-40">
      <div className="mx-auto grid max-w-6xl gap-20 lg:grid-cols-2 lg:gap-16">
        {/* Left: why teachers need a place to practice. */}
        <div>
          <Reveal>
            <p className="kicker text-brand">Why practice matters</p>
            <h2 className="mt-5 text-balance font-display text-3xl font-extrabold leading-[1.02] tracking-[-0.03em] text-ghost sm:text-5xl">
              The hardest part of teaching often isn&apos;t the{' '}
              <span className="marker-underline text-brand">lesson</span>.
            </h2>
          </Reveal>

          <Reveal delay={0.15}>
            <div className="mt-14">
              <motion.p className="font-display text-7xl font-extrabold leading-none tracking-[-0.04em] text-scarlet sm:text-8xl">
                <CountUp to={31} suffix="%" />
              </motion.p>
              <p className="mt-5 max-w-md font-body text-lg text-ghost/75">
                of new teachers say communicating with and involving parents is their single greatest challenge,
                ahead of classroom discipline (20%).
              </p>
              <p className="mt-2 font-body text-xs font-semibold uppercase tracking-[0.18em] text-ghost/60">
                MetLife Survey of the American Teacher, 2005
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.25}>
            <p className="mt-10 max-w-md font-body text-lg leading-relaxed text-ghost/75">
              It&apos;s also the area they felt least prepared for in their first year. Teachers rehearse lessons,
              but the first time most practice a hard conference is with a real family, where a misstep costs
              trust.
            </p>
          </Reveal>
        </div>

        {/* Right: what's at stake in Maya's case. */}
        <div className="lg:border-l lg:border-ghost/10 lg:pl-16">
          <Reveal>
            <p className="kicker text-scarlet">Case 01 · Why Maya matters</p>
            <h3 className="mt-5 text-balance font-display text-3xl font-extrabold leading-[1.02] tracking-[-0.03em] text-ghost sm:text-5xl">
              Missed days add up, and it&apos;s{' '}
              <span className="marker-underline text-brand">measurable</span>.
            </h3>
          </Reveal>

          <Reveal delay={0.15}>
            <div className="mt-14">
              <motion.p className="font-display text-7xl font-extrabold leading-none tracking-[-0.04em] text-scarlet sm:text-8xl">
                <CountUp to={28} suffix="%" />
              </motion.p>
              <p className="mt-5 max-w-md font-body text-lg text-ghost/75">
                of U.S. students were chronically absent in the {'2022\u2060–\u206023'} school year. Maya, at 76%
                attendance, is one of them.
              </p>
              <p className="mt-2 font-body text-xs font-semibold uppercase tracking-[0.18em] text-ghost/60">
                U.S. Department of Education
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.25}>
            <blockquote className="mt-10 max-w-md border-l-4 border-scarlet pl-6">
              <p className="font-display text-2xl font-bold leading-snug tracking-[-0.01em] text-ghost">
                “Chronic absenteeism is the single strongest predictor of dropping out before graduation.”
              </p>
              <footer className="mt-4 font-body text-sm text-ghost/60">
                New Jersey Department of Education. The conversation with Maya&apos;s family is where turning it
                around starts.
              </footer>
            </blockquote>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
