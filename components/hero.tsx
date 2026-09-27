'use client'

import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'motion/react'
import { DoodleImage } from './doodle-image'

export function Hero() {
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  })

  const contentY = useTransform(scrollYProgress, [0, 1], [0, 120])
  const contentOpacity = useTransform(scrollYProgress, [0, 0.85], [1, 0])

  return (
    <section
      ref={ref}
      className="relative flex min-h-[100svh] flex-col justify-center px-6 pb-16 pt-20 md:px-10 lg:px-16"
    >
      <motion.div style={{ opacity: contentOpacity }}>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.7 }}
          className="font-body text-xs uppercase tracking-[0.4em] text-glaucous"
        >
          For teachers &amp; the families they serve
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="mt-3 font-display text-[13vw] font-bold leading-[0.85] tracking-tighter text-ghost sm:text-[12vw] lg:text-[9.5vw]"
        >
          Building <span className="text-scarlet">Bridges</span>
        </motion.h1>
      </motion.div>

      <motion.div
        style={{ y: contentY, opacity: contentOpacity }}
        className="mt-6 grid grid-cols-1 items-center gap-6 md:grid-cols-[1.3fr_1fr] md:gap-12"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 1, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full"
        >
          <DoodleImage
            src="/teacher-parent-child.png"
            width={1024}
            height={1024}
            priority
            className="mx-auto h-auto w-full max-w-md lg:max-w-lg"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.7, duration: 0.8 }}
          className="flex flex-col gap-6 font-body text-ghost/80"
        >
          <p className="text-lg leading-relaxed text-ghost">
            Teachers bridge a student&apos;s school life and home life.
          </p>
          <p className="text-base leading-relaxed text-ghost/70">
            Maya has missed 14 days and is falling behind.{' '}
            <span className="font-semibold text-glaucous">BUT</span> when
            she&apos;s here, she&apos;s the first to finish the warm-up, and she
            mentioned walking her little brother to school since her mom started
            early shifts.
          </p>
          <p className="text-lg font-semibold leading-relaxed text-scarlet">
            How would you share what you see with Maya&apos;s parent?
          </p>
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.1, duration: 1 }}
        className="absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2 text-glaucous"
      >
        <span className="font-body text-[10px] uppercase tracking-[0.3em]">
          Scroll — pull the strings
        </span>
        <motion.span
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
          className="block h-8 w-px bg-glaucous/60"
        />
      </motion.div>
    </section>
  )
}
