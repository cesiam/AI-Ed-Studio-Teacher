'use client'

import { Reveal } from './reveal'

const features = [
  {
    tag: 'Start here',
    title: 'A friendly first conference',
    body: 'New? The tutorial is a short, low-stakes check-in with Leo’s mom. Two short records, no surprises.',
  },
  {
    tag: 'Talk',
    title: 'Say it out loud',
    body: 'Tap the mic and speak to the parent and student. You see what was heard before you send it.',
  },
  {
    tag: 'Your desk',
    title: 'A laptop, like the real thing',
    body: 'Check records while you keep talking, show or print a document for the family, or message the nurse, counselor, principal or a colleague. Sometimes one of them walks in.',
  },
  {
    tag: 'Guidance',
    title: 'A guide and notes form, side by side',
    body: 'Suggested reading from Manhattan Psychology Group next to an optional notes form you can fill in and print. Turn on coach tips for a nudge toward a plan.',
  },
  {
    tag: 'Realism',
    title: 'Parents who react like people',
    body: 'Set where tension starts and how far it can go. It moves gradually and eases when you agree on next steps together.',
  },
  {
    tag: 'Reflect',
    title: 'A debrief and your transcripts',
    body: 'Every conference ends with specific feedback. Reread or download past conversations anytime, or add your own scenario.',
  },
]

/** What's in the practice room, in a sentence or two each. */
export function FeaturesSection() {
  return (
    <section id="features" className="relative z-10 mx-auto max-w-6xl scroll-mt-24 px-6 py-24 sm:py-32">
      <Reveal>
        <p className="kicker">Inside the practice room</p>
        <h2 className="mt-5 max-w-3xl text-balance font-display text-4xl font-extrabold leading-[1.02] tracking-[-0.03em] text-ghost sm:text-5xl">
          Practice the conversation <span className="marker-underline text-brand">before</span> it matters.
        </h2>
      </Reveal>
      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f, i) => (
          <Reveal key={f.title} delay={(i % 3) * 0.1}>
            <article
              data-cursor="hover"
              className="h-full rounded-3xl border border-glaucous/25 bg-coffee/85 p-6 backdrop-blur-md transition-colors hover:border-scarlet/60"
            >
              <span className="rounded-full bg-scarlet/15 px-3 py-1 font-body text-xs font-semibold text-scarlet">{f.tag}</span>
              <h3 className="mt-4 font-display text-xl font-bold leading-snug text-ghost">{f.title}</h3>
              <p className="mt-2 font-body text-[15px] leading-relaxed text-ghost/70">{f.body}</p>
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
