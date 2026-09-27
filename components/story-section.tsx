'use client'

import { Reveal } from './reveal'
import { DoodleImage } from './doodle-image'

const moments = [
  {
    kicker: 'The moment',
    concern: 'Attendance',
    line: '“I noticed Malik has missed nine days this quarter. I want to understand what’s going on at home so we can figure it out together.”',
    note: 'Lead with curiosity, not blame. Name the pattern, then hand the parent the wheel.',
  },
  {
    kicker: 'The moment',
    concern: 'Tardiness',
    line: '“Mornings sound tough right now. When Sofia arrives late she misses the warm-up — can we build a plan that fits your schedule?”',
    note: 'Tie the behavior to what the student is missing, and offer to co-author the fix.',
  },
  {
    kicker: 'The moment',
    concern: 'Classroom behavior',
    line: '“Jordan has so much energy for the class. Lately it’s spilling over during lessons — here’s what I’m seeing, and I’d love your read on it.”',
    note: 'Open with a strength. Share observations, then invite the parent’s expertise.',
  },
]

export function StorySection() {
  return (
    <section className="relative z-10 mx-auto max-w-5xl px-6 py-28 sm:py-40">
      <div className="grid items-center gap-10 md:grid-cols-[1.4fr_1fr]">
        <Reveal>
          <p className="font-body text-xs uppercase tracking-[0.4em] text-glaucous">
            Build bridges with parents &amp; students
          </p>
          <h2 className="mt-5 max-w-3xl text-balance font-display text-4xl font-bold leading-tight text-ghost sm:text-6xl">
            Every hard conversation is really an{' '}
            <span className="text-scarlet">invitation</span>.
          </h2>
          <p className="mt-6 max-w-2xl font-body text-lg text-ghost/70">
            Building Bridges gives you the words for the moments that usually go
            unsaid. Here&apos;s how a concern becomes a conversation.
          </p>
        </Reveal>
        <Reveal delay={0.15}>
          <DoodleImage
            src="/teacher-parent-child.png"
            width={768}
            height={768}
            className="mx-auto h-auto w-full max-w-sm"
          />
        </Reveal>
      </div>

      <div className="mt-16 grid gap-6 md:grid-cols-3">
        {moments.map((m, i) => (
          <Reveal key={m.concern} delay={i * 0.12}>
            <article
              data-cursor="hover"
              className="group h-full rounded-3xl border border-glaucous/25 bg-royal/15 p-7 backdrop-blur-sm transition-colors hover:border-scarlet/60 hover:bg-royal/25"
            >
              <div className="mb-6 flex items-center justify-between">
                <span className="font-body text-[10px] uppercase tracking-[0.3em] text-glaucous">
                  {m.kicker}
                </span>
                <span className="rounded-full bg-scarlet/15 px-3 py-1 font-body text-xs font-medium text-scarlet">
                  {m.concern}
                </span>
              </div>
              <p className="font-display text-xl leading-snug text-ghost">
                {m.line}
              </p>
              <p className="mt-6 border-t border-ghost/10 pt-5 font-body text-sm text-ghost/60">
                {m.note}
              </p>
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
