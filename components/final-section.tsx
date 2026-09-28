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
  // The headline fades with the walk; the buttons stay so there's always a way in.
  const headlineOpacity = useTransform(scrollYProgress, [0, 0.25, 0.85, 1], [0, 1, 1, 0])
  const ctaY = useTransform(scrollYProgress, [0, 0.25], [40, 0])
  // Buttons arrive with the headline, then stay once it fades. A function
  // transform keeps this off the accelerated scroll timeline, which drops the
  // value once the page scrolls past the section's end.
  const buttonsOpacity = useTransform(scrollYProgress, (p) => Math.min(1, Math.max(0, p / 0.25)))

  return (
    <section ref={ref} data-strings-hang className="relative z-10 h-[260svh]">
      <div className="sticky top-0 flex h-[100svh] flex-col items-center justify-center overflow-hidden px-6">
        <div className="relative z-10 text-center">
          <motion.div style={{ opacity: headlineOpacity, y: ctaY }}>
            <p className="kicker">
              The bridge is built. Now cross it.
            </p>
            <h2 className="mx-auto mt-6 max-w-4xl text-balance font-display text-5xl font-extrabold leading-[0.95] tracking-[-0.035em] text-ghost sm:text-7xl md:text-8xl">
              How will you build
              <br />
              <span className="marker-underline text-brand">bridges</span> today?
            </h2>
          </motion.div>

          <motion.div
            style={{ opacity: buttonsOpacity, y: ctaY }}
            className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <a
              href="/practice"
              data-cursor="hover"
              className="rounded-full bg-scarlet px-8 py-4 font-body text-base font-semibold text-ghost transition-transform hover:scale-[1.03]"
            >
              Start a conversation
            </a>
            <a
              href="#features"
              data-cursor="hover"
              className="rounded-full border border-glaucous/40 px-8 py-4 font-body text-base font-semibold text-ghost/85 transition-colors hover:border-glaucous hover:text-ghost"
            >
              See how it works
            </a>
          </motion.div>
        </div>

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
