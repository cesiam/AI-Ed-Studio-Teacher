'use client'

import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'motion/react'
import { DoodleImage } from './doodle-image'

export function FinalSection() {
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end end'],
  })

  // The parent + child walk in from the left, then stride off the right edge.
  const doodleX = useTransform(scrollYProgress, [0, 0.55, 1], ['-30vw', '18vw', '120vw'])
  // A gentle walking bob.
  const doodleY = useTransform(
    scrollYProgress,
    [0, 0.25, 0.5, 0.75, 1],
    [0, -14, 0, -14, 0],
  )
  const ctaOpacity = useTransform(scrollYProgress, [0, 0.25, 0.85, 1], [0, 1, 1, 0])
  const ctaY = useTransform(scrollYProgress, [0, 0.25], [40, 0])

  return (
    <section ref={ref} className="relative z-10 h-[260svh]">
      <div className="sticky top-0 flex h-[100svh] flex-col items-center justify-center overflow-hidden px-6">
        <motion.div
          style={{ opacity: ctaOpacity, y: ctaY }}
          className="relative z-10 text-center"
        >
          <p className="font-body text-xs uppercase tracking-[0.4em] text-glaucous">
            The bridge is built. Now cross it.
          </p>
          <h2 className="mx-auto mt-6 max-w-4xl text-balance font-display text-5xl font-bold leading-[0.95] tracking-tight text-ghost sm:text-7xl md:text-8xl">
            How will you build
            <br />
            <span className="text-scarlet">bridges</span> today?
          </h2>

          <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href="#"
              data-cursor="hover"
              className="rounded-full bg-scarlet px-8 py-4 font-body text-base font-semibold text-ghost transition-transform hover:scale-[1.03]"
            >
              Start a conversation
            </a>
            <a
              href="#"
              data-cursor="hover"
              className="rounded-full border border-glaucous/40 px-8 py-4 font-body text-base font-medium text-ghost/85 transition-colors hover:border-glaucous hover:text-ghost"
            >
              See how it works
            </a>
          </div>
        </motion.div>

        {/* ground line the pair walks along */}
        <div className="pointer-events-none absolute bottom-[18svh] left-0 h-px w-full bg-ghost/15" />

        {/* the walking parent + child */}
        <motion.div
          aria-hidden
          style={{ x: doodleX, y: doodleY }}
          className="pointer-events-none absolute bottom-[15svh] left-0 w-[clamp(200px,30vw,380px)]"
        >
          <DoodleImage
            src="/walking-forward.png"
            width={1152}
            height={768}
            className="h-auto w-full"
          />
        </motion.div>
      </div>
    </section>
  )
}
