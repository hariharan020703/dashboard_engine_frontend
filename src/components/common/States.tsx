import type { ComponentType, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  Inbox,
  Lock,
  RefreshCw,
  SearchX,
  ShieldAlert,
  WifiOff,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { errorCode, errorMessage } from '@/api/http'

/**
 * The four states every asynchronous screen has, as components rather than as
 * ad-hoc markup: loading, empty, error, and not-permitted.
 *
 * They exist as a set because the failure to design them is always the same
 * failure - a screen shows a spinner and an empty table, and the two are
 * indistinguishable from "this customer has no users". Making each an explicit
 * component means a screen cannot accidentally render nothing.
 */

/* ---------------------------------------------------------------- loading --- */

/**
 * Skeleton rows shaped like the table that is coming.
 *
 * Deliberately not a spinner: a spinner says "wait", a skeleton says "a table
 * of about this size is arriving", and the second is what stops the layout
 * jumping when it does.
 */
export function TableSkeleton({ rows = 6, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="divide-y divide-border" aria-hidden>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex items-center gap-4 px-5 py-3.5">
          {Array.from({ length: columns }).map((_, columnIndex) => (
            <Skeleton
              key={columnIndex}
              className={cn('h-4', columnIndex === 0 ? 'w-[22%]' : 'flex-1')}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-hidden>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="rounded-xl border border-border bg-card p-5">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="mt-4 h-4 w-3/5" />
          <Skeleton className="mt-2 h-3 w-2/5" />
        </div>
      ))}
    </div>
  )
}

export function StatSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-hidden>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="rounded-xl border border-border bg-card p-5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-3 h-7 w-16" />
          <Skeleton className="mt-3 h-3 w-32" />
        </div>
      ))}
    </div>
  )
}

/**
 * An inline "this is happening" for a region that already has content.
 *
 * `label` is required and says what is loading, because "Loading…" on its own
 * tells somebody staring at a slow screen nothing they did not know.
 */
export function InlineLoading({ label }: { label: string }) {
  return (
    <p
      className="flex items-center justify-center gap-2 px-5 py-10 text-sm text-muted-foreground"
      role="status"
      aria-live="polite"
    >
      <RefreshCw className="size-4 animate-spin" aria-hidden />
      {label}
    </p>
  )
}

/* ------------------------------------------------------------------ shell --- */

function StateShell({
  icon: Icon,
  tone = 'neutral',
  title,
  body,
  children,
  compact,
}: {
  icon: ComponentType<{ className?: string }>
  tone?: 'neutral' | 'danger' | 'warning'
  title: string
  body?: ReactNode
  children?: ReactNode
  compact?: boolean
}) {
  const toneCls =
    tone === 'danger'
      ? 'bg-destructive/10 text-destructive'
      : tone === 'warning'
        ? 'bg-warning/15 text-warning-foreground'
        : 'bg-muted text-muted-foreground'

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center px-6 text-center',
        compact ? 'py-10' : 'py-16'
      )}
    >
      <span className={cn('grid size-11 place-items-center rounded-full', toneCls)}>
        <Icon className="size-5" aria-hidden />
      </span>
      <p className="mt-4 text-sm font-semibold text-foreground">{title}</p>
      {body && <p className="mt-1.5 max-w-md text-sm text-muted-foreground">{body}</p>}
      {children && <div className="mt-5 flex flex-wrap items-center justify-center gap-2">{children}</div>}
    </div>
  )
}

/* ------------------------------------------------------------------ empty --- */

/**
 * A list with nothing in it.
 *
 * `action` is the point: an empty state that only says "no companies yet" makes
 * the reader go and find the button. One that carries the button is the
 * shortest path from an empty product to a used one.
 */
export function EmptyState({
  title,
  body,
  action,
  icon = Inbox,
  compact,
}: {
  title: string
  body?: ReactNode
  action?: ReactNode
  icon?: ComponentType<{ className?: string }>
  compact?: boolean
}) {
  return (
    <StateShell icon={icon} title={title} body={body} compact={compact}>
      {action}
    </StateShell>
  )
}

/** A search or filter that matched nothing - distinct from having no data. */
export function NoResultsState({ query, onClear }: { query: string; onClear: () => void }) {
  return (
    <StateShell
      icon={SearchX}
      title="No matches"
      body={
        <>
          Nothing matches <span className="font-medium text-foreground">“{query}”</span>.
        </>
      }
      compact
    >
      <Button variant="outline" size="sm" onClick={onClear}>
        Clear search
      </Button>
    </StateShell>
  )
}

/* ------------------------------------------------------------------ error --- */

/**
 * A failed load, with the reason and a way to try again.
 *
 * The API writes its messages for the person reading them, so the message is
 * shown as given rather than replaced with something vaguer. The exceptions are
 * the two cases where the code means more than the sentence does - a network
 * failure and a permission refusal - which get their own shape below.
 */
export function ErrorState({
  error,
  title = 'Something went wrong',
  onRetry,
  compact,
}: {
  error: unknown
  title?: string
  onRetry?: () => void
  compact?: boolean
}) {
  const code = errorCode(error)

  if (code === 'NETWORK_ERROR') {
    return (
      <StateShell
        icon={WifiOff}
        tone="warning"
        title="Cannot reach the server"
        body="Check your connection. Nothing has been changed."
        compact={compact}
      >
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw aria-hidden />
            Try again
          </Button>
        )}
      </StateShell>
    )
  }

  if (code === 'INSUFFICIENT_PERMISSION' || code === 'TENANT_ACCESS_DENIED') {
    return <PermissionDeniedState detail={errorMessage(error, '')} compact={compact} />
  }

  if (code === 'RESOURCE_NOT_FOUND') {
    return <NotFoundState detail={errorMessage(error, '')} compact={compact} />
  }

  return (
    <StateShell
      icon={AlertTriangle}
      tone="danger"
      title={title}
      body={errorMessage(error, 'The server did not explain what failed.')}
      compact={compact}
    >
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw aria-hidden />
          Try again
        </Button>
      )}
    </StateShell>
  )
}

/* ------------------------------------------------------- refusals and 404 --- */

export function PermissionDeniedState({
  detail,
  backTo,
  compact,
}: {
  detail?: string
  backTo?: string
  compact?: boolean
}) {
  return (
    <StateShell
      icon={Lock}
      tone="warning"
      title="Access restricted"
      body={detail || 'You do not have permission to view this.'}
      compact={compact}
    >
      {backTo && (
        <Button variant="outline" size="sm" asChild>
          <Link to={backTo}>Back to safety</Link>
        </Button>
      )}
    </StateShell>
  )
}

export function NotFoundState({
  detail,
  backTo,
  compact,
}: {
  detail?: string
  backTo?: string
  compact?: boolean
}) {
  return (
    <StateShell
      icon={ShieldAlert}
      title="Not found"
      body={detail || 'There is nothing here. It may have been removed.'}
      compact={compact}
    >
      {backTo && (
        <Button variant="outline" size="sm" asChild>
          <Link to={backTo}>Go back</Link>
        </Button>
      )}
    </StateShell>
  )
}
