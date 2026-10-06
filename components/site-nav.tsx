import { ThemeToggle } from './theme-toggle'

type SiteNavProps = {
  /** The pill link on the right; defaults to the pre-conference orientation. */
  action?: { href: string; label: string }
}

export function SiteNav({ action = { href: '/start', label: 'Get started' } }: SiteNavProps) {
  return (
    <header className="fixed left-0 top-0 z-50 flex w-full items-center justify-between bg-coffee/70 px-6 py-4 backdrop-blur-md sm:px-10">
      <a href="/" data-cursor="hover" className="font-brand text-lg font-bold tracking-[-0.02em] text-ghost">
        Building Bridges
      </a>
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <a
          href={action.href}
          data-cursor="hover"
          className="rounded-full border border-ghost/20 px-5 py-2 font-body text-sm font-semibold text-ghost/85 transition-colors hover:border-scarlet hover:text-ghost"
        >
          {action.label}
        </a>
      </div>
      {/* The notebook's top rule; on the landing page the margin line meets it. */}
      <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-ghost/15" />
    </header>
  )
}
