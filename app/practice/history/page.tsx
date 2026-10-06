import type { Metadata } from 'next'
import { SiteNav } from '@/components/site-nav'
import { History } from '@/components/practice/history'

export const metadata: Metadata = {
  title: 'Past conferences — Building Bridges',
}

export default function HistoryPage() {
  return (
    <main className="min-h-svh bg-coffee px-6 pb-10 pt-28 font-body text-ghost sm:px-10 md:px-20 lg:px-32">
      <SiteNav action={{ href: '/practice', label: 'New conference' }} />
      <section className="mx-auto max-w-6xl">
        <p className="kicker">Your transcripts</p>
        <h1 className="mt-3 font-display text-5xl font-extrabold leading-[0.95] tracking-[-0.035em] sm:text-6xl">
          Past <span className="marker-underline text-brand">conferences</span>
        </h1>
        <History />
      </section>
    </main>
  )
}
