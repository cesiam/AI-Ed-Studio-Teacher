'use client'

import { useEffect, useState } from 'react'
import { motion, useMotionValue, useSpring } from 'motion/react'

export function CustomCursor() {
  const [enabled, setEnabled] = useState(false)
  const [hovering, setHovering] = useState(false)
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
      setHovering(!!target?.closest('a, button, [data-cursor="hover"]'))
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

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[100]">
      {/* Trailing morphing blob */}
      <motion.div
        className="fixed left-0 top-0 -translate-x-1/2 -translate-y-1/2 bg-[#657ed4] mix-blend-difference"
        style={{ x: bx, y: by }}
        animate={{
          width: hovering ? 56 : 26,
          height: hovering ? 56 : 26,
          borderRadius: hovering
            ? '42% 58% 63% 37% / 41% 44% 56% 59%'
            : '50%',
          rotate: hovering ? 90 : 0,
          opacity: down ? 0.6 : 1,
        }}
        transition={{ type: 'spring', stiffness: 200, damping: 18 }}
      />
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
