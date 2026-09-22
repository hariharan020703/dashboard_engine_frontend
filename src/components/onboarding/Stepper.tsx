import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Progress through a short wizard.
 *
 * Announced as a list with the current step marked, so somebody using a screen
 * reader hears "step 2 of 3, Access" rather than three unexplained numbers.
 */
export function Stepper({
  steps,
  current,
}: {
  steps: string[]
  /** 1-based, matching how the steps are numbered on screen. */
  current: number
}) {
  return (
    <ol
      className="flex items-center gap-1"
      aria-label={`Step ${current} of ${steps.length}`}
    >
      {steps.map((label, index) => {
        const position = index + 1
        const done = position < current
        const active = position === current

        return (
          <li
            key={label}
            className="flex min-w-0 flex-1 items-center gap-2"
            aria-current={active ? 'step' : undefined}
          >
            <span
              className={cn(
                'grid size-6 shrink-0 place-items-center rounded-full text-xs font-medium transition-colors',
                done && 'bg-primary text-primary-foreground',
                active && 'bg-primary text-primary-foreground',
                !done && !active && 'bg-muted text-muted-foreground'
              )}
            >
              {done ? <Check className="size-3.5" aria-hidden /> : position}
            </span>
            <span
              className={cn(
                'hidden truncate text-xs sm:block',
                active ? 'font-medium text-foreground' : 'text-muted-foreground'
              )}
            >
              {label}
            </span>
            {position < steps.length && (
              <span className="h-px min-w-3 flex-1 bg-border" aria-hidden />
            )}
          </li>
        )
      })}
    </ol>
  )
}

/** One label/value pair on a wizard's review step. */
export function ReviewRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className="shrink-0 text-xs text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate text-sm font-medium text-foreground">{value}</dd>
    </div>
  )
}
