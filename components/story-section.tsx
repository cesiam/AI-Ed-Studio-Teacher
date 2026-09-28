'use client'

import { InvitationCopy } from './hero'
import { Reveal } from './reveal'

const moments = [
  {
    kicker: 'The moment',
    concern: 'Attendance',
    line: '“I noticed Malik has missed nine days this quarter. I want to understand what’s going on at home so we can figure it out together.”',
    note: 'Lead with curiosity, not blame. Name the pattern, then hand the parent the wheel.',
  },
  {
    kicker: 'The moment',
    concern: 'Missed content',
    line: '“Sofia’s been out a lot this month, and the lessons she’s missed are starting to add up. Can we find a way for her to catch up that works for your family?”',
    note: 'Name what the student is missing, not just the days, and offer to co-author the plan.',
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
    <section id="after-hero" className="notebook-paper relative z-10 flex min-h-[100svh] flex-col justify-center overflow-hidden py-20 sm:py-28">
      {/* The notebook's red margin line, continuing the one in the hero. One of
          the falling strings rides it (see FallingStrings). */}
      <div aria-hidden data-margin-rail className="margin-rule" />
      <p
        aria-hidden
        className="pointer-events-none absolute top-72 hidden origin-top-left -rotate-90 translate-y-full font-body text-[11px] font-semibold uppercase tracking-[0.2em] text-scarlet md:left-11 md:block lg:left-19"
      >
        Open case file · 01
      </p>

      <div className="relative mx-auto max-w-6xl px-8 md:px-12">
        {/* On desktop this copy takes Maya's place in the hero instead. */}
        <Reveal className="mx-auto mb-12 max-w-xl text-center md:hidden">
          <InvitationCopy />
        </Reveal>

        <div className="grid gap-6 md:grid-cols-3">
          {moments.map((m, i) => (
            <Reveal key={m.concern} delay={i * 0.12}>
              <article
                data-cursor="hover"
                className="group h-full rounded-3xl border border-glaucous/25 bg-coffee/85 p-7 backdrop-blur-md transition-colors hover:border-scarlet/60"
              >
                <div className="mb-6 flex items-center justify-between">
                  <span className="font-body text-[11px] font-semibold uppercase tracking-[0.2em] text-brand">
                    {m.kicker}
                  </span>
                  <span className="rounded-full bg-scarlet/15 px-3 py-1 font-body text-xs font-semibold text-scarlet">
                    {m.concern}
                  </span>
                </div>
                <p className="font-display text-xl font-medium leading-snug text-ghost">{m.line}</p>
                <p className="mt-6 border-t border-ghost/10 pt-5 font-body text-sm text-ghost/60">{m.note}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
