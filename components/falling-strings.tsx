'use client'

import { useRef } from 'react'
import { motion, useScroll, useTransform, type MotionValue } from 'motion/react'

const COLORS = ['#3626a7', '#657ed4', '#ff331f', '#657ed4', '#3626a7']

/**
 * Wavy vertical strings that "fall" like noodles as the page scrolls.
 * Each string's drawn length + downward drift is tied to scroll progress.
 */
function Noodle({
  x,
  color,
  wobble,
  delay,
  progress,
}: {
  x: number
  color: string
  wobble: number
  delay: number
  progress: MotionValue<number>
}) {
  // Each noodle starts drawing at a slightly different point in the scroll.
  const start = delay
  const end = Math.min(1, delay + 0.55)
  const length = useTransform(progress, [start, end], [0, 1], { clamp: true })
  const drift = useTransform(progress, [0, 1], [0, 120 + wobble * 6])
  const sway = useTransform(progress, [0, 1], [0, wobble])

  const d = `M ${x} 0
    C ${x + wobble} 200, ${x - wobble} 380, ${x} 560
    S ${x - wobble} 940, ${x} 1200`

  return (
    <motion.g style={{ y: drift, x: sway }}>
      <motion.path
        d={d}
        stroke={color}
        strokeWidth={6}
        strokeLinecap="round"
        fill="none"
        style={{ pathLength: length }}
      />
    </motion.g>
  )
}

export function FallingStrings() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll()

  const noodles = [
    { x: 140, wobble: 34, delay: 0.02 },
    { x: 360, wobble: -26, delay: 0.1 },
    { x: 620, wobble: 40, delay: 0.16 },
    { x: 900, wobble: -32, delay: 0.06 },
    { x: 1180, wobble: 28, delay: 0.2 },
    { x: 1420, wobble: -38, delay: 0.12 },
  ]

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      <svg
        className="h-full w-full opacity-[0.55]"
        viewBox="0 0 1512 1000"
        preserveAspectRatio="xMidYMin slice"
      >
        {noodles.map((n, i) => (
          <Noodle
            key={i}
            x={n.x}
            wobble={n.wobble}
            delay={n.delay}
            color={COLORS[i % COLORS.length]}
            progress={scrollYProgress}
          />
        ))}
      </svg>
    </div>
  )
}
