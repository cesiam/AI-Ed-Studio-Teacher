'use client'

import { motion } from 'motion/react'
import { cn } from '@/lib/utils'

export function tensionColor(t: number): string {
  if (t <= 25) return '#657ed4'
  if (t <= 50) return '#3626a7'
  return '#ff331f'
}

export function tensionLabel(t: number): string {
  if (t <= 50) return 'Guarded'
  if (t <= 75) return 'Frustrated'
  return 'Heated'
}

export function TensionMeter({
  value,
  lastChange,
  lastReason,
  className,
}: {
  value: number
  lastChange?: number
  lastReason?: string
  className?: string
}) {
  return (
    <div className={cn('w-full max-w-md font-body', className)}>
      <div className="flex items-baseline justify-between text-coffee">
        <span className="text-[11px] font-semibold uppercase tracking-[0.3em]">Tension</span>
        <span className="font-display text-sm font-bold">
          {tensionLabel(value)} · {value}
        </span>
      </div>
      <div
        className="mt-1.5 h-3 overflow-hidden rounded-full bg-coffee/15"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        aria-label="Tension"
      >
        <motion.div
          className="h-full rounded-full"
          initial={false}
          animate={{ width: `${value}%`, backgroundColor: tensionColor(value) }}
          transition={{ type: 'spring', stiffness: 80, damping: 18 }}
        />
      </div>
      {lastReason && (
        <motion.p
          key={lastReason}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-1.5 flex items-start gap-2 text-xs leading-snug text-coffee/80"
        >
          {lastChange !== undefined && (
            <span
              className={cn(
                'flex-none rounded-full px-1.5 font-bold',
                lastChange > 0 ? 'bg-scarlet text-ghost' : lastChange < 0 ? 'bg-royal text-ghost' : 'bg-coffee/15 text-coffee',
              )}
            >
              {lastChange > 0 ? `+${lastChange}` : lastChange}
            </span>
          )}
          <span>{lastReason}</span>
        </motion.p>
      )}
    </div>
  )
}
