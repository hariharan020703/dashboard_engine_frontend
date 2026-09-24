import { useState } from 'react'
import type { ReactNode } from 'react'
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { WORKFLOW_STEPS, stepIndex, useWorkflow } from '../state/workflowContext'
import { cn } from '@/lib/utils'
import { BusyOverlay, RefreshingBar } from './DataStates'

/**
 * The frame every step renders inside: a heading, the step's body, and the
 * Back / Next pair.
 *
 * Having one frame is what keeps the seven steps feeling like one workflow
 * rather than seven pages — the title sits in the same place, the footer is the
 * same height, and moving between them does not shift the layout under the
 * cursor.
 *
 * `nextDisabled` / `nextLabel` are the step's business: only Discover knows
 * that it needs a selection before you can move on. The frame owns where the
 * button is and what it looks like, not when it is allowed.
 */
export function StepFrame({
  title,
  description,
  actions,
  children,
  nextDisabled,
  nextLabel,
  nextPending,
  onNext,
  hideNext,
  hideBack,
  footerNote,
  pendingLabel = 'Saving…',
  pendingOverlay,
  refreshing = false,
}: {
  title: string
  description?: ReactNode
  /** Step-level controls that belong beside the title — refresh, filters. */
  actions?: ReactNode
  children: ReactNode
  nextDisabled?: boolean
  nextLabel?: string
  nextPending?: boolean
  /** Runs before advancing; advancing is skipped if it resolves false. */
  onNext?: () => void | boolean | Promise<void | boolean>
  hideNext?: boolean
  hideBack?: boolean
  /** A sentence above the footer, e.g. "3 datasets selected". */
  footerNote?: ReactNode
  /** The Next button's text while `onNext` runs. */
  pendingLabel?: string
  /**
   * Shown over the body while `onNext` runs, for work long enough that a
   * busy button alone would look like nothing is happening.
   */
  pendingOverlay?: { title: string; detail?: ReactNode }
  /** Data already on screen is being re-read — draws a thin bar at the top. */
  refreshing?: boolean
}) {
  const { step, next, back } = useWorkflow()
  const index = stepIndex(step)
  const isFirst = index === 0
  const isLast = index === WORKFLOW_STEPS.length - 1

  /*
   * Tracked here as well as through `nextPending`, so every step's Next shows
   * that it is working while `onNext` runs - including steps that never pass
   * a pending flag.
   */
  const [advancing, setAdvancing] = useState(false)
  const busy = advancing || Boolean(nextPending)

  const handleNext = async () => {
    if (busy) return
    if (onNext) {
      setAdvancing(true)
      let result: void | boolean
      try {
        result = await onNext()
      } finally {
        setAdvancing(false)
      }
      if (result === false) return
    }
    next()
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b px-6 py-4">
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </header>

      <div className="relative min-h-0 flex-1 overflow-auto px-6 py-6">
        <RefreshingBar active={refreshing && !busy} />
        {children}
        {busy && pendingOverlay ? (
          <BusyOverlay title={pendingOverlay.title} detail={pendingOverlay.detail} />
        ) : null}
      </div>

      <footer
        className={cn(
          'flex items-center justify-between gap-4 border-t px-6 py-3',
          'bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60'
        )}
      >
        <div>
          {hideBack || isFirst ? (
            <span />
          ) : (
            <Button variant="ghost" size="sm" onClick={back} disabled={busy}>
              <ArrowLeft className="size-4" aria-hidden />
              Back
            </Button>
          )}
        </div>

        {footerNote ? (
          <p className="truncate text-xs text-muted-foreground">{footerNote}</p>
        ) : null}

        <div>
          {hideNext || isLast ? (
            <span />
          ) : (
            <Button size="sm" onClick={handleNext} disabled={nextDisabled || busy}>
              {busy ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  {pendingLabel}
                </>
              ) : (
                <>
                  {nextLabel ?? 'Next'}
                  <ArrowRight className="size-4" aria-hidden />
                </>
              )}
            </Button>
          )}
        </div>
      </footer>
    </div>
  )
}
