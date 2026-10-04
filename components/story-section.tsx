'use client'

import { motion } from 'motion/react'
import { InvitationCopy } from './hero'
import { Reveal } from './reveal'

// The hard things, scattered under the headline like notes on the page.
// Positions are percentages of the word field; rotations tilt them off the lines.
// Spread so no two words touch at any width (checked at 390, 1024 and 1440px).
// Rotation pivots on each word's left edge (originX: 0).
const hardThings = [
  { word: 'chronic absences', left: '0%', top: '62%', rotate: -24 },
  { word: 'cheating', left: '38%', top: '0%', rotate: 0 },
  { word: 'a failing grade', left: '66%', top: '18%', rotate: 30 },
  { word: 'bullying', left: '34%', top: '82%', rotate: 0 },
]

function HardThing({ word, left, top, rotate, index }: (typeof hardThings)[number] & { index: number }) {
  return (
    <motion.span
      data-cursor="hard"
      className="absolute whitespace-nowrap font-display text-xl font-normal text-ghost sm:text-3xl lg:text-4xl"
      style={{ left, top, originX: 0, originY: 0.5 }}
      initial={{ opacity: 0, rotate, y: 16 }}
      whileInView={{ opacity: 1, rotate, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{
        duration: 0.7,
        delay: 0.3 + index * 0.12,
        ease: [0.22, 1, 0.36, 1],
      }}
      // Under the cursor a word straightens up and goes red: you have to face it.
      whileHover={{
        rotate: 0,
        scale: 1.08,
        color: '#ff331f',
        transition: { type: 'spring', stiffness: 260, damping: 16 },
      }}
    >
      {word}
    </motion.span>
  )
}

export function StorySection() {
  return (
    <section
      id="after-hero"
      className="notebook-paper relative z-10 flex min-h-[100svh] flex-col justify-center overflow-hidden py-20 sm:py-28"
    >
      {/* The notebook's red margin line, continuing the one in the hero. One of
          the falling strings rides it (see FallingStrings). */}
      <div aria-hidden data-margin-rail className="margin-rule bg-scarlet!" />
      <p
        aria-hidden
        className="pointer-events-none absolute top-72 hidden origin-top-left -rotate-90 translate-y-full font-body text-[11px] font-semibold uppercase tracking-[0.2em] text-scarlet md:left-[4.25rem] md:block lg:left-[6.75rem]"
      >
        Open case file · 01
      </p>

      <div className="relative mx-auto w-full max-w-7xl px-8 md:pl-24 md:pr-12 lg:pl-32">
        {/* On desktop this copy takes Maya's place in the hero instead. */}
        <Reveal className="mx-auto mb-12 max-w-xl text-center md:hidden">
          <InvitationCopy />
        </Reveal>

        <div className="grid gap-14 md:grid-cols-12 md:gap-10 lg:gap-16">
          <div className="md:col-span-7">
            <Reveal>
              <h2 className="font-display text-4xl font-extrabold leading-[1.02] tracking-[-0.03em] text-ghost sm:text-5xl lg:text-6xl xl:text-[4.25rem]">
                Every teacher eventually sits across from a parent to talk about something{' '}
                <span className="marker-underline text-brand">hard</span>:
              </h2>
            </Reveal>
            <p className="sr-only">chronic absences, bullying, a failing grade, cheating.</p>
            <div aria-hidden className="relative mt-10 h-56 sm:h-72 lg:h-80">
              {hardThings.map((t, i) => (
                <HardThing key={t.word} {...t} index={i} />
              ))}
            </div>
          </div>

          {/* Starts level with the headline. */}
          <div className="flex flex-col gap-6 font-body text-lg leading-relaxed text-ghost/75 md:col-span-5 md:pt-3 lg:text-xl lg:leading-relaxed">
            <div className="space-y-6">
              <Reveal delay={0.1}>
                <p>These conversations shape whether a family trusts the school and whether a student gets support.</p>
              </Reveal>
              <Reveal delay={0.15}>
                <p>
                  Real conferences are messy. Parents push back, new information comes to light, the student speaks up,
                  tension rises. Scripts and role-plays can&apos;t recreate that, so teachers usually face it for the
                  first time with a real family.
                </p>
              </Reveal>
              <Reveal delay={0.2}>
                <p>
                  <span className="font-semibold text-ghost">Building Bridges</span> brings that{' '}
                  <span
                    data-cursor="mess"
                    className="font-semibold text-ghost underline decoration-scarlet decoration-wavy decoration-2 underline-offset-4"
                  >
                    mess
                  </span>{' '}
                  into a controlled space where teachers can feel the pressure, make the call, and try again.
                </p>
              </Reveal>
            </div>
            <Reveal delay={0.25}>
              <p className="font-semibold text-ghost">
                Because a hard conversation is how teachers{' '}
                <span className="marker-underline text-brand">build bridges</span>: connecting families to counselors,
                mental health support, accommodations, and plans that change a student&apos;s year.
              </p>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  )
}
