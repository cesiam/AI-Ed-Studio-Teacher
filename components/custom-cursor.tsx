'use client'

import { useEffect, useState } from 'react'
import { motion, useMotionValue, useSpring } from 'motion/react'

export function CustomCursor() {
  const [enabled, setEnabled] = useState(false)
  const [mode, setMode] = useState<'idle' | 'hover' | 'hard' | 'mess'>('idle')
  const [down, setDown] = useState(false)

  const x = useMotionValue(-100)
  const y = useMotionValue(-100)

  // Trailing blob lags slightly behind the pointer for a fluid feel.
  const bx = useSpring(x, { stiffness: 220, damping: 22, mass: 0.6 })
  const by = useSpring(y, { stiffness: 220, damping: 22, mass: 0.6 })

  useEffect(() => {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    if (!fine) return

    setEnabled(true)
    document.documentElement.classList.add('has-custom-cursor')

    const move = (e: PointerEvent) => {
      x.set(e.clientX)
      y.set(e.clientY)
      const target = e.target as HTMLElement | null
      if (target?.closest('[data-cursor="hard"]')) setMode('hard')
      else if (target?.closest('[data-cursor="mess"]')) setMode('mess')
      else if (target?.closest('a, button, [data-cursor="hover"]')) setMode('hover')
      else setMode('idle')
    }
    const onDown = () => setDown(true)
    const onUp = () => setDown(false)

    window.addEventListener('pointermove', move)
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('pointerup', onUp)

    return () => {
      document.documentElement.classList.remove('has-custom-cursor')
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
    }
  }, [x, y])

  if (!enabled) return null

  const hovering = mode === 'hover'
  const hard = mode === 'hard'
  const mess = mode === 'mess'
  const spring = { type: 'spring', stiffness: 200, damping: 18 } as const

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[100]">
      {/* Trailing morphing blob. Over a hard thing it turns red, swells and
          keeps wobbling, like tension that won't settle. */}
      <motion.div
        className="fixed left-0 top-0 -translate-x-1/2 -translate-y-1/2 mix-blend-difference"
        style={{ x: bx, y: by }}
        animate={{
          scale: mess ? 0 : 1,
          width: hard ? 84 : hovering ? 56 : 26,
          height: hard ? 84 : hovering ? 56 : 26,
          backgroundColor: hard ? '#ff331f' : '#657ed4',
          borderRadius: hard
            ? [
                '42% 58% 63% 37% / 41% 44% 56% 59%',
                '61% 39% 45% 55% / 57% 36% 64% 43%',
                '38% 62% 56% 44% / 46% 61% 39% 54%',
                '42% 58% 63% 37% / 41% 44% 56% 59%',
              ]
            : hovering
              ? '42% 58% 63% 37% / 41% 44% 56% 59%'
              : '50%',
          rotate: hard ? [0, 8, -6, 0] : hovering ? 90 : 0,
          opacity: down ? 0.6 : 1,
        }}
        transition={
          hard
            ? {
                ...spring,
                borderRadius: { duration: 0.9, repeat: Infinity, ease: 'easeInOut' },
                rotate: { duration: 0.45, repeat: Infinity, ease: 'easeInOut' },
              }
            : spring
        }
      />
      {/* Over "mess" the blob gives way to a tangle of line, drawn like the hero's
          strings, scribbling itself over and over. */}
      <motion.svg
        viewBox="0 0 80 80"
        className="fixed left-0 top-0 h-28 w-28 -translate-x-1/2 -translate-y-1/2 overflow-visible text-[#ff331f]"
        style={{ x: bx, y: by }}
        animate={{ opacity: mess ? 1 : 0, scale: mess ? 1 : 0.4, rotate: mess ? 360 : 0 }}
        transition={{
          opacity: { duration: 0.2 },
          scale: { type: 'spring', stiffness: 260, damping: 18 },
          rotate: mess ? { duration: 6, repeat: Infinity, ease: 'linear' } : { duration: 0 },
        }}
      >
        <motion.path
          d="M18 44 C 10 22, 42 8, 52 24 S 30 60, 22 40 S 58 12, 64 34 S 34 70, 40 46 S 70 46, 58 60 S 14 66, 20 30 S 60 20, 46 52"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={false}
          animate={mess ? { pathLength: [0, 1, 1], pathOffset: [0, 0, 1] } : { pathLength: 0, pathOffset: 0 }}
          transition={mess ? { duration: 1.8, repeat: Infinity, ease: 'easeInOut', times: [0, 0.55, 1] } : { duration: 0.2 }}
        />
      </motion.svg>
      {/* Sharp precise dot */}
      <motion.div
        className="fixed left-0 top-0 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#ff331f]"
        style={{ x, y }}
        animate={{ scale: down ? 2.2 : 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 24 }}
      />
    </div>
  )
}
