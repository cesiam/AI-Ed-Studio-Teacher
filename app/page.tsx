import { SmoothScroll } from '@/components/smooth-scroll'
import { CustomCursor } from '@/components/custom-cursor'
import { FallingStrings } from '@/components/falling-strings'
import { SiteNav } from '@/components/site-nav'
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
      <main className="relative">
        <FallingStrings />
        <SiteNav />

        <Hero />
        <StorySection />
        <StatsSection />
        <FeaturesSection />
        <FinalSection />

        <footer className="relative z-10 border-t border-ghost/10 px-6 py-12 text-center font-body text-sm text-ghost/60">
          Building Bridges — helping teachers and families have the
          conversations that matter.
        </footer>
      </main>
    </>
  )
}
