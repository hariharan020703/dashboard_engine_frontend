import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { AlertTriangle, Inbox, Loader2, PlugZap, RefreshCw, ServerCog } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { errorMessage } from '@/api/http'
import { isEndpointMissing } from '../api'
import { cn } from '@/lib/utils'

/**
 * The four states every server read in this module can be in, as components.
 *
 * There are four rather than three because "the backend does not have this
 * route yet" is genuinely different from "the request failed", and showing the
 * second for the first wastes somebody's time on a Retry button that cannot
 * help. While steps 3 to 7 are unbuilt that distinction is most of what this
 * screen communicates, so it is a first-class state rather than a footnote.
 *
 * Nothing here ever renders a raw exception. `errorMessage` takes the backend's
 * own wording when there is one — every message the API sends is written for
 * the person reading it — and falls back to a sentence written for this screen
 * otherwise. An axios stack trace is not an error message.
 */

function Frame({
  icon,
  title,
  children,
  action,
  tone = 'muted',
}: {
  icon: ReactNode
  title: string
  children?: ReactNode
  action?: ReactNode
  tone?: 'muted' | 'danger' | 'info'
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed px-6 py-12 text-center">
      <div
        className={cn(
          'mb-4 flex size-11 items-center justify-center rounded-full',
          tone === 'danger' && 'bg-destructive/10 text-destructive',
          tone === 'info' && 'bg-primary/10 text-primary',
          tone === 'muted' && 'bg-muted text-muted-foreground'
        )}
      >
        {icon}
      </div>
      <p className="text-sm font-medium">{title}</p>
      {children ? (
        <div className="mt-1.5 max-w-md text-sm text-muted-foreground">{children}</div>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <Frame
      icon={<Loader2 className="size-5 animate-spin" aria-hidden />}
      title={label}
      tone="muted"
    />
  )
}

/** Table-shaped skeleton, so a loading list does not collapse the layout. */
export function TableSkeleton({ rows = 6, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-2" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 px-2">
          {Array.from({ length: columns }).map((__, c) => (
            <Skeleton
              key={c}
              className={cn('h-4', c === 0 ? 'w-[28%]' : 'flex-1')}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

/** A row of stat-tile skeletons, the same size as the tiles they stand in for. */
export function TileSkeleton({ count = 3, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('grid gap-4 sm:grid-cols-3', className)} aria-busy="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border bg-card p-4 shadow-xs">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="mt-3 h-7 w-20" />
          <Skeleton className="mt-3 h-3 w-32" />
        </div>
      ))}
    </div>
  )
}

/** A bordered card with a heading bar and table rows, for a card still loading. */
export function CardSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-xs" aria-busy="true">
      <div className="border-b px-5 py-4">
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="px-3 py-4">
        <TableSkeleton rows={rows} columns={columns} />
      </div>
    </div>
  )
}

/**
 * A thin bar across the top of a step while data it already shows is being
 * re-read. The content stays; the bar says it is about to change.
 */
export function RefreshingBar({ active }: { active: boolean }) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-x-0 top-0 z-10 h-0.5 overflow-hidden transition-opacity',
        active ? 'opacity-100' : 'opacity-0'
      )}
      role={active ? 'progressbar' : undefined}
      aria-label={active ? 'Refreshing' : undefined}
    >
      <div className="h-full w-full animate-pulse bg-primary/70" />
    </div>
  )
}

/** Seconds since mount, for "still working" feedback on long operations. */
function useElapsedSeconds() {
  const [seconds, setSeconds] = useState(0)
  useEffect(() => {
    const started = Date.now()
    const id = window.setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 1000)
    return () => window.clearInterval(id)
  }, [])
  return seconds
}

function formatElapsed(seconds: number) {
  if (seconds < 60) return `${seconds}s`
  return `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, '0')}s`
}

/**
 * Covers a step's body while a long operation runs — saving before moving on,
 * or an AI run that holds the request open.
 *
 * The elapsed time is the point: a spinner alone looks the same at second 3
 * and at minute 3, and the second is when people assume it has hung.
 */
export function BusyOverlay({ title, detail }: { title: string; detail?: ReactNode }) {
  const seconds = useElapsedSeconds()
  return (
    <div
      className="absolute inset-0 z-20 flex items-center justify-center bg-background/75 backdrop-blur-[2px]"
      role="status"
      aria-live="polite"
    >
      <div className="mx-6 flex max-w-md flex-col items-center rounded-xl border bg-card px-8 py-7 text-center shadow-lg">
        <span className="relative mb-4 flex size-12 items-center justify-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-primary/15" aria-hidden />
          <span className="relative flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Loader2 className="size-6 animate-spin" aria-hidden />
          </span>
        </span>
        <p className="text-sm font-semibold">{title}</p>
        {detail ? <div className="mt-1.5 text-sm text-muted-foreground">{detail}</div> : null}
        <p className="mt-4 text-xs tabular-nums text-muted-foreground">
          Elapsed {formatElapsed(seconds)}
        </p>
      </div>
    </div>
  )
}

export function EmptyState({
  title,
  detail,
  action,
}: {
  title: string
  detail?: ReactNode
  action?: ReactNode
}) {
  return (
    <Frame icon={<Inbox className="size-5" aria-hidden />} title={title} action={action}>
      {detail}
    </Frame>
  )
}

/**
 * A failed request.
 *
 * `context` is what the user was trying to do, in their terms — "load datasets"
 * — so the heading reads as a sentence about their task rather than about HTTP.
 */
export function ErrorState({
  context,
  error,
  onRetry,
}: {
  context: string
  error: unknown
  onRetry?: () => void
}) {
  return (
    <Frame
      icon={<AlertTriangle className="size-5" aria-hidden />}
      title={`Couldn't ${context}`}
      tone="danger"
      action={
        onRetry ? (
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw className="size-4" aria-hidden />
            Try again
          </Button>
        ) : undefined
      }
    >
      {errorMessage(error, 'Something went wrong. Try again in a moment.')}
    </Frame>
  )
}

/**
 * The step's backend route does not exist yet.
 *
 * Stated plainly, with the endpoint named, because the audience for this
 * message while the contract is being built is as much the person implementing
 * the backend as the person using the screen. No Retry button: there is nothing
 * to retry until the route ships.
 */
export function EndpointPendingState({
  step,
  endpoint,
  detail,
}: {
  step: string
  endpoint: string
  detail?: ReactNode
}) {
  return (
    <Frame
      icon={<ServerCog className="size-5" aria-hidden />}
      title={`${step} is waiting on its backend endpoint`}
      tone="info"
    >
      <p>
        {detail ??
          'This step renders entirely from the backend. Once the endpoint below responds, it will fill in with real data — nothing on this screen is simulated in the meantime.'}
      </p>
      <code className="mt-3 inline-block rounded bg-muted px-2 py-1 font-mono text-xs text-foreground">
        {endpoint}
      </code>
    </Frame>
  )
}

/** No connection chosen yet — the workflow cannot start. */
export function NoConnectionState({ onConnect }: { onConnect?: () => void }) {
  return (
    <Frame
      icon={<PlugZap className="size-5" aria-hidden />}
      title="No data source connected"
      tone="info"
      action={
        onConnect ? (
          <Button size="sm" onClick={onConnect}>
            Go to Connect
          </Button>
        ) : undefined
      }
    >
      Connect a data source in step one. Every later step is built from what that connection
      reports.
    </Frame>
  )
}

/**
 * The one place a step decides which of the four to show.
 *
 * Keeping the precedence here rather than in seven step components is what
 * stops one of them getting it subtly wrong — showing an error for a 404 on an
 * unbuilt route, or an empty state while a request is still in flight.
 */
export function QueryBoundary<T>({
  query,
  step,
  endpoint,
  context,
  isEmpty,
  empty,
  loading,
  children,
}: {
  query: {
    data: T | undefined
    isPending: boolean
    isError: boolean
    error: unknown
    refetch: () => void
  }
  step: string
  endpoint: string
  context: string
  isEmpty?: (data: T) => boolean
  empty?: ReactNode
  loading?: ReactNode
  children: (data: T) => ReactNode
}) {
  if (query.isError) {
    return isEndpointMissing(query.error) ? (
      <EndpointPendingState step={step} endpoint={endpoint} />
    ) : (
      <ErrorState context={context} error={query.error} onRetry={() => query.refetch()} />
    )
  }
  if (query.isPending || query.data === undefined) {
    return <>{loading ?? <LoadingState />}</>
  }
  if (isEmpty?.(query.data)) {
    return <>{empty ?? <EmptyState title="Nothing to show yet" />}</>
  }
  return <>{children(query.data)}</>
}
