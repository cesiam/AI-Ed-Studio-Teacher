import { randomInt } from 'node:crypto'

/**
 * Small deterministic PRNG (mulberry32). Every random decision in a session
 * is drawn from one of these, seeded with the session's stored seed, so the
 * same seed + config always produces the same plan.
 */
export class Rng {
  private state: number

  constructor(seed: number) {
    this.state = seed >>> 0
  }

  /** Float in [0, 1). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0
    let t = this.state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  /** Integer in [min, max], inclusive. */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1))
  }

  pick<T>(items: readonly T[]): T {
    return items[this.int(0, items.length - 1)]
  }

  /** Fisher-Yates shuffle; returns a new array. */
  shuffle<T>(items: readonly T[]): T[] {
    const out = [...items]
    for (let i = out.length - 1; i > 0; i--) {
      const j = this.int(0, i)
      ;[out[i], out[j]] = [out[j], out[i]]
    }
    return out
  }
}

/** A fresh 32-bit seed for a new session. */
export function newSeed(): number {
  return randomInt(0, 2 ** 32 - 1)
}
