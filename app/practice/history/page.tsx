import type { Metadata } from 'next'
import { History } from '@/components/practice/history'

export const metadata: Metadata = {
  title: 'Past conferences — Building Bridges',
}

export default function HistoryPage() {
  return (
    <main className="min-h-svh bg-coffee px-6 py-10 font-body text-ghost sm:px-10">
      <header className="mx-auto flex max-w-6xl items-center justify-between">
        <a href="/" className="font-display text-lg font-bold tracking-tight">
          Building Bridges
        </a>
        <a href="/practice" className="text-xs uppercase tracking-[0.3em] text-glaucous hover:text-ghost">
          New conference
        </a>
      </header>
      <section className="mx-auto mt-12 max-w-6xl">
        <p className="text-xs uppercase tracking-[0.4em] text-glaucous">Your transcripts</p>
        <h1 className="mt-3 font-display text-5xl font-bold leading-[0.95] tracking-tight sm:text-6xl">
          Past <span className="text-scarlet">conferences</span>
        </h1>
        <History />
      </section>
    </main>
  )
}
