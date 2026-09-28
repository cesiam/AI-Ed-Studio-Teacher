import type { Metadata } from 'next'
import { SiteNav } from '@/components/site-nav'
import { SetupForm } from '@/components/practice/setup-form'

export const metadata: Metadata = {
  title: 'Practice a conference — Building Bridges',
}

export default function PracticePage() {
  return (
    <main className="relative min-h-svh bg-coffee px-6 pb-10 pt-28 text-ghost sm:px-10">
      <SiteNav action={{ href: '/practice/history', label: 'Past conferences' }} />
      {/* The notebook margin line, meeting the nav's red rule as on the landing page. */}
      <div aria-hidden className="margin-rule" />

      <section className="mx-auto max-w-4xl">
        <p className="kicker">Set up your session</p>
        <h1 className="mt-3 font-display text-5xl font-extrabold leading-[0.95] tracking-[-0.035em] sm:text-6xl">
          Who&apos;s coming in <span className="marker-underline text-brand">today?</span>
        </h1>
        <p className="mt-4 max-w-2xl font-body text-ghost/70">
          Choose your scenarios, how unpredictable the session should be, and how the parent walks in. You&apos;ll
          review the records before the family sits down.
        </p>
        <SetupForm />
      </section>
    </main>
  )
}
