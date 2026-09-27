'use client'

import { useEffect, useRef, useState } from 'react'
import {
  animate,
  motion,
  useInView,
  useMotionValue,
} from 'motion/react'
import { Reveal } from './reveal'

function CountUp({ to, suffix = '' }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-120px' })
  const value = useMotionValue(0)
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (!inView) return
    const controls = animate(value, to, {
      duration: 1.6,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(Math.round(v)),
    })
    return () => controls.stop()
  }, [inView, to, value])

  return (
    <span ref={ref}>
      {display}
      {suffix}
    </span>
  )
}

const stats = [
  {
    value: 32,
    label: 'of teachers said student misbehavior interferes with their instruction.',
  },
  {
    value: 37,
    label: 'cited tardiness and class cutting as getting in the way of teaching.',
  },
]

export function StatsSection() {
  return (
    <section className="relative z-10 border-y border-ghost/10 bg-coffee/60 px-6 py-28 backdrop-blur-sm sm:py-40">
      <div className="mx-auto max-w-5xl">
        <Reveal>
          <h2 className="max-w-3xl text-balance font-display text-3xl font-bold leading-tight text-ghost sm:text-5xl">
            The friction is real — and it&apos;s{' '}
            <span className="text-glaucous">measurable</span>.
          </h2>
        </Reveal>

        <div className="mt-16 grid gap-12 sm:grid-cols-2">
          {stats.map((s, i) => (
            <Reveal key={s.value} delay={i * 0.15}>
              <div>
                <motion.p className="font-display text-7xl font-bold leading-none text-scarlet sm:text-8xl">
                  <CountUp to={s.value} suffix="%" />
                </motion.p>
                <p className="mt-5 max-w-sm font-body text-lg text-ghost/75">
                  {s.label}
                </p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.2}>
          <p className="mt-16 max-w-2xl font-body text-sm text-ghost/45">
            Source: National Center for Education Statistics (NCES),{' '}
            <em>Teachers&apos; Reports of Disruptive Student Behaviors and
            Staff Rule Enforcement.</em> These are the everyday
            attendance, tardiness, and behavior concerns Building Bridges helps
            you talk through with families.
          </p>
        </Reveal>
      </div>
    </section>
  )
}
