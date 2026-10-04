import { GAME } from '../config'
import type { Mood, SessionConfig } from './planner'

export const MAX_TENSION = 100

/** Where the meter starts and the band it's allowed to move in. Only a band that reaches 100 allows a walkout. */
export interface TensionRange {
  start: number
  min: number
  max: number
}

export function moodStart(mood: Mood): number {
  return GAME.moodStart[mood]
}

/** Sessions created before ranges existed start at their mood and use the full meter. */
export function tensionRange(config: SessionConfig): TensionRange {
  const r = config.tension ?? { start: moodStart(config.starting_mood), min: GAME.minTension, max: MAX_TENSION }
  // Older sessions may have allowed lower; nobody drops below guarded now.
  const min = Math.max(GAME.minTension, r.min)
  return { min, max: Math.max(r.max, min + 10), start: Math.max(min, r.start) }
}

/** The mood label closest to a starting tension, for display and older code paths. */
export function moodFor(start: number): Mood {
  return start < 33 ? 'calm' : start < 58 ? 'tense' : 'heated'
}

export function applyChange(tension: number, change: number, range: TensionRange): { after: number; change: number } {
  const step = Math.max(-GAME.maxTensionStep, Math.min(GAME.maxTensionStep, Math.round(change)))
  const after = Math.max(range.min, Math.min(range.max, tension + step))
  return { after, change: after - tension }
}

export type ToneBand = 'open' | 'guarded' | 'frustrated' | 'heated'

export function toneBand(tension: number): ToneBand {
  // The meter never goes below guarded (26); the bottom of that band is where the parent warms up.
  if (tension <= 35) return 'open'
  if (tension <= 50) return 'guarded'
  if (tension <= 75) return 'frustrated'
  return 'heated'
}

/** How the parent should sound at a given tension. Injected into each parent turn. */
export function parentToneGuide(tension: number): string {
  switch (toneBand(tension)) {
    case 'open':
      return 'You feel heard and are warming up, though you are still in a school meeting about your child. You are cooperative, willing to share a bit more than you planned, and you may admit something you were hiding if the teacher has earned it.'
    case 'guarded':
      return 'You are polite but a little guarded. You answer what is asked, speak up for your family, and do not volunteer what you are hiding.'
    case 'frustrated':
      return 'You are frustrated, but you are an adult in a school meeting and you keep it together. You are curt, you push back once and ask pointed questions, and you want the school to own its part. You do not yell or threaten.'
    case 'heated':
      return 'You are upset and running low on patience. You speak firmly and briefly, not hysterically. You might say this is not going well or that you want to talk to someone else, but you are still here for your child. You reveal nothing you are hiding.'
  }
}

/**
 * One line for the case file on how the parent seems as they arrive, so the
 * briefing always matches the starting tension the teacher picked.
 */
export function arrivalNote(parent: { name: string; relationship: string }, raisedBy: 'teacher' | 'parent', startTension: number): string {
  const last = parent.name.trim().split(/\s+/).at(-1) ?? parent.name
  const who =
    parent.relationship === 'mother' ? `Ms. ${last}` : parent.relationship === 'father' ? `Mr. ${last}` : parent.name
  switch (toneBand(startTension)) {
    case 'open':
      return `${who} seems at ease and ready to work with you.`
    case 'guarded':
      return raisedBy === 'parent'
        ? `${who} is polite but reserved, and has something specific to raise.`
        : `${who} is polite but reserved, waiting to hear why you asked to meet.`
    case 'frustrated':
      return raisedBy === 'parent'
        ? `${who} looks tense and short on time, and wants answers.`
        : `${who} looks tense and short on time, and isn't sure this meeting is necessary.`
    case 'heated':
      return `${who} arrives upset, arms crossed, ready to push back.`
  }
}

type FaceOffset = { brow: number; smile: number }

/**
 * The family's resting expressions for a scenario, layered on top of what the
 * tension does to their faces. brow: + knits (angry), - lifts (worried).
 */
export function demeanorFor(s: { raised_by: 'teacher' | 'parent'; grade: number; tutorial?: boolean }): {
  parent: FaceOffset
  student: FaceOffset
} {
  const parent: FaceOffset = { brow: 0, smile: 0 }
  const student: FaceOffset = { brow: 0, smile: 0 }
  if (s.raised_by === 'parent') {
    // They asked for this meeting because something is wrong.
    parent.brow += 0.25
    parent.smile -= 0.25
    // The student sits through their parent's complaint: a little embarrassed.
    student.smile -= 0.1
  } else {
    // The student is the reason they were called in.
    student.brow -= 0.3
    student.smile -= 0.2
  }
  if (s.grade <= 5) student.smile += 0.15 // young kids stay more open
  else if (s.grade >= 9) student.smile -= 0.1 // teens keep a flatter face
  if (s.tutorial) {
    parent.brow -= 0.1
    parent.smile += 0.2
  }
  return { parent, student }
}
