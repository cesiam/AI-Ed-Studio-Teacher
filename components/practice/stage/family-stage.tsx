'use client'

import { AnimatePresence, motion } from 'motion/react'
import type { EventView } from '@/lib/api-types'
import { cn } from '@/lib/utils'
import { Face, ProfileFace, type FaceGeometry, type ProfileGeometry } from './face'
import type { Lines, Pose, Speaker } from './use-choreography'

// The illustrations are 768x768. This window crops to the two figures.
// looking-at-each-other.png is drawn ~85px higher than looking-at-teacher.png;
// shifting it down lines the heads and shoulders up so the crossfade reads as a head turn.
const EACH_OTHER_OFFSET_Y = 85
const VIEW = { x: 80, y: 200, w: 610, h: 520 }
const pct = (x: number, y: number) => ({ left: ((x - VIEW.x) / VIEW.w) * 100, top: ((y - VIEW.y) / VIEW.h) * 100 })

// Blank faces in looking-at-teacher.png, measured on the drawing.
const PARENT_FACE: FaceGeometry = {
  eyes: [
    [276, 421],
    [313, 421],
  ],
  browY: 408,
  browLength: 13,
  mouth: { x: 294.5, y: 456, width: 17 },
  scale: 1,
}
const STUDENT_FACE: FaceGeometry = {
  eyes: [
    [468, 468],
    [500, 468],
  ],
  browY: 456,
  browLength: 11,
  mouth: { x: 484, y: 498, width: 13 },
  scale: 0.88,
}

// Blank features in looking-at-each-other-blank.png (image space, before the offset above).
const PARENT_PROFILE: ProfileGeometry = { eye: [344, 328], lips: [356.5, 366.5], corner: [346, 366], scale: 1 }
const STUDENT_PROFILE: ProfileGeometry = { eye: [469, 398], lips: [438.5, 422], corner: [448, 421.5], scale: 0.88 }

/**
 * The parent and student, drawn in the landing page's line style, seated
 * across from the teacher. Crossfades between "looking at the teacher" and
 * "looking at each other"; the front-facing pose gets live faces.
 */
export function FamilyStage({
  tension,
  pose,
  talking,
  lines,
  parentName,
  studentName,
  present,
  conferring,
  staff,
  staffEntering = false,
  demeanor = { parent: { brow: 0, smile: 0 }, student: { brow: 0, smile: 0 } },
}: {
  tension: number
  /** The scenario's resting expressions, layered on top of what tension does. */
  demeanor?: { parent: { brow: number; smile: number }; student: { brow: number; smile: number } }
  pose: Pose
  talking: Speaker | null
  lines: Lines
  parentName: string
  studentName: string
  /** False after a walkout. */
  present: boolean
  /** Waiting on the family's reply. */
  conferring: boolean
  /** A colleague who came into the room: stands to the family's right. */
  staff?: { name: string } | null
  /** They're in the doorway (the entrance plays for a moment). */
  staffEntering?: boolean
}) {
  const t = tension / 100
  // Parent: relaxed and smiling when calm, knitted brows and a frown when heated.
  // The scenario sets where each face rests (see demeanorFor); tension moves it from there.
  const { parent: pd, student: sd } = demeanor
  const parentBrow = clamp(Math.max(-0.15, Math.min(1, (tension - 40) / 50)) + pd.brow, -0.4, 1)
  const parentSmile = clamp(Math.max(-0.9, Math.min(0.8, 0.9 - t * 1.6)) + pd.smile, -1, 0.85)
  // Student: gets worried (inner brows up), not angry, as things heat up.
  const studentBrow = clamp(-Math.max(0, Math.min(0.9, (tension - 35) / 55)) + sd.brow, -1, 0.3)
  const studentSmile = clamp(Math.max(-0.6, Math.min(0.5, 0.55 - t * 1.2)) + sd.smile, -0.8, 0.6)
  // Looking at each other they're family first: a softer version of the same mood.
  const parentGlance = clamp(Math.max(-0.35, Math.min(0.45, 0.5 - t * 0.9)) + pd.smile / 2, -0.5, 0.5)
  const studentGlance = clamp(Math.max(-0.3, Math.min(0.4, 0.45 - t * 0.8)) + sd.smile / 2, -0.45, 0.45)

  const facing = pose === 'teacher'
  const reading = pose === 'docs'

  return (
    <div className="relative h-full max-w-full" style={{ aspectRatio: `${VIEW.w} / ${VIEW.h}` }}>
      <motion.svg
        viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`}
        className="absolute inset-0 h-full w-full overflow-visible"
        role="img"
        aria-label={`${parentName} and ${studentName}, ${facing ? 'looking at you' : reading ? 'reading your laptop' : 'looking at each other'}`}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: present && !reading ? 1 : 0, y: present ? 0 : 40 }}
        transition={{ duration: present ? 0.9 : 1.2, ease: 'easeInOut' }}
      >
        <defs>
          {/* bodies fade out where the desk would be */}
          <linearGradient id="desk-fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0.8" stopColor="#fff" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <mask id="desk-mask" maskUnits="userSpaceOnUse" x={VIEW.x} y={VIEW.y} width={VIEW.w} height={VIEW.h}>
            <rect x={VIEW.x} y={VIEW.y} width={VIEW.w} height={VIEW.h} fill="url(#desk-fade)" />
          </mask>
        </defs>

        <g mask="url(#desk-mask)">
          <g transform={`translate(0 ${EACH_OTHER_OFFSET_Y})`} style={{ opacity: facing ? 0 : 1, transition: 'opacity 420ms ease-in-out' }}>
            <image href="/conference/looking-at-each-other-blank.png" x="0" y="0" width="768" height="768" />
            <ProfileFace geometry={PARENT_PROFILE} smile={parentGlance} />
            <ProfileFace geometry={STUDENT_PROFILE} smile={studentGlance} />
          </g>
          <image
            href="/conference/looking-at-teacher.png"
            x="0"
            y="0"
            width="768"
            height="768"
            style={{ opacity: facing ? 1 : 0, transition: 'opacity 420ms ease-in-out' }}
          />
          <g style={{ opacity: facing ? 1 : 0, transition: 'opacity 320ms ease-in-out' }}>
            <Face geometry={PARENT_FACE} brow={parentBrow} smile={parentSmile} talking={talking === 'parent'} />
            <Face geometry={STUDENT_FACE} brow={studentBrow} smile={studentSmile} talking={talking === 'student'} />
          </g>
        </g>
      </motion.svg>

      {/* the laptop turned around: they lean in and read (a different framing, so it crossfades as a cut) */}
      <motion.img
        src="/conference/looking-at-docs.png"
        alt=""
        aria-hidden
        className="pointer-events-none absolute bottom-[4%] left-1/2 h-[80%] w-auto max-w-none -translate-x-1/2 select-none"
        style={{ maskImage: 'linear-gradient(to bottom, #000 82%, transparent)' }}
        initial={false}
        animate={{ opacity: present && reading ? 1 : 0 }}
        transition={{ duration: 0.45, ease: 'easeInOut' }}
      />

      {/* while they take in what the teacher said */}
      <AnimatePresence>
        {conferring && present && !reading && (
          <motion.div
            className="absolute -translate-x-1/2"
            style={{ left: `${pct(392, 0).left}%`, top: `${pct(0, 318).top}%` }}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.5 }}
            aria-label={`${parentName} and ${studentName} are thinking`}
          >
            <span className="flex gap-1.5 rounded-full border border-ghost/20 bg-ghost/[0.08] px-3.5 py-2.5 backdrop-blur-md">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="size-1.5 rounded-full bg-ghost"
                  animate={{ opacity: [0.25, 1, 0.25] }}
                  transition={{ repeat: Infinity, duration: 1.1, delay: i * 0.18 }}
                />
              ))}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* a colleague who came in: first in the doorway, then standing beside the family */}
      <AnimatePresence>
        {staff && present && (
          <motion.div
            key="staff"
            aria-label={`${staff.name} ${staffEntering ? 'is at the door' : 'is standing in the room'}`}
            className="pointer-events-none absolute bottom-0 left-[94%] h-[110%]"
            style={{ aspectRatio: '300 / 500', maskImage: 'linear-gradient(to bottom, #000 80%, transparent)' }}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
          >
            <img
              src="/conference/at-the-door.png"
              alt=""
              className="absolute inset-0 h-full w-full"
              style={{ opacity: staffEntering ? 1 : 0, transition: 'opacity 700ms ease-in-out' }}
            />
            <img
              src="/conference/staff-standing.png"
              alt=""
              className="absolute"
              style={{
                left: '19%',
                top: '14%',
                width: '61.3%',
                height: '82.4%',
                opacity: staffEntering ? 0 : 1,
                transition: 'opacity 700ms ease-in-out',
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* speech */}
      <Bubble
        line={present ? lines.parent : null}
        name={parentName}
        side="left"
        anchor={pct(212, 300)}
        speaking={talking === 'parent'}
      />
      <Bubble
        line={present ? lines.student : null}
        name={studentName}
        side="right"
        anchor={pct(556, 372)}
        speaking={talking === 'student'}
      />
      {staff && (
        <Bubble
          line={present ? lines.staff : null}
          name={staff.name}
          side="left"
          anchor={{ left: 108, top: 58 }}
          speaking={talking === 'staff'}
          wide
        />
      )}
    </div>
  )
}

/**
 * A speech bubble beside a head. `side="left"` sits to the left of the head
 * (anchored by its right edge) with its tail pointing right, toward the speaker.
 */
function Bubble({
  line,
  name,
  side,
  anchor,
  speaking,
  wide = false,
}: {
  line: EventView | null
  name: string
  side: 'left' | 'right'
  anchor: { left: number; top: number }
  speaking: boolean
  /** Wider and shorter, for a bubble low on the stage. */
  wide?: boolean
}) {
  return (
    <AnimatePresence mode="wait">
      {line && (
        <motion.div
          key={line.id}
          initial={{ opacity: 0, scale: 0.9, x: side === 'left' ? 10 : -10 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 260, damping: 24 }}
          className={cn(
            'absolute z-10 w-max rounded-[22px]',
            wide ? 'max-w-[min(460px,40vw)]' : 'max-w-[min(340px,34vw)]',
            'bg-ghost px-4 py-3 font-body text-coffee shadow-[0_12px_40px_rgba(13,1,6,0.55)]',
            side === 'left' ? 'origin-top-right rounded-tr-md' : 'origin-top-left rounded-tl-md',
          )}
          style={
            side === 'left'
              ? { right: `${100 - anchor.left}%`, top: `${anchor.top}%` }
              : { left: `${anchor.left}%`, top: `${anchor.top}%` }
          }
        >
          <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-brand-inverse">
            {name}
            {speaking && <span className="size-1.5 animate-pulse rounded-full bg-scarlet" aria-hidden />}
          </p>
          <p className="mt-1 text-[15px] leading-snug">{renderStageDirections(line.content)}</p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** "*crosses her arms*" renders as a quiet italic aside. */
function renderStageDirections(text: string) {
  return text.split(/(\*[^*]+\*)/g).map((part, i) =>
    part.startsWith('*') && part.endsWith('*') ? (
      <em key={i} className="text-coffee/60">
        {part.slice(1, -1)}
      </em>
    ) : (
      <span key={i}>{part}</span>
    ),
  )
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}
