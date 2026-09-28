'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useScroll,
  useTransform,
  type MotionValue,
} from 'motion/react'
import { APPLE_PATH, APPLE_VIEWBOX } from './apple-path'
import { HERO_ART_PATHS, STRING_ANCHORS } from './hero-art-paths'

/**
 * One stroke of the hero drawing. It draws in on load, then unravels as the
 * hero scrolls away: the line retracts toward its first point, which for
 * string-tagged strokes is where the falling string pulls it out of the art.
 */
function ArtStroke({
  d,
  index,
  intro,
  progress,
}: {
  d: string
  index: number
  intro: MotionValue<number>
  progress: MotionValue<number>
}) {
  const start = 0.02 + (index % 7) * 0.03
  const end = Math.min(0.8, start + 0.5)
  const remaining = useTransform(progress, [start, end], [1, 0], { clamp: true })
  const length = useTransform([intro, remaining], ([a, r]: number[]) => a * r)
  // A zero-length stroke still paints its round cap as a dot; hide it instead.
  const opacity = useTransform(length, (l) => (l < 0.005 ? 0 : 1))

  return (
    <motion.path
      d={d}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ pathLength: length, opacity }}
    />
  )
}

// The arc: a semicircle that clears the figures' heads (checked against every
// stroke point), with the line of text riding on its outside.
const ARC = { cx: 384, cy: 570, r: 405 }
const ARC_PATH = `M ${ARC.cx - ARC.r} ${ARC.cy} A ${ARC.r} ${ARC.r} 0 0 1 ${ARC.cx + ARC.r} ${ARC.cy}`
const ARC_LENGTH = Math.PI * ARC.r
const ART_VIEWBOX = '-78 112 924 632'

function UnravelingArt({ progress }: { progress: MotionValue<number> }) {
  const intro = useMotionValue(0)
  const arcReveal = useMotionValue(0)
  // The frame goes first as the drawing unravels.
  const frameOpacity = useTransform(progress, [0.05, 0.45], [1, 0])

  useEffect(() => {
    const draw = animate(intro, 1, { delay: 0.4, duration: 2.2, ease: [0.22, 1, 0.36, 1] })
    // The sentence writes itself around the arc, left to right.
    const arc = animate(arcReveal, 1, { delay: 0.9, duration: 1.8, ease: [0.65, 0, 0.35, 1] })
    return () => {
      draw.stop()
      arc.stop()
    }
  }, [intro, arcReveal])

  return (
    <svg viewBox={ART_VIEWBOX} aria-hidden className="h-auto w-full text-ghost">
      <defs>
        <mask id="hero-arc-reveal" maskUnits="userSpaceOnUse">
          <motion.path
            d={ARC_PATH}
            fill="none"
            stroke="#fff"
            strokeWidth={130}
            style={{ pathLength: arcReveal }}
          />
        </mask>
        <path id="hero-arc" d={ARC_PATH} />
      </defs>

      <motion.g style={{ opacity: frameOpacity }}>
        {/* A soft dome behind the family, cut off by the bottom edge. */}
        <circle cx={ARC.cx} cy={ARC.cy + 40} r={ARC.r - 50} className="fill-glaucous/12" />

        <g mask="url(#hero-arc-reveal)">
          <text
            className="fill-current font-display font-extrabold uppercase"
            fontSize={35}
            letterSpacing={2}
          >
            <textPath
              href="#hero-arc"
              startOffset="50%"
              textAnchor="middle"
              textLength={ARC_LENGTH * 0.94}
              lengthAdjust="spacing"
            >
              Teachers bridge a student&apos;s <tspan className="fill-brand">school life</tspan> and{' '}
              <tspan className="fill-scarlet">home life</tspan>
            </textPath>
          </text>
          {/* Small end marks where the sentence meets the ground. */}
          <circle cx={ARC.cx - ARC.r} cy={ARC.cy + 22} r={5} className="fill-scarlet" />
          <circle cx={ARC.cx + ARC.r} cy={ARC.cy + 22} r={5} className="fill-scarlet" />
        </g>
      </motion.g>

      {HERO_ART_PATHS.map((p, i) => (
        <ArtStroke key={i} d={p.d} index={i} intro={intro} progress={progress} />
      ))}
      {/* Where each falling string leaves the drawing; read by FallingStrings. */}
      {STRING_ANCHORS.map(([x, y], i) => (
        <circle key={i} data-string-anchor={i} cx={x} cy={y} r={1} fill="none" />
      ))}
    </svg>
  )
}

/** The one-line apple that bridges the two words; draws in, then unravels. */
function BridgeApple({ progress }: { progress: MotionValue<number> }) {
  const intro = useMotionValue(0)
  const remaining = useTransform(progress, [0.05, 0.5], [1, 0], { clamp: true })
  const length = useTransform([intro, remaining], ([a, r]: number[]) => a * r)
  const opacity = useTransform(length, (l) => (l < 0.003 ? 0 : 1))

  useEffect(() => {
    const controls = animate(intro, 1, { delay: 0.6, duration: 2.4, ease: [0.65, 0, 0.35, 1] })
    return () => controls.stop()
  }, [intro])

  return (
    <svg
      viewBox={APPLE_VIEWBOX}
      aria-hidden
      // Sized to the words and seated on their baseline (see the h1's items-baseline),
      // dropped so the tails meet the g's bowl and the B's stem, and pulled in
      // with negative margins (more on the right, where the B's sidebearing is)
      // so both tails actually touch the letters.
      className="h-[1.1em] w-auto shrink-0 translate-y-[0.22em] text-ghost md:-ml-[0.07em] md:-mr-[0.17em]"
    >
      <motion.path
        d={APPLE_PATH}
        fill="none"
        stroke="currentColor"
        strokeWidth={14}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ pathLength: length, opacity }}
      />
    </svg>
  )
}

/**
 * "Scroll down" with an arrow drawn like the type: the same round-ended
 * strokes as Outfit. The arrow keeps nudging down, stretching as it goes.
 */
function ScrollCue() {
  return (
    <motion.a
      href="#after-hero"
      data-cursor="hover"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 2.4, duration: 0.8 }}
      className="absolute bottom-6 right-6 z-10 hidden flex-col items-center gap-2 text-brand md:flex md:right-10 lg:right-16"
    >
      <span className="text-xs font-semibold uppercase tracking-[0.22em]">Scroll down</span>
      <motion.svg
        viewBox="0 0 24 40"
        aria-hidden
        className="h-10 w-6 overflow-visible"
        animate={{ y: [0, 7, 0] }}
        transition={{ repeat: Infinity, duration: 1.8, ease: [0.45, 0, 0.55, 1] }}
      >
        <motion.path
          d="M12 3 V35"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          animate={{ pathLength: [0.55, 1, 0.55] }}
          transition={{ repeat: Infinity, duration: 1.8, ease: [0.45, 0, 0.55, 1] }}
          style={{ pathOffset: 0 }}
        />
        <path
          d="M4 27 L12 35 L20 27"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </motion.svg>
    </motion.a>
  )
}

function MayaCase() {
  return (
    <>
      <p className="kicker">Case 01 · Chronic absence</p>
      {/* Facts match scenario 01 (content/scenarios.seed.json): 14 absences, a 76% attendance rate, B+ to D. */}
      <p className="mt-5 text-lg leading-relaxed text-ghost/75 lg:text-xl">
        Maya has missed <strong className="font-semibold text-ghost">14 days</strong> since September. At{' '}
        <strong className="font-semibold text-ghost">76% attendance</strong> she&apos;s well under the 90% line
        for chronic absence, and her Algebra grade has slid from a B+ to a D.{' '}
        <strong className="font-semibold text-ghost">But</strong> when she&apos;s here, she&apos;s the first to
        finish the warm-up, and she mentioned walking her little brother to school since her mom started early
        shifts.
      </p>
      <p className="mt-8 font-display text-2xl font-bold leading-snug tracking-[-0.01em] text-ghost lg:text-[1.7rem]">
        How would you share what you see with Maya&apos;s parent?
      </p>
    </>
  )
}

/** Takes Maya's place in the hero after one scroll; on phones it opens the notebook section instead. */
export function InvitationCopy() {
  return (
    <>
      <p className="kicker">Build bridges with parents &amp; students</p>
      <h2 className="mt-5 text-balance font-display text-4xl font-extrabold leading-[1.02] tracking-[-0.03em] text-ghost lg:text-5xl">
        Every hard conversation is really an{' '}
        <span className="marker-underline text-brand">invitation</span>.
      </h2>
      <p className="mt-6 text-lg leading-relaxed text-ghost/75">
        Building Bridges gives you the words for the moments that usually go unsaid. Here&apos;s how a
        concern becomes a conversation.
      </p>
    </>
  )
}

export function Hero() {
  const outerRef = useRef<HTMLElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const { scrollY } = useScroll()
  // On desktop the hero holds still for a stretch of scroll (the pin) while only
  // the text changes. Measured in pixels; 0 on phones, where nothing pins.
  const metrics = useRef({ pin: 0, height: 1 })
  const [swapped, setSwapped] = useState(false)
  // Maya's case waits for the drawing on first load; swaps after that are immediate.
  const revealDelay = useRef(1.6)

  useEffect(() => {
    const t = setTimeout(() => (revealDelay.current = 0), 2500)
    return () => clearTimeout(t)
  }, [])

  useLayoutEffect(() => {
    const measure = () => {
      const outer = outerRef.current
      const inner = innerRef.current
      if (!outer || !inner) return
      metrics.current = {
        pin: Math.max(0, outer.offsetHeight - inner.offsetHeight),
        height: inner.offsetHeight,
      }
    }
    measure()
    const observer = new ResizeObserver(measure)
    if (outerRef.current) observer.observe(outerRef.current)
    if (innerRef.current) observer.observe(innerRef.current)
    return () => observer.disconnect()
  }, [])

  // The first bit of scroll swaps Maya's case for the invitation; back up swaps it back.
  useMotionValueEvent(scrollY, 'change', (s) => {
    const { pin } = metrics.current
    if (pin > 0) setSwapped(s > pin * 0.15)
  })

  // Everything else in the hero (unravel, fades) waits until the pin lets go.
  const progress = useTransform(scrollY, (s) => {
    const { pin, height } = metrics.current
    return Math.min(1, Math.max(0, (s - pin) / height))
  })
  const contentY = useTransform(progress, [0, 1], [0, 120])
  const contentOpacity = useTransform(progress, [0, 0.85], [1, 0])

  return (
    <section ref={outerRef} data-hero-pin className="relative md:h-[145svh]">
      {/* The notebook margin line; it continues down through the next section. */}
      <div aria-hidden className="margin-rule" />

      <div
        ref={innerRef}
        data-hero-inner
        // --wm sizes the wordmark row so drawing + wordmark always fit one screen.
        className="flex min-h-[100svh] flex-col px-6 pb-12 pt-24 [--wm:min(17vw,10svh)] md:sticky md:top-0 md:h-[100svh] md:px-10 md:[--wm:min(8.6vw,14svh)] lg:px-16"
      >
        {/* Building ~apple~ Bridges: the apple's line is the bridge between the words. */}
        <motion.div style={{ opacity: contentOpacity }} className="order-1 md:order-none">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center pb-[0.12em] font-display text-[length:var(--wm)] font-extrabold leading-[0.84] tracking-[-0.045em] text-ghost md:flex-row md:items-baseline md:justify-center"
          >
            <span>Building</span>
            <span className="sr-only"> </span>
            <BridgeApple progress={progress} />
            <span className="text-scarlet">Bridges</span>
          </motion.h1>
        </motion.div>

        {/* On phones the grid dissolves (contents) so everything stacks: wordmark, drawing, case. */}
        <div className="contents md:mt-6 md:grid md:flex-1 md:grid-cols-[auto_minmax(0,24rem)] md:items-center md:justify-center md:gap-12">
          {/* The drawing stays put (no parallax) so the strings stay attached to it. */}
          <div className="order-2 mx-auto mt-8 w-full max-w-xl md:order-none md:mx-0 md:mt-0 md:w-[min(58vw,calc(100vw-35rem),calc((100svh-var(--wm)*1.75-9rem)*1.46))] md:max-w-none">
            <UnravelingArt progress={progress} />
          </div>

          <motion.div style={{ y: contentY, opacity: contentOpacity }} className="order-3 mt-10 md:order-none md:mt-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={swapped ? 'invitation' : 'maya'}
                initial={{ opacity: 0, y: 24 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  transition: { delay: swapped ? 0 : revealDelay.current, duration: 0.6, ease: [0.22, 1, 0.36, 1] },
                }}
                exit={{ opacity: 0, y: -24, transition: { duration: 0.3, ease: [0.4, 0, 1, 1] } }}
                className="mx-auto max-w-md text-center"
              >
                {swapped ? <InvitationCopy /> : <MayaCase />}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </div>

        <ScrollCue />
      </div>
    </section>
  )
}
