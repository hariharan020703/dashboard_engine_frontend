import { Check, Lock } from 'lucide-react'
import { STEP_ENDPOINT_LIVE } from '../api'
import { WORKFLOW_STEPS, stepIndex, useWorkflow } from '../state/workflowContext'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { WorkflowStepId } from '../types'

/**
 * The persistent stepper.
 *
 * It is a navigation control, not a decoration: a step already reached can be
 * jumped back to, which is how somebody changes a dataset selection without
 * losing the work after it. A step not yet reached is disabled rather than
 * hidden, so the shape of the whole workflow is visible from step one.
 *
 * Every step carries a tooltip that says where it stands and, when it is
 * locked, exactly which step unlocks it. A disabled control that does not
 * explain itself reads as a bug; naming the blocking step turns "why can't I
 * click this" into an instruction.
 */

type StepState = 'complete' | 'current' | 'locked' | 'upcoming'

/**
 * The sentence under each step's title.
 *
 * Kept as one function so the wording cannot drift between the tooltip and the
 * `title` attribute, and so the locked case has one phrasing rather than a
 * different guess at each call site.
 */
function stepHint(
  state: StepState,
  blockingLabel: string | null,
  pendingBackend: boolean
): string {
  if (state === 'current') return 'You are here.'
  if (state === 'complete') return 'Completed — select to revisit this step.'
  if (state === 'locked' && blockingLabel) {
    return `Complete “${blockingLabel}” to proceed to this step.`
  }
  if (pendingBackend) return 'Waiting on its backend endpoint.'
  return 'Not started yet.'
}

export function Stepper() {
  const { step, furthestStep, canEnter, goToStep } = useWorkflow()
  const currentIndex = stepIndex(step)
  const furthestIndex = stepIndex(furthestStep)

  /**
   * The step that has to be finished before a locked one opens.
   *
   * It is the furthest step reached, not the one immediately before the target:
   * if somebody is on Discover and hovers Publish, telling them to "complete
   * Review" is true but useless — the thing actually in their way is the step
   * they are standing on.
   */
  const blockingLabel = WORKFLOW_STEPS[furthestIndex]?.label ?? null

  const stateFor = (index: number, id: WorkflowStepId): StepState => {
    if (id === step) return 'current'
    if (index < currentIndex || index <= furthestIndex) return 'complete'
    return canEnter(id) ? 'upcoming' : 'locked'
  }

  return (
    <nav aria-label="Context layer progress" className="w-full">
      <ol className="flex w-full items-center">
        {WORKFLOW_STEPS.map((s, i) => {
          const state = stateFor(i, s.id)
          const reachable = canEnter(s.id)
          const pending = !STEP_ENDPOINT_LIVE[s.id]
          const hint = stepHint(state, state === 'locked' ? blockingLabel : null, pending)

          return (
            <li key={s.id} className="flex flex-1 items-center last:flex-none">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    disabled={!reachable}
                    onClick={() => reachable && goToStep(s.id)}
                    aria-current={state === 'current' ? 'step' : undefined}
                    /*
                     * Both the accessible name and the native tooltip carry the
                     * hint, so the reason a step is locked is available to a
                     * screen reader and to a browser that renders `title`, not
                     * only to a mouse hovering the styled tooltip.
                     */
                    aria-label={`Step ${i + 1}: ${s.label}. ${hint}`}
                    title={`${s.label} — ${hint}`}
                    className={cn(
                      'group flex items-center gap-2 rounded-md px-1.5 py-1 text-left transition-colors',
                      reachable ? 'cursor-pointer' : 'cursor-not-allowed',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                    )}
                  >
                    <span
                      className={cn(
                        'relative flex size-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold transition-colors',
                        state === 'current' &&
                          'border-primary bg-primary text-primary-foreground',
                        state === 'complete' && 'border-primary/40 bg-primary/10 text-primary',
                        (state === 'locked' || state === 'upcoming') &&
                          'border-border bg-background text-muted-foreground'
                      )}
                    >
                      {state === 'complete' ? (
                        <Check className="size-3.5" aria-hidden />
                      ) : state === 'locked' ? (
                        <Lock className="size-3" aria-hidden />
                      ) : (
                        i + 1
                      )}
                      {pending ? (
                        <span
                          className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-amber-500 ring-2 ring-background"
                          aria-hidden
                        />
                      ) : null}
                    </span>

                    <span className="hidden min-w-0 flex-col md:flex">
                      <span
                        className={cn(
                          'truncate text-xs font-medium leading-tight',
                          state === 'current' ? 'text-foreground' : 'text-muted-foreground'
                        )}
                      >
                        {s.label}
                      </span>
                      <span className="truncate text-[11px] leading-tight text-muted-foreground/70">
                        {s.description}
                      </span>
                    </span>
                  </button>
                </TooltipTrigger>

                <TooltipContent side="bottom" className="max-w-[240px]">
                  <p className="font-medium">
                    Step {i + 1} of {WORKFLOW_STEPS.length}: {s.label}
                  </p>
                  <p className="mt-0.5 text-xs opacity-80">{s.description}</p>
                  <p
                    className={cn(
                      'mt-1.5 text-xs',
                      state === 'locked' ? 'text-amber-300' : 'opacity-80'
                    )}
                  >
                    {hint}
                  </p>
                  {pending && state !== 'locked' ? (
                    <p className="mt-1 text-xs text-amber-300">
                      This step's backend endpoint is not built yet.
                    </p>
                  ) : null}
                </TooltipContent>
              </Tooltip>

              {i < WORKFLOW_STEPS.length - 1 ? (
                <span
                  aria-hidden
                  className={cn(
                    'mx-2 h-px flex-1 transition-colors',
                    i < furthestIndex ? 'bg-primary/40' : 'bg-border'
                  )}
                />
              ) : null}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
