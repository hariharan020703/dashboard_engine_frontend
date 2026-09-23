import type { ReactNode } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { WORKFLOW_STEPS, stepIndex, useWorkflow } from '../state/workflowContext'
import { cn } from '@/lib/utils'

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
}) {
  const { step, next, back } = useWorkflow()
  const index = stepIndex(step)
  const isFirst = index === 0
  const isLast = index === WORKFLOW_STEPS.length - 1

  const handleNext = async () => {
    if (onNext) {
      const result = await onNext()
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

      <div className="min-h-0 flex-1 overflow-auto px-6 py-5">{children}</div>

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
            <Button variant="ghost" size="sm" onClick={back}>
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
            <Button size="sm" onClick={handleNext} disabled={nextDisabled || nextPending}>
              {nextPending ? 'Saving…' : nextLabel ?? 'Next'}
              {!nextPending ? <ArrowRight className="size-4" aria-hidden /> : null}
            </Button>
          )}
        </div>
      </footer>
    </div>
  )
}
