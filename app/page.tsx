import { SmoothScroll } from '@/components/smooth-scroll'
import { CustomCursor } from '@/components/custom-cursor'
import { FallingStrings } from '@/components/falling-strings'
import { Hero } from '@/components/hero'
import { StorySection } from '@/components/story-section'
import { StatsSection } from '@/components/stats-section'
import { FeaturesSection } from '@/components/features-section'
import { FinalSection } from '@/components/final-section'

export default function Page() {
  return (
    <>
      <SmoothScroll />
      <CustomCursor />
      <FallingStrings />

      <main className="relative">
        <header className="fixed left-0 top-0 z-50 flex w-full items-center justify-between px-6 py-6 sm:px-10">
          <span className="font-display text-lg font-bold tracking-tight text-ghost">
            Building Bridges
          </span>
          <a
            href="/practice"
            data-cursor="hover"
            className="rounded-full border border-ghost/20 px-5 py-2 font-body text-sm text-ghost/85 transition-colors hover:border-scarlet hover:text-ghost"
          >
            Get started
          </a>
        </header>

        <Hero />
        <StorySection />
        <StatsSection />
        <FeaturesSection />
        <FinalSection />

        <footer className="relative z-10 border-t border-ghost/10 px-6 py-12 text-center font-body text-sm text-ghost/40">
          Building Bridges — helping teachers and families have the
          conversations that matter.
        </footer>
      </main>
    </>
  )
}
