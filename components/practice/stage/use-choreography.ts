'use client'

import { useEffect, useRef, useState } from 'react'
import type { EventView } from '@/lib/api-types'

export type Pose = 'teacher' | 'each-other' | 'docs'
export type Speaker = 'parent' | 'student' | 'staff'
export type Lines = Record<Speaker, EventView | null>
const NO_LINES: Lines = { parent: null, student: null, staff: null }

/** How long mother and child look at each other before she answers: a real beat, longer as tension climbs (max 2s). */
const GLANCE_MIN_MS = 1500
const GLANCE_MAX_MS = 2000
/** A rise this big (or bigger) earns the full glance. */
const GLANCE_FULL_RISE = 8
const TURN_BACK_MS = 380
/** How long a colleague stands in the doorway before speaking. Matches the stage's entrance. */
export const ENTRANCE_MS = 2200
/** After being shown a document, they finish reading before looking up to answer. */
const FINISH_READING_MS = 1200

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

function glanceMs(rise: number) {
  const t = Math.max(0, Math.min(1, rise / GLANCE_FULL_RISE))
  return GLANCE_MIN_MS + t * (GLANCE_MAX_MS - GLANCE_MIN_MS)
}

/** Rough speaking time so the mouth moves about as long as the line would take to say. */
function talkMs(text: string) {
  const words = text.replace(/\*[^*]+\*/g, '').split(/\s+/).filter(Boolean).length
  return Math.min(3500, Math.max(1100, words * 240))
}

const isLine = (e: EventView) => e.kind === 'parent' || e.kind === 'student' || e.kind === 'staff'

/**
 * Stages what the family does between the teacher's turns:
 *
 *   teacher speaks  -> bubbles clear; the family keeps facing the teacher while they think
 *   reply arrives   -> if the teacher mentioned the child by name, the mother glances at
 *                      them first (1.5-2s, longer the more tension rose), then turns back;
 *                      she speaks: bubble appears, mouth moves
 *   student line    -> the child speaks after the mother finishes
 *
 * The opening line (turn 0) has no glance: nobody has said anything to react to yet.
 *
 * `reading` is true while the teacher has the laptop turned toward the family:
 * they look at the screen (pose "docs") until their answer comes, finish
 * reading, then look up and answer without the glance.
 *
 * `settled` is false while a sequence is playing, so the page can hold back
 * things like the debrief or a surprise notification until the family is done.
 */
export function useChoreography(events: EventView[], waiting: boolean, reading = false, studentName = '') {
  const [pose, setPose] = useState<Pose>('teacher')
  const [talking, setTalking] = useState<Speaker | null>(null)
  const [lines, setLines] = useState<Lines>(() => lastTurnLines(events))
  const [settled, setSettled] = useState(true)

  const processed = useRef(Math.max(0, ...events.map((e) => e.id)))
  const run = useRef(0)
  const playing = useRef(false)
  const readingRef = useRef(reading)
  readingRef.current = reading

  // The teacher just spoke (or invited them in): clear the old lines and listen.
  useEffect(() => {
    if (!waiting) return
    setLines(NO_LINES)
    setTalking(null)
    if (!readingRef.current) setPose('teacher')
  }, [waiting])

  // The laptop turns toward the family, or back (the teacher changed their mind).
  useEffect(() => {
    if (reading) {
      setTalking(null)
      setLines(NO_LINES)
      setPose('docs')
      return
    }
    const t = setTimeout(() => {
      if (!playing.current) setPose((p) => (p === 'docs' ? 'teacher' : p))
    }, 300)
    return () => clearTimeout(t)
  }, [reading])

  useEffect(() => {
    const incoming = events.filter((e) => e.id > processed.current)
    processed.current = Math.max(processed.current, ...events.map((e) => e.id))
    const fresh = incoming.filter(isLine)
    if (fresh.length === 0) return

    const tension = incoming.find((e) => e.kind === 'tension')
    const rise = Math.max(0, Number(tension?.meta?.change ?? 0))
    const wasShown = incoming.some((e) => e.kind === 'teacher' && e.meta?.shown)
    // They only turn to each other when the child comes up.
    const kid = studentName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const childMentioned =
      !!kid && incoming.some((e) => e.kind === 'teacher' && new RegExp(`\\b${kid}\\b`, 'i').test(e.content))
    const someoneWalkedIn = incoming.some((e) => e.kind === 'system' && e.meta?.joined)
    const token = ++run.current
    const alive = () => run.current === token
    playing.current = true
    setSettled(false)

    ;(async () => {
      let first = true
      // Let them come through the door before they say hello.
      if (someoneWalkedIn) await wait(ENTRANCE_MS)
      for (const line of fresh) {
        if (!alive()) return
        if (first && wasShown) {
          // They were reading the laptop: finish, then look up at the teacher.
          await wait(FINISH_READING_MS)
          if (!alive()) return
          setPose('teacher')
          await wait(TURN_BACK_MS)
          if (!alive()) return
        }
        if (line.kind === 'parent') {
          if (first && line.turn > 0 && !wasShown && childMentioned) {
            // A quick look at her child before she answers the teacher.
            setPose('each-other')
            await wait(glanceMs(rise))
            if (!alive()) return
            setPose('teacher')
            await wait(TURN_BACK_MS)
            if (!alive()) return
          }
          setLines((cur) => ({ ...(first ? NO_LINES : cur), parent: line }))
          setTalking('parent')
          await wait(talkMs(line.content))
        } else {
          const who = line.kind as 'student' | 'staff'
          setPose('teacher')
          setLines((cur) => ({ ...(first ? NO_LINES : cur), [who]: line }))
          setTalking(who)
          await wait(talkMs(line.content))
        }
        first = false
        if (!alive()) return
        setTalking(null)
        await wait(250)
      }
      if (alive()) {
        playing.current = false
        setSettled(true)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events])

  return { pose, talking, lines, settled }
}

/** On page load, show what was said on the most recent turn, without replaying it. */
function lastTurnLines(events: EventView[]): Lines {
  const said = events.filter(isLine)
  const latest = Math.max(-1, ...said.map((e) => e.turn))
  const at = (kind: Speaker) => [...said].reverse().find((e) => e.kind === kind && e.turn === latest) ?? null
  return { parent: at('parent'), student: at('student'), staff: at('staff') }
}
