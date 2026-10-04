import type { Metadata } from 'next'
import { SiteNav } from '@/components/site-nav'
import { DoodleImage } from '@/components/doodle-image'
import { StartIntro } from '@/components/start-intro'

export const metadata: Metadata = {
  title: 'Before you begin — Building Bridges',
}

const steps = [
  {
    title: 'Choose your scenario.',
    body: 'Pick one scenario or run several back to back, from attendance concerns to academic integrity. You can adjust the tension level and turn off some of the random events.',
  },
  {
    title: 'Review your work laptop.',
    body: "Before the conference, look through the student's records, the school policies that apply, and what your colleagues have noted. You can also message colleagues directly to ask questions and get their perspective on the situation.",
  },
  {
    title: 'Set your intention.',
    body: "Reflect on what you hope for this student and how this conversation can help get them there. You can end the conference once you and the parent reach some kind of agreement. A two-week action plan document is available to help you structure the conversation, but you don't have to complete it.",
  },
]

/** Orientation before setup: what the session involves, in the order it happens. */
export default function StartPage() {
  return (
    <main className="relative min-h-svh bg-coffee px-6 pb-16 pt-28 text-ghost sm:px-10">
      <SiteNav action={{ href: '/practice', label: 'Skip to setup' }} />
      <div aria-hidden className="margin-rule" />

      <section className="mx-auto flex max-w-2xl flex-col items-center">
        <DoodleImage src="/school.png" width={720} height={330} priority className="h-auto w-full max-w-md" />

        {/* A short rule between the school and the copy, not the full window. */}
        <hr className="mt-10 w-24 border-0 border-t-2 border-ghost/20" />

        <StartIntro steps={steps} />
      </section>
    </main>
  )
}
