'use client'

import { useEffect } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Frosted-glass surface: translucent Ghost White over whatever glows behind it. */
export const glass =
  'border border-ghost/20 bg-ghost/[0.07] backdrop-blur-xl shadow-[inset_0_1px_0_rgba(251,251,255,0.22),0_10px_40px_rgba(13,1,6,0.55)]'

export function GlassButton({
  className,
  active,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        glass,
        'rounded-full px-4 py-2.5 font-body text-sm text-ghost/90 transition-[background-color,border-color,transform] duration-200',
        'hover:border-ghost/35 hover:bg-ghost/[0.14] active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40',
        active && 'border-glaucous/70 bg-glaucous/25',
        className,
      )}
    />
  )
}

/**
 * A glass sheet that rises over the room. Its content sits on a Ghost White
 * "paper" card, the way a printout or a phone screen would.
 */
export function GlassSheet({
  open,
  title,
  subtitle,
  onClose,
  children,
}: {
  open: boolean
  title: string
  subtitle?: string
  onClose: () => void
  children: React.ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-40 flex items-end justify-center bg-coffee/40 p-3 sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.section
            role="dialog"
            aria-label={title}
            onClick={(e) => e.stopPropagation()}
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
            className={cn(glass, 'flex h-[min(78svh,760px)] w-full max-w-5xl flex-col rounded-[28px] bg-coffee/55 p-3')}
          >
            <header className="flex items-center justify-between gap-4 px-3 pb-3 pt-1 font-body text-ghost">
              <div className="min-w-0">
                <h2 className="truncate font-display text-lg font-bold">{title}</h2>
                {subtitle && <p className="truncate text-xs text-ghost/55">{subtitle}</p>}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="grid size-9 flex-none place-items-center rounded-full bg-ghost/10 text-ghost/80 hover:bg-ghost/20"
              >
                <X className="size-4" />
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-hidden rounded-[20px] bg-ghost text-coffee">{children}</div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
