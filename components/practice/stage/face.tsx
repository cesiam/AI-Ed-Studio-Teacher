'use client'

import { useEffect, useState } from 'react'
import { motion } from 'motion/react'

const INK = '#fbfbff'

export interface FaceGeometry {
  /** Eye centers, in the drawing's 768x768 coordinate space. */
  eyes: [number, number][]
  browY: number
  browLength: number
  mouth: { x: number; y: number; width: number }
  /** Stroke/size multiplier; the child's features are a little smaller. */
  scale: number
}

/**
 * Line-art features drawn onto a blank face in the illustration: blinking
 * eyes, brows, and a mouth, all in the same Ghost White stroke as the drawing.
 *
 *   brow   -1 worried (inner ends up) .. 0 relaxed .. 1 angry (inner ends down)
 *   smile  -1 frown .. 1 smile
 */
export function Face({
  geometry: g,
  brow,
  smile,
  talking,
}: {
  geometry: FaceGeometry
  brow: number
  smile: number
  talking: boolean
}) {
  const blink = useBlink()
  const s = g.scale
  const rad = (brow * 16 * Math.PI) / 180
  const [[lx, ly], [rx, ry]] = g.eyes
  const half = g.browLength / 2
  const curve = smile * 5 * s

  return (
    <g stroke={INK} fill="none" strokeLinecap="round" strokeWidth={1.5 * s}>
      {/* brows: each pivots on its inner end */}
      {[
        { px: lx + half, dir: -1 },
        { px: rx - half, dir: 1 },
      ].map(({ px, dir }, i) => (
        <motion.line
          key={i}
          initial={false}
          animate={{
            x1: px,
            y1: g.browY,
            x2: px + dir * g.browLength * Math.cos(rad),
            y2: g.browY - g.browLength * Math.sin(rad),
          }}
          transition={{ type: 'spring', stiffness: 90, damping: 14 }}
        />
      ))}

      {/* eyes */}
      {[
        [lx, ly],
        [rx, ry],
      ].map(([x, y], i) => (
        <motion.ellipse
          key={i}
          cx={x}
          cy={y}
          rx={2.9 * s}
          ry={3.9 * s}
          fill={INK}
          stroke="none"
          animate={{ scaleY: blink ? 0.1 : 1 }}
          transition={{ duration: 0.07 }}
          style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
        />
      ))}

      {/* mouth */}
      {talking ? (
        <motion.ellipse
          cx={g.mouth.x}
          cy={g.mouth.y}
          rx={g.mouth.width * 0.32}
          initial={{ ry: 1 }}
          animate={{ ry: [1.2 * s, 4 * s, 1.6 * s, 3.4 * s, 1 * s, 3 * s] }}
          transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
        />
      ) : (
        <motion.path
          initial={false}
          animate={{
            d: `M ${g.mouth.x - g.mouth.width / 2} ${g.mouth.y} Q ${g.mouth.x} ${g.mouth.y + curve} ${g.mouth.x + g.mouth.width / 2} ${g.mouth.y}`,
          }}
          transition={{ type: 'spring', stiffness: 80, damping: 15 }}
        />
      )}
    </g>
  )
}

export interface ProfileGeometry {
  /** Eye center, in the drawing's 768x768 coordinate space. */
  eye: [number, number]
  /** Where the lips meet the profile line, and the inner corner of the mouth at rest. */
  lips: [number, number]
  corner: [number, number]
  scale: number
}

/**
 * Side-view features for the "looking at each other" pose: an eye that blinks
 * and a small mouth whose corner lifts or drops with the mood. The drawing's
 * own brows stay; its baked-in grins were erased so the look can stay natural.
 *
 *   smile  -1 slight frown .. 1 soft smile
 */
export function ProfileFace({ geometry: g, smile }: { geometry: ProfileGeometry; smile: number }) {
  const blink = useBlink()
  const s = g.scale
  const [ex, ey] = g.eye
  const [lx, ly] = g.lips
  const [cx, cy] = g.corner
  const lift = smile * 2.4 * s

  return (
    <g stroke={INK} fill="none" strokeLinecap="round" strokeWidth={1.5 * s}>
      <motion.ellipse
        cx={ex}
        cy={ey}
        rx={2.2 * s}
        ry={3 * s}
        fill={INK}
        stroke="none"
        animate={{ scaleY: blink ? 0.1 : 1 }}
        transition={{ duration: 0.07 }}
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
      />
      <motion.path
        initial={false}
        animate={{ d: `M ${lx} ${ly} Q ${(lx + cx) / 2} ${(ly + cy) / 2 + 0.6 * s} ${cx} ${cy - lift}` }}
        transition={{ type: 'spring', stiffness: 80, damping: 15 }}
      />
    </g>
  )
}

/** Blinks every few seconds, now and then twice in a row, like a person does. */
function useBlink() {
  const [closed, setClosed] = useState(false)
  useEffect(() => {
    let alive = true
    const timers: ReturnType<typeof setTimeout>[] = []
    const later = (fn: () => void, ms: number) => timers.push(setTimeout(() => alive && fn(), ms))
    const blinkOnce = (then: () => void) => {
      setClosed(true)
      later(() => {
        setClosed(false)
        then()
      }, 130)
    }
    const schedule = () =>
      later(() => {
        const double = Math.random() < 0.2
        blinkOnce(() => (double ? later(() => blinkOnce(schedule), 180) : schedule()))
      }, 2200 + Math.random() * 3800)
    schedule()
    return () => {
      alive = false
      timers.forEach(clearTimeout)
    }
  }, [])
  return closed
}
