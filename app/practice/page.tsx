import type { Metadata } from 'next'
import { SetupForm } from '@/components/practice/setup-form'

export const metadata: Metadata = {
  title: 'Practice a conference — Building Bridges',
}

export default function PracticePage() {
  return (
    <main className="min-h-svh bg-coffee px-6 py-10 text-ghost sm:px-10">
      <header className="mx-auto flex max-w-4xl items-center justify-between">
        <a href="/" className="font-display text-lg font-bold tracking-tight text-ghost">
          Building Bridges
        </a>
        <a href="/practice/history" className="font-body text-xs uppercase tracking-[0.3em] text-glaucous hover:text-ghost">
          Past conferences
        </a>
      </header>

      <section className="mx-auto mt-12 max-w-4xl">
        <p className="font-body text-xs uppercase tracking-[0.4em] text-glaucous">Set up your session</p>
        <h1 className="mt-3 font-display text-5xl font-bold leading-[0.95] tracking-tight sm:text-6xl">
          Who&apos;s coming in <span className="text-scarlet">today?</span>
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
