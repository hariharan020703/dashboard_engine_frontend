import type { ComponentType, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * One number, with what it counts and where to go to act on it.
 *
 * `value` is typed to accept only a number or null, never a string. That is the
 * guard against a placeholder: there is no way to pass "—", "1,284" or "24
 * active" through here, so a card either shows a figure the API returned or
 * says the figure is unavailable. Formatting is this component's job, which is
 * also what keeps thousands separators consistent across the product.
 */
export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  to,
  loading,
}: {
  label: string
  /** null means "not loaded or not available" - it is never rendered as zero. */
  value: number | null
  hint?: ReactNode
  icon?: ComponentType<{ className?: string }>
  /** Makes the whole card a link to the screen where this number is managed. */
  to?: string
  loading?: boolean
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
        {Icon && (
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
            <Icon className="size-4" aria-hidden />
          </span>
        )}
      </div>

      <p className="mt-3 text-2xl font-semibold tracking-tight tabular-nums text-foreground">
        {loading ? (
          <span className="inline-block h-7 w-14 animate-pulse rounded bg-muted align-middle" />
        ) : value === null ? (
          <span className="text-base font-normal text-muted-foreground">Unavailable</span>
        ) : (
          value.toLocaleString()
        )}
      </p>

      {hint && (
        <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
          {hint}
          {to && (
            <ArrowRight
              className="size-3 opacity-0 transition-opacity group-hover:opacity-100"
              aria-hidden
            />
          )}
        </p>
      )}
    </>
  )

  const shell = 'group block rounded-xl border border-border bg-card p-5 text-left'

  if (!to) return <div className={shell}>{body}</div>

  return (
    <Link
      to={to}
      className={cn(
        shell,
        'transition-colors hover:border-primary/40 hover:bg-accent/40',
        'focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2'
      )}
    >
      {body}
    </Link>
  )
}
