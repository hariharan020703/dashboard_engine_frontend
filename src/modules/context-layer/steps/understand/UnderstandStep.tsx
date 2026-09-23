import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Loader2, Sparkles, Terminal, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { notify } from '@/components/common/notify'
import { StepFrame } from '../../components/StepFrame'
import { EmptyState, ErrorState, NoConnectionState } from '../../components/DataStates'
import { SectionHeading } from '../../components/primitives'
import {
  useConnection,
  useContextObjects,
  useExtraction,
  useRunExtraction,
} from '../../queries/hooks'
import { useWorkflow } from '../../state/workflowContext'
import type { ExtractionResult } from '../../api/extractionApi'
import type { ContextObjects } from '../../api/contextObjectsApi'
import { ContextObjectList } from './ContextObjectList'

/**
 * Step 4 — Understand. The first AI-produced step.
 *
 * What it shows is the output of the `context_layer_extractor` agent, run
 * against the Context Layer service — NOT the Node API. Profile's
 * "Analyse with AI" starts that run; this step displays what came back.
 *
 * The result is read back from the agent's own session rather than only
 * remembered in the browser, so an expensive run survives a reload and is
 * still here tomorrow. `useExtraction` fetches the latest session's transcript;
 * a run started from Profile writes straight into the same cache entry, so
 * arriving here immediately after one shows it without a second round trip.
 *
 * Nothing about the content is known to this component. The agent writes
 * markdown and it is rendered as markdown — there is no expected heading, no
 * fallback text, no placeholder finding.
 */
export function UnderstandStep() {
  const { connectionId, goToStep } = useWorkflow()
  const connection = useConnection(connectionId)
  const extraction = useExtraction(connectionId)
  const facts = useContextObjects(connectionId)
  const rerun = useRunExtraction(connectionId)

  if (!connectionId) {
    return (
      <StepFrame title="Understand your data" hideNext>
        <NoConnectionState onConnect={() => goToStep('connect')} />
      </StepFrame>
    )
  }

  const datasetIds = (connection.data?.selectedDatasets ?? []).map((d) => d.id)

  const run = async () => {
    try {
      await rerun.mutateAsync({ datasetIds })
      notify.success('Extraction finished.')
    } catch (err) {
      notify.failure('run the context extraction', err)
    }
  }

  const result = extraction.data ?? null
  const running = rerun.isPending

  return (
    <StepFrame
      title="Understand your data"
      description="What the extraction agent found in the datasets you selected."
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={run}
          disabled={running || datasetIds.length === 0}
        >
          {running ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Sparkles className="size-4" aria-hidden />
          )}
          {result ? 'Run again' : 'Run extraction'}
        </Button>
      }
      footerNote={result ? `Session ${result.sessionId}` : undefined}
    >
      {running ? (
        <RunningState count={datasetIds.length} />
      ) : extraction.isPending ? (
        <RunningState count={datasetIds.length} loadingOnly />
      ) : extraction.isError ? (
        <ErrorState
          context="reach the context extraction service"
          error={extraction.error}
          onRetry={() => extraction.refetch()}
        />
      ) : result || (facts.data && facts.data.count > 0) ? (
        <ExtractionView result={result} facts={facts.data ?? null} />
      ) : (
        <EmptyState
          title="No extraction yet"
          detail={
            datasetIds.length === 0
              ? 'Select datasets in Discover first — the agent is given those ids to work from.'
              : 'Run the extraction to have the agent read the selected datasets and write what it finds into the context layer.'
          }
          action={
            datasetIds.length > 0 ? (
              <Button size="sm" onClick={run}>
                <Sparkles className="size-4" aria-hidden />
                Run extraction
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={() => goToStep('discover')}>
                Go to Discover
              </Button>
            )
          }
        />
      )}
    </StepFrame>
  )
}

/**
 * The run is synchronous and long.
 *
 * Saying roughly what it is doing, and that minutes are expected, is the
 * difference between waiting and assuming it has hung.
 */
function RunningState({ count, loadingOnly }: { count: number; loadingOnly?: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed px-6 py-16 text-center">
      <Loader2 className="mb-4 size-6 animate-spin text-primary" aria-hidden />
      <p className="text-sm font-medium">
        {loadingOnly ? 'Looking for a previous run…' : 'Extracting context'}
      </p>
      {loadingOnly ? null : (
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          The agent is reading {count} dataset{count === 1 ? '' : 's'} and writing what it
          finds into the context layer. It runs to completion before answering, so a few
          minutes is normal.
        </p>
      )}
    </div>
  )
}

/**
 * Two things, and the order is the point.
 *
 * The FACTS come first: they are what the run actually wrote into the context
 * layer, read back from the store. The agent's REPORT comes second — it is its
 * own account of the run, which is useful but is prose, and the two can
 * disagree. Leading with the prose would invite reading the account as the
 * outcome.
 */
function ExtractionView({
  result,
  facts,
}: {
  result: ExtractionResult | null
  facts: ContextObjects | null
}) {
  return (
    <div className="space-y-5">
      {result?.interrupted ? (
        <div className="flex items-start gap-2.5 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950/40">
          <TriangleAlert
            className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400"
            aria-hidden
          />
          <p className="text-amber-800 dark:text-amber-200">
            This run was interrupted before it finished, so what follows may be incomplete.
          </p>
        </div>
      ) : null}

      {facts ? (
        <section>
          <SectionHeading
            title="Facts written to the context layer"
            description={
              facts.resolvedSessionId
                ? `${facts.count} object${facts.count === 1 ? '' : 's'} from run ${facts.resolvedSessionId}`
                : 'No run has written to this connection yet.'
            }
          />
          <ContextObjectList objects={facts.objects} />
        </section>
      ) : null}

      {result ? (
        <section>
          <SectionHeading
            title="Agent report"
            description="The agent's own account of the run, in its words."
          />
          <article className="rounded-lg border bg-card px-4 py-3">
            <div className="prose prose-sm dark:prose-invert max-w-none [&_table]:text-xs">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.text}</ReactMarkdown>
            </div>
          </article>
        </section>
      ) : null}

      {/*
        The tools it called, in order.

        Shown because this agent WRITES — every upsert is a change to the
        context other things will read — and "what did that run actually do"
        should not require going to the server logs. Only a live run carries
        them; a transcript read back later does not, so an empty list here is
        not the same as "it called nothing".
      */}
      {result && result.toolCalls.length > 0 ? (
        <section>
          <SectionHeading
            title="Tools called"
            description={`${result.toolCalls.length} call${
              result.toolCalls.length === 1 ? '' : 's'
            }, in order`}
          />
          <div className="flex flex-wrap gap-1.5">
            {result.toolCalls.map((tool, i) => (
              <Badge
                key={`${tool}-${i}`}
                variant="secondary"
                className="gap-1 font-mono text-xs"
              >
                <Terminal className="size-3" aria-hidden />
                {tool}
              </Badge>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}
