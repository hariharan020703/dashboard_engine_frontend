import type { ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ChevronRight, Loader2, Sparkles, Terminal, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { notify } from '@/components/common/notify'
import { StepFrame } from '../../components/StepFrame'
import {
  BusyOverlay,
  CardSkeleton,
  EmptyState,
  ErrorState,
  NoConnectionState,
  TileSkeleton,
} from '../../components/DataStates'
import { SectionHeading } from '../../components/primitives'
import {
  useConnection,
  useContextObjects,
  useExtraction,
  useRunExtraction,
  useUnderstanding,
} from '../../queries/hooks'
import { useWorkflow } from '../../state/workflowContext'
import type { ExtractionResult } from '../../api/extractionApi'
import type { ContextObjects } from '../../api/contextObjectsApi'
import type { Understanding } from '../../types'
import { ContextObjectList } from './ContextObjectList'
import { GlossaryView } from './GlossaryView'

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
  const glossary = useUnderstanding(connectionId)
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
  const hasContent = Boolean(result || (glossary.data && glossary.data.stats.termsGenerated > 0))

  const body = extraction.isPending || (glossary.isPending && !result) ? (
    <UnderstandSkeleton />
  ) : extraction.isError ? (
    <ErrorState
      context="reach the context extraction service"
      error={extraction.error}
      onRetry={() => extraction.refetch()}
    />
  ) : hasContent ? (
    <ExtractionView
      connectionId={connectionId}
      result={result}
      facts={facts.data ?? null}
      glossary={glossary.data ?? null}
      glossaryLoading={glossary.isPending}
    />
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
  )

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
      refreshing={!running && (glossary.isFetching || extraction.isFetching) && hasContent}
    >
      {running ? (
        /*
         * A run holds the request open for minutes. Whatever is already on
         * screen stays visible underneath, dimmed, so it is clear what is
         * about to be replaced; with nothing yet, the glossary's skeleton
         * stands in for it.
         */
        <div className="relative min-h-[480px]">
          {hasContent ? body : <UnderstandSkeleton />}
          <BusyOverlay
            title="Analysing your data with AI"
            detail={`Reading ${datasetIds.length} dataset${datasetIds.length === 1 ? '' : 's'} and generating the business glossary, metrics and relationships. This can take a few minutes.`}
          />
        </div>
      ) : (
        body
      )}
    </StepFrame>
  )
}

/** The glossary's shape — tiles, then the table card — while it loads. */
function UnderstandSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <TileSkeleton count={3} />
      <CardSkeleton rows={8} columns={6} />
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
  connectionId,
  result,
  facts,
  glossary,
  glossaryLoading,
}: {
  connectionId: string
  result: ExtractionResult | null
  facts: ContextObjects | null
  glossary: Understanding | null
  glossaryLoading: boolean
}) {
  return (
    <div className="space-y-6">

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

      {/*
        The glossary leads: it is what the run recorded, read back from the
        store. The raw facts (every column included) and the run's own report
        sit below it, collapsed - one is detail, the other is prose about the
        run, and neither should be read before the outcome.
      */}
      {glossary ? (
        <GlossaryView connectionId={connectionId} />
      ) : glossaryLoading ? (
        <UnderstandSkeleton />
      ) : null}

      {facts && facts.count > 0 ? (
        <Collapsible
          title={`All facts written (${facts.count})`}
          description={
            facts.resolvedSessionId
              ? `Every object from run ${facts.resolvedSessionId}, including column statistics.`
              : undefined
          }
        >
          <ContextObjectList connectionId={connectionId} />
        </Collapsible>
      ) : null}

      {result ? (
        <Collapsible
          title="Agent report"
          description="The agent's own account of the run, in its words."
        >
          <article className="rounded-lg border bg-card px-4 py-3">
            <div className="prose prose-sm dark:prose-invert max-w-none [&_table]:text-xs">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.text}</ReactMarkdown>
            </div>
          </article>
        </Collapsible>
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

/** A section that starts closed. Native `<details>`, so it needs no state. */
function Collapsible({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <details className="group rounded-xl border bg-card">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <ChevronRight
          className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90"
          aria-hidden
        />
        <span className="text-sm font-semibold">{title}</span>
        {description ? (
          <span className="truncate text-xs text-muted-foreground">{description}</span>
        ) : null}
      </summary>
      <div className="border-t px-4 py-4">{children}</div>
    </details>
  )
}
