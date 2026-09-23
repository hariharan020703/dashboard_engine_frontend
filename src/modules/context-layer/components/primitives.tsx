import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { EMPTY, formatConfidence } from './format'

/**
 * The small, repeated pieces of the workflow's visual language.
 *
 * Collected here because each appears in three or four steps and drifting
 * copies is how a "76% confidence" chip ends up a different colour in Model
 * than in Review — the same fact, presented as if it meant something different.
 */

/** A labelled number. Value is whatever the backend sent, formatted by the caller. */
export function StatTile({
  label,
  value,
  hint,
  icon,
  onClick,
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
  icon?: ReactNode
  onClick?: () => void
}) {
  const Wrapper = onClick ? 'button' : 'div'
  return (
    <Wrapper
      {...(onClick ? { type: 'button' as const, onClick } : {})}
      className={cn(
        'rounded-lg border bg-card p-3 text-left',
        onClick && 'transition-colors hover:border-primary/40 hover:bg-accent/40'
      )}
    >
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <p className="mt-1.5 text-xl font-semibold tabular-nums tracking-tight">{value}</p>
      {hint ? <p className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</p> : null}
    </Wrapper>
  )
}

/**
 * A 0–1 confidence, as a bar plus its percentage.
 *
 * The bar is coloured by band rather than on a gradient, because the decision
 * it supports is categorical — accept, look closer, probably reject — and a
 * continuous ramp invites reading precision into a number that does not have it.
 */
export function ConfidenceMeter({
  value,
  className,
  showLabel = true,
}: {
  value: number | null | undefined
  className?: string
  showLabel?: boolean
}) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return <span className="text-xs text-muted-foreground">{EMPTY}</span>
  }
  const ratio = Math.max(0, Math.min(1, value > 1 ? value / 100 : value))
  const band = ratio >= 0.9 ? 'high' : ratio >= 0.7 ? 'medium' : 'low'

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div
        className="h-1.5 w-16 overflow-hidden rounded-full bg-muted"
        role="meter"
        aria-valuenow={Math.round(ratio * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Confidence"
      >
        <div
          className={cn(
            'h-full rounded-full transition-[width]',
            band === 'high' && 'bg-emerald-500',
            band === 'medium' && 'bg-amber-500',
            band === 'low' && 'bg-rose-500'
          )}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
      {showLabel ? (
        <span className="text-xs tabular-nums text-muted-foreground">
          {formatConfidence(value)}
        </span>
      ) : null}
    </div>
  )
}

/** Marks content the backend generated rather than read from the source. */
export function AiBadge({ label = 'AI suggested' }: { label?: string }) {
  return (
    <Badge
      variant="outline"
      className="border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-300"
    >
      {label}
    </Badge>
  )
}

/** A status pill whose tone is chosen from the backend's own status string. */
export function StatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return <span className="text-xs text-muted-foreground">{EMPTY}</span>

  const value = status.toLowerCase()
  const tone =
    value === 'connected' || value === 'approved' || value === 'accepted' || value === 'ready' || value === 'published'
      ? 'ok'
      : value === 'invalid' || value === 'rejected' || value === 'failed' || value === 'error'
        ? 'bad'
        : value === 'generating' || value === 'pending' || value === 'suggested'
          ? 'busy'
          : 'neutral'

  return (
    <Badge
      variant="outline"
      className={cn(
        'capitalize',
        tone === 'ok' &&
          'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300',
        tone === 'bad' &&
          'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300',
        tone === 'busy' &&
          'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300'
      )}
    >
      {status}
    </Badge>
  )
}

/** A cell that renders "—" for absent data without the caller branching. */
export function Cell({ value }: { value: ReactNode }) {
  const absent = value === null || value === undefined || value === '' || value === EMPTY
  return (
    <span className={cn('tabular-nums', absent && 'text-muted-foreground')}>
      {absent ? EMPTY : value}
    </span>
  )
}

/** Section heading inside a step's body. */
export function SectionHeading({
  title,
  description,
  actions,
}: {
  title: string
  description?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        {description ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions}
    </div>
  )
}
