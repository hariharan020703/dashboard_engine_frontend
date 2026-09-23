import { useState } from 'react'
import { AlertTriangle, CheckCircle2, Loader2, Rocket, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { notify } from '@/components/common/notify'
import { cn } from '@/lib/utils'
import { StepFrame } from '../../components/StepFrame'
import {
  EmptyState,
  NoConnectionState,
  QueryBoundary,
  TableSkeleton,
} from '../../components/DataStates'
import { SectionHeading, StatTile } from '../../components/primitives'
import { formatDateTime, formatExact } from '../../components/format'
import { endpoints } from '../../api'
import { usePublish, usePublishSummary, useValidatePublish } from '../../queries/hooks'
import { useWorkflow } from '../../state/workflowContext'
import type { PublishBlocker, PublishResult, PublishSummary } from '../../types'

/**
 * Step 7 — Publish.
 *
 * Every number on this screen is read from the backend, not tallied from what
 * the UI happens to be holding. That is the whole point of the step: it states
 * what is about to become visible to chat, dashboards, reports and agents, and
 * a count derived from client state would be describing the browser's idea of
 * the context rather than the one that will actually be published.
 *
 * Validation runs before publishing and is also the backend's: "is this
 * publishable" depends on required metadata, unresolved review items and
 * invalid relationships, none of which the frontend can see.
 */
export function PublishStep() {
  const { connectionId, goToStep } = useWorkflow()
  const summary = usePublishSummary(connectionId)
  const validate = useValidatePublish(connectionId)
  const publish = usePublish(connectionId)

  const [notifyTeam, setNotifyTeam] = useState(true)
  const [published, setPublished] = useState<PublishResult | null>(null)

  if (!connectionId) {
    return (
      <StepFrame title="Publish context layer" hideNext>
        <NoConnectionState onConnect={() => goToStep('connect')} />
      </StepFrame>
    )
  }

  const run = async () => {
    try {
      // Pre-flight first. Publishing into a failed validation is how a broken
      // context reaches the things that read it.
      const verdict = await validate.mutateAsync()
      if (!verdict.valid) {
        notify.error(
          'This context cannot be published yet.',
          `${verdict.blockers.length} item${verdict.blockers.length === 1 ? '' : 's'} need attention.`
        )
        return
      }
      const result = await publish.mutateAsync({ notifyTeam })
      setPublished(result)
      notify.success('Context published.', `Version ${result.version}`)
    } catch (err) {
      notify.failure('publish the context layer', err)
    }
  }

  const busy = validate.isPending || publish.isPending

  return (
    <StepFrame
      title="Publish context layer"
      description="Review the summary and publish. This makes the context available to chat, dashboards, reports and agents."
      hideNext
    >
      <QueryBoundary
        query={summary}
        step="Publish"
        endpoint={`GET ${endpoints.publishSummary(connectionId)}`}
        context="load the publish summary"
        loading={<TableSkeleton rows={4} columns={5} />}
      >
        {(data) => (
          <div className="space-y-5">
            {published ? (
              <PublishedBanner result={published} />
            ) : (
              <ReadinessBanner summary={data} />
            )}

            {data.stats.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {data.stats.map((stat) => (
                  <StatTile key={stat.id} label={stat.label} value={stat.value} />
                ))}
              </div>
            ) : null}

            <div className="grid gap-5 lg:grid-cols-2">
              <section>
                <SectionHeading title="Included datasets" />
                {data.datasets.length === 0 ? (
                  <EmptyState title="No datasets included" />
                ) : (
                  <ul className="divide-y rounded-lg border bg-card">
                    {data.datasets.map((dataset) => (
                      <li
                        key={dataset.id}
                        className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                      >
                        <span className="truncate">{dataset.name}</span>
                        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                          {dataset.tableCount !== null
                            ? `${formatExact(dataset.tableCount)} tables`
                            : '—'}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section>
                <SectionHeading title="What will be published" />
                {data.content.length === 0 ? (
                  <EmptyState title="Nothing listed" />
                ) : (
                  <ul className="space-y-1.5 rounded-lg border bg-card p-3">
                    {data.content.map((entry) => (
                      <li key={entry.id} className="flex items-center gap-2 text-sm">
                        <CheckCircle2
                          className={cn(
                            'size-4 shrink-0',
                            entry.included
                              ? 'text-emerald-600'
                              : 'text-muted-foreground/40'
                          )}
                          aria-hidden
                        />
                        <span className={cn(!entry.included && 'text-muted-foreground')}>
                          {entry.label}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            {data.blockers.length > 0 ? (
              <BlockerList blockers={data.blockers} onGoTo={goToStep} />
            ) : null}

            {published ? null : (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="notify-team"
                    checked={notifyTeam}
                    onCheckedChange={(checked) => setNotifyTeam(checked === true)}
                  />
                  <Label htmlFor="notify-team" className="text-sm font-normal">
                    Notify team after publishing
                  </Label>
                </div>

                <Button onClick={run} disabled={busy || !data.ready}>
                  {busy ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                      {validate.isPending ? 'Validating…' : 'Publishing…'}
                    </>
                  ) : (
                    <>
                      <Rocket className="size-4" aria-hidden />
                      Publish
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </QueryBoundary>
    </StepFrame>
  )
}

function ReadinessBanner({ summary }: { summary: PublishSummary }) {
  const ready = summary.ready && summary.blockers.length === 0
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border p-4',
        ready
          ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40'
          : 'border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40'
      )}
    >
      {ready ? (
        <ShieldCheck
          className="mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-400"
          aria-hidden
        />
      ) : (
        <AlertTriangle
          className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400"
          aria-hidden
        />
      )}
      <div>
        <p
          className={cn(
            'text-sm font-medium',
            ready
              ? 'text-emerald-800 dark:text-emerald-200'
              : 'text-amber-800 dark:text-amber-200'
          )}
        >
          {ready ? 'Ready to publish' : 'Not ready to publish'}
        </p>
        <p
          className={cn(
            'mt-0.5 text-sm',
            ready
              ? 'text-emerald-700 dark:text-emerald-300'
              : 'text-amber-700 dark:text-amber-300'
          )}
        >
          {ready
            ? 'The backend reports this context as complete. Review the details below before publishing.'
            : `${summary.blockers.length} item${summary.blockers.length === 1 ? '' : 's'} must be resolved first.`}
        </p>
      </div>
    </div>
  )
}

function PublishedBanner({ result }: { result: PublishResult }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-emerald-300 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/40">
      <CheckCircle2
        className="mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-400"
        aria-hidden
      />
      <div>
        <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
          Published successfully
        </p>
        <p className="mt-0.5 text-sm text-emerald-700 dark:text-emerald-300">
          Version {result.version} · {formatDateTime(result.publishedAt)}
        </p>
      </div>
    </div>
  )
}

function BlockerList({
  blockers,
  onGoTo,
}: {
  blockers: PublishBlocker[]
  onGoTo: (step: NonNullable<PublishBlocker['step']>) => void
}) {
  return (
    <section>
      <SectionHeading title="Needs attention" />
      <ul className="space-y-2">
        {blockers.map((blocker) => (
          <li
            key={blocker.id}
            className={cn(
              'flex flex-wrap items-center gap-2 rounded-lg border-l-2 bg-card p-3 text-sm',
              blocker.severity === 'blocker' ? 'border-l-rose-500' : 'border-l-amber-500'
            )}
          >
            <AlertTriangle
              className={cn(
                'size-4 shrink-0',
                blocker.severity === 'blocker' ? 'text-rose-500' : 'text-amber-500'
              )}
              aria-hidden
            />
            <span className="min-w-0 flex-1">{blocker.message}</span>
            {blocker.step ? (
              <Button size="sm" variant="outline" onClick={() => onGoTo(blocker.step!)}>
                Go to {blocker.step}
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  )
}
