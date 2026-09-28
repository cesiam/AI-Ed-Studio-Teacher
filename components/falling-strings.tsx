'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { motion, useScroll, useTransform, type MotionValue } from 'motion/react'
import { STRING_DOODLES } from './string-doodles'

const COLORS = ['#ff331f', '#3626a7', '#657ed4', '#ff331f', '#3626a7', '#657ed4']

// Where each string settles across the page width, left to right.
const COLUMNS = [0.09, 0.24, 0.41, 0.6, 0.78, 0.94]
const WOBBLES = [34, -26, 40, -32, 28, -38]
const SPEEDS = [1.9, 1.6, 2.1, 1.7, 2, 1.5]

// The string that becomes the notebook section's red margin line.
const RAIL_STRING = 0
// The string that ends in the backpack instead of a loose tail.
const CHARM_STRING = 4

type Point = { x: number; y: number }
type Rail = { x: number; top: number; bottom: number }
type Layout = {
  width: number
  height: number
  vh: number
  anchors: Point[]
  rail: Rail | null
  /** Top of the closing section; strings hang just past it so they never cross the walkers. */
  hangAt: number
  /** How far the page scrolls while the hero holds still; strings wait for it. */
  pin: number
}
/** How a string ends: a loose tail with a knot, or a drawing hanging from it. */
type Ending = { kind: 'tail'; d: string; knot: Point } | { kind: 'charm'; d: string }

/** Moves every absolute coordinate pair in an M/L/C path. */
function placePath(d: string, dx: number, dy: number, scale: number) {
  let i = 0
  return d.replace(/-?\d+(\.\d+)?/g, (n) => {
    const v = Number(n) * scale + (i++ % 2 === 0 ? dx : dy)
    return v.toFixed(1)
  })
}

/** Builds a string's path from its anchor in the hero art down to where it hangs. */
function buildPath(i: number, layout: Layout) {
  const { width, anchors, rail, hangAt, vh } = layout
  const { x: ax, y: ay } = anchors[i]
  const tx = COLUMNS[i % COLUMNS.length] * width
  const wobble = WOBBLES[i % WOBBLES.length]
  const step = 520

  let d = `M ${ax} ${ay}`
  let y = ay

  // Swing out of the drawing, either to the notebook margin or the column.
  if (i === RAIL_STRING && rail && rail.bottom > ay) {
    // Step straight onto the margin line just below the drawing, then ride it
    // (hidden under the solid red) to the bottom of the notebook section.
    const join = ay + 90
    d += ` C ${ax} ${ay + 45}, ${rail.x} ${ay + 45}, ${rail.x} ${join}`
    d += ` L ${rail.x} ${rail.bottom}`
    d += ` C ${rail.x} ${rail.bottom + 160}, ${tx} ${rail.bottom + 160}, ${tx} ${rail.bottom + 320}`
    y = rail.bottom + 320
  } else {
    d += ` C ${ax} ${ay + 160}, ${tx} ${ay + 240}, ${tx} ${ay + 420}`
    y = ay + 420
  }

  // Fall to the hang point, staggered a little per string.
  const end = hangAt + vh * (0.08 + (i % 3) * 0.05)
  let flip = 1
  let wobbled = false
  for (; y + step < end; flip *= -1) {
    d += ` S ${tx - wobble * flip} ${y + step / 2}, ${tx} ${y + step}`
    y += step
    wobbled = true
  }
  // Ease into the hang point. Mirroring a full-size control point here would
  // overshoot on a short last stretch and loop, so scale it to what's left.
  const rest = end - y
  const lead = wobbled ? (wobble * -flip * rest) / step : 0
  d += ` C ${tx + lead} ${y + rest / 3}, ${tx} ${end - rest / 3}, ${tx} ${end}`

  let ending: Ending
  if (i === CHARM_STRING) {
    // The backpack hangs by its handle (the drawing's first point) from the string's end.
    const art = STRING_DOODLES.backpack
    const scale = Math.min(1.1, Math.max(0.6, width / 1300))
    const left = Math.min(width - art.w * scale - 16, Math.max(16, tx - art.start[0] * scale))
    const top = end - art.start[1] * scale
    ending = { kind: 'charm', d: placePath(art.d, left, top, scale) }
  } else {
    const sway = (i % 2 === 0 ? 1 : -1) * 14
    const len = 110 + (i % 3) * 30
    ending = {
      kind: 'tail',
      d: `M ${tx} ${end} C ${tx} ${end + len * 0.4}, ${tx + sway} ${end + len * 0.7}, ${tx + sway * 0.4} ${end + len}`,
      knot: { x: tx + sway * 0.4, y: end + len },
    }
  }
  return { d, ending }
}

type Tip = (scroll: number) => number

/**
 * For each point along a path, the lowest height reached so far. Looking up
 * the string's tip in it gives how much of the path to show, so lines sketch
 * themselves as the tip passes down through them.
 */
function useDrawTable(ref: React.RefObject<SVGPathElement | null>, d: string) {
  const table = useRef<Float32Array | null>(null)
  useLayoutEffect(() => {
    const path = ref.current
    if (!path) return
    const total = path.getTotalLength()
    const samples = Math.max(1, Math.ceil(total / 6))
    const ys = new Float32Array(samples + 1)
    let low = -Infinity
    for (let k = 0; k <= samples; k++) {
      low = Math.max(low, path.getPointAtLength((k / samples) * total).y)
      ys[k] = low
    }
    table.current = ys
  }, [ref, d])
  return table
}

function drawnFraction(ys: Float32Array | null, tip: number) {
  if (!ys) return 0
  // Binary search the first sample that reaches below the tip.
  let lo = 0
  let hi = ys.length - 1
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (ys[mid] > tip) hi = mid
    else lo = mid + 1
  }
  return lo / (ys.length - 1)
}

const strokeProps = {
  strokeWidth: 3.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  fill: 'none',
} as const

/**
 * A string's end, drawn as the tip arrives and then left swaying gently from
 * where it hangs: a loose tail finished with a knot, or the backpack.
 */
function HangingEnd({
  ending,
  color,
  tip,
  index,
  scrollY,
}: {
  ending: Ending
  color: string
  tip: Tip
  index: number
  scrollY: MotionValue<number>
}) {
  const ref = useRef<SVGPathElement>(null)
  const table = useDrawTable(ref, ending.d)
  const length = useTransform(scrollY, (s) => drawnFraction(table.current, tip(s)))
  const opacity = useTransform(length, (l) => (l < 0.003 ? 0 : 1))
  const knot = useTransform(length, (l) => (l > 0.97 ? 1 : 0))
  const charm = ending.kind === 'charm'

  return (
    <motion.g
      style={{ originX: 0.5, originY: 0 }}
      animate={{ rotate: charm ? [-1.2, 1.2, -1.2] : [-2.5, 2.5, -2.5] }}
      transition={{ duration: (charm ? 4.6 : 3.4) + (index % 3) * 0.5, repeat: Infinity, ease: 'easeInOut' }}
    >
      <motion.path ref={ref} d={ending.d} stroke={color} {...strokeProps} style={{ pathLength: length, opacity }} />
      {ending.kind === 'tail' && (
        <motion.circle cx={ending.knot.x} cy={ending.knot.y} r={5} fill={color} style={{ opacity: knot }} />
      )}
    </motion.g>
  )
}

/**
 * A string pulled out of the hero drawing. Its tip races ahead of the scroll
 * at first, then settles just above the viewport's bottom edge.
 */
function Noodle({
  index,
  layout,
  scrollY,
}: {
  index: number
  layout: Layout
  scrollY: MotionValue<number>
}) {
  const ref = useRef<SVGPathElement>(null)
  const { d, ending } = useMemo(() => buildPath(index, layout), [index, layout])
  const table = useDrawTable(ref, d)
  const { vh } = layout
  const ay = layout.anchors[index].y
  const speed = SPEEDS[index % SPEEDS.length]
  const { pin } = layout
  // Nothing falls while the hero holds still; after that the tip leads the scroll.
  const tip = useCallback<Tip>(
    (s) => (s <= pin ? -Infinity : Math.min(ay + (s - pin) * speed, s + vh * 0.85)),
    [ay, speed, vh, pin],
  )
  const color = COLORS[index % COLORS.length]

  // Nothing shows until the strings start falling, not even a round-cap dot.
  const length = useTransform(scrollY, (s) => (s <= pin + 1 ? 0 : drawnFraction(table.current, tip(s))))
  const opacity = useTransform(length, (l) => (l < 0.001 ? 0 : 1))

  return (
    <>
      <motion.path ref={ref} d={d} stroke={color} {...strokeProps} style={{ pathLength: length, opacity }} />
      <HangingEnd ending={ending} color={color} tip={tip} index={index} scrollY={scrollY} />
    </>
  )
}

export function FallingStrings() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollY } = useScroll()
  const [layout, setLayout] = useState<Layout | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const measure = () => {
      const box = el.getBoundingClientRect()
      // The hero is sticky while it holds, so place anchors where the drawing
      // sits once it lets go, whatever the current scroll.
      const outer = document.querySelector<HTMLElement>('[data-hero-pin]')
      const inner = document.querySelector<HTMLElement>('[data-hero-inner]')
      const pin = outer && inner ? Math.max(0, outer.offsetHeight - inner.offsetHeight) : 0
      const innerTop = inner?.getBoundingClientRect().top ?? 0
      const releasedTop = outer ? outer.getBoundingClientRect().top - box.top + pin : 0
      const anchors = Array.from(document.querySelectorAll<SVGElement>('[data-string-anchor]'))
        .sort((a, b) => Number(a.dataset.stringAnchor) - Number(b.dataset.stringAnchor))
        .map((a) => {
          const r = a.getBoundingClientRect()
          const cy = r.top + r.height / 2
          return { x: r.left + r.width / 2 - box.left, y: inner ? releasedTop + (cy - innerTop) : cy - box.top }
        })
      const r = document.querySelector('[data-margin-rail]')?.getBoundingClientRect()
      const rail = r ? { x: r.left + r.width / 2 - box.left, top: r.top - box.top, bottom: r.bottom - box.top } : null
      const closing = document.querySelector('[data-strings-hang]')?.getBoundingClientRect()
      const hangAt = closing ? closing.top - box.top : box.height * 0.7
      setLayout({ width: box.width, height: box.height, vh: window.innerHeight, anchors, rail, hangAt, pin })
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    window.addEventListener('resize', measure)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [])

  return (
    <div ref={ref} aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {layout && (
        <svg
          className="opacity-[0.6]"
          width={layout.width}
          height={layout.height}
          viewBox={`0 0 ${layout.width} ${layout.height}`}
        >
          {layout.anchors.map((_, i) => (
            <Noodle key={i} index={i} layout={layout} scrollY={scrollY} />
          ))}
        </svg>
      )}
    </div>
  )
}
