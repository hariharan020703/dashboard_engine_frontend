import { useEffect, useMemo } from 'react'
import { Clock, Columns3, Database, HardDrive, Layers, Table2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { notify } from '@/components/common/notify'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StepFrame } from '../../components/StepFrame'
import {
  EmptyState,
  EndpointPendingState,
  ErrorState,
  LoadingState,
  NoConnectionState,
  QueryBoundary,
  TableSkeleton,
} from '../../components/DataStates'
import { Cell, SectionHeading, StatTile } from '../../components/primitives'
import {
  formatBytes,
  formatCount,
  formatExact,
  formatPercent,
  formatRelativeTime,
} from '../../components/format'
import { endpoints, isEndpointMissing } from '../../api'
import {
  useConnection,
  useProfileOverview,
  useRunExtraction,
  useTableProfile,
} from '../../queries/hooks'
import { useWorkflow } from '../../state/workflowContext'
import type { ColumnProfile, SampleRecords } from '../../types'

/**
 * Step 3 — Profile.
 *
 * Everything here comes from the SOURCE, not from the AI. The tree is the
 * selection this application stored; a table's columns, types, null rates,
 * distinct counts and sample rows are read live from the warehouse.
 */
export function ProfileStep() {
  const { connectionId, activeTableId, setActiveTableId, goToStep } = useWorkflow()
  const overview = useProfileOverview(connectionId)
  const connection = useConnection(connectionId)
  const runExtraction = useRunExtraction(connectionId)

  /*
   * The datasets to extract from: the SAVED selection, not the draft.
   *
   * Discover writes the selection to the server before it lets you leave, so
   * by the time this step runs the two agree — and if they ever did not, the
   * saved set is the one the profile above was built from and the one the
   * service can resolve. Sending a draft would ask the agent to onboard
   * something nobody committed to.
   */
  const datasetIds = useMemo(
    () => (connection.data?.selectedDatasets ?? []).map((d) => d.id),
    [connection.data]
  )

  // Select the first table automatically, so the pane is never pointlessly empty.
  const firstTableId = useMemo(
    () => overview.data?.datasets.flatMap((d) => d.tables)[0]?.id ?? null,
    [overview.data]
  )
  useEffect(() => {
    if (!activeTableId && firstTableId) setActiveTableId(firstTableId)
  }, [activeTableId, firstTableId, setActiveTableId])

  if (!connectionId) {
    return (
      <StepFrame title="Profile tables and schema" hideNext>
        <NoConnectionState onConnect={() => goToStep('connect')} />
      </StepFrame>
    )
  }

  return (
    <StepFrame
      title="Profile tables and schema"
      description="Structure and statistics for the datasets you selected, read from the source by the backend."
      nextLabel="Analyse with AI"
      nextPending={runExtraction.isPending}
      nextDisabled={datasetIds.length === 0}
      /*
       * This button is the one place the workflow leaves the Node API.
       *
       * It creates a session with the context_layer_extractor agent and sends
       * it the selected dataset ids; the Context Layer service builds the
       * extraction prompt from them. The run is synchronous - `stream: false`
       * holds the request open until the agent is done, which is minutes - so
       * the step stays put and shows progress rather than moving on to an
       * empty screen.
       *
       * Returning false on failure keeps somebody on Profile with their
       * selection intact, instead of advancing to a step that has nothing to
       * show and no way back to the thing that failed.
       */
      onNext={async () => {
        try {
          await runExtraction.mutateAsync({ datasetIds })
          return true
        } catch (err) {
          notify.failure('run the context extraction', err)
          return false
        }
      }}
      footerNote={
        overview.data?.profiledAt
          ? `Selected ${formatRelativeTime(overview.data.profiledAt)} · table details are read live`
          : undefined
      }
    >
      <QueryBoundary
        query={overview}
        step="Profile"
        endpoint={`GET ${endpoints.profileOverview(connectionId)}`}
        context="load the profile"
        loading={<TableSkeleton rows={6} columns={4} />}
        isEmpty={(d) => d.datasets.length === 0}
        empty={
          <EmptyState
            title="No profiled datasets"
            detail="The datasets you selected have not been profiled yet."
          />
        }
      >
        {(data) => (
          <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
            <aside className="lg:sticky lg:top-0 lg:self-start rounded-xl border border-border bg-card p-4 shadow-xs">
              <SectionHeading title="Datasets" />
              <div className="max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
                <nav className="space-y-3">
                  {data.datasets.map((dataset) => (
                    <div key={dataset.datasetId}>
                      <p className="flex items-center gap-1.5 px-1.5 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        <Database className="size-3.5 text-primary/70" aria-hidden />
                        <span className="truncate">{dataset.name}</span>
                        {dataset.tableCount !== null ? (
                          <span className="ml-auto rounded-full bg-muted px-1.5 py-0.5 text-[10px] tabular-nums font-medium text-muted-foreground">
                            {dataset.tableCount}
                          </span>
                        ) : null}
                      </p>
                      <ul className="space-y-1 mt-1">
                        {dataset.tables.map((table) => {
                          const active = table.id === activeTableId
                          return (
                            <li key={table.id}>
                              <button
                                type="button"
                                onClick={() => setActiveTableId(table.id)}
                                className={cn(
                                  'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-all',
                                  active
                                    ? 'bg-primary/10 font-medium text-primary border border-primary/20 shadow-xs'
                                    : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                                )}
                              >
                                <Table2 className="size-3.5 shrink-0 opacity-70" aria-hidden />
                                <span className="truncate">{table.name}</span>
                                <span className="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground">
                                  {formatCount(table.rowCount)}
                                </span>
                              </button>
                            </li>
                          )
                        })}
                        {dataset.tables.length === 0 ? (
                          <li className="px-2 py-1.5 text-xs text-muted-foreground italic">
                            No tables reported
                          </li>
                        ) : null}
                      </ul>
                    </div>
                  ))}
                </nav>
              </div>
            </aside>

            <section className="min-w-0">
              {activeTableId ? (
                <TableDetail connectionId={connectionId} tableId={activeTableId} />
              ) : (
                <EmptyState title="Select a table" detail="Choose a table to see its profile." />
              )}
            </section>
          </div>
        )}
      </QueryBoundary>
    </StepFrame>
  )
}

/** One table's profile. Its own query, fetched on selection. */
function TableDetail({ connectionId, tableId }: { connectionId: string; tableId: string }) {
  const profile = useTableProfile(connectionId, tableId)

  if (profile.isError) {
    return isEndpointMissing(profile.error) ? (
      <EndpointPendingState
        step="Table profile"
        endpoint={`GET ${endpoints.tableProfile(connectionId, tableId)}`}
      />
    ) : (
      <ErrorState
        context="load this table's profile"
        error={profile.error}
        onRetry={() => profile.refetch()}
      />
    )
  }
  if (profile.isPending || !profile.data) return <LoadingState label="Loading table profile…" />

  const table = profile.data

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/60">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
            <Table2 className="size-4" aria-hidden />
          </span>
          <div>
            <h3 className="text-base font-semibold text-foreground tracking-tight">{table.name}</h3>
            {table.description ? (
              <p className="mt-0.5 text-xs text-muted-foreground">{table.description}</p>
            ) : null}
          </div>
        </div>
      </header>

      {/* 4 Stat Tiles: Rows, Columns, Storage, Last refreshed (Quality removed) */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        <StatTile
          icon={<Layers className="size-3.5 text-primary" />}
          label="Rows"
          value={formatCount(table.rowCount)}
        />
        <StatTile
          icon={<Columns3 className="size-3.5 text-primary" />}
          label="Columns"
          value={formatExact(table.columnCount)}
        />
        <StatTile
          icon={<HardDrive className="size-3.5 text-primary" />}
          label="Storage"
          value={formatBytes(table.sizeBytes)}
        />
        <StatTile
          icon={<Clock className="size-3.5 text-primary" />}
          label="Last refreshed"
          value={
            <span className="text-sm font-medium">
              {formatRelativeTime(table.lastRefreshedAt)}
            </span>
          }
        />
      </div>

      <Tabs defaultValue="schema" className="w-full">
        <TabsList className="bg-muted/60 p-1 border border-border/50">
          <TabsTrigger value="schema" className="text-xs font-medium">
            Schema &amp; statistics
          </TabsTrigger>
          <TabsTrigger value="sample" className="text-xs font-medium">
            Sample records
          </TabsTrigger>
        </TabsList>

        <TabsContent value="schema" className="mt-4 focus-visible:outline-none">
          <SchemaTable columns={table.columns} />
          {table.statsSampleSize !== null && table.statsSampleSize > 0 ? (
            <p className="mt-2.5 text-xs text-muted-foreground">
              Null % and unique counts are computed from a sample of{' '}
              <strong className="font-semibold text-foreground">{formatExact(table.statsSampleSize)}</strong> rows
              {table.rowCount !== null && table.rowCount > table.statsSampleSize
                ? ` out of ${formatCount(table.rowCount)}`
                : ''}
              . Column names and types are exact.
            </p>
          ) : null}
        </TabsContent>

        <TabsContent value="sample" className="mt-4 focus-visible:outline-none">
          <SampleTable sample={table.sample} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function SchemaTable({ columns }: { columns: ColumnProfile[] }) {
  if (columns.length === 0) {
    return <EmptyState title="No columns reported" />
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-xs">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <tr className="border-b border-border">
            <th scope="col" className="px-4 py-3 text-left font-medium">
              Column
            </th>
            <th scope="col" className="px-4 py-3 text-left font-medium">
              Type
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              Null %
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              Unique
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {columns.map((column) => (
            <tr key={column.name} className="transition-colors hover:bg-muted/30">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{column.name}</span>
                  {column.isPrimaryKey ? (
                    <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300 border border-amber-500/20">
                      PK
                    </span>
                  ) : null}
                  {column.isForeignKey ? (
                    <span className="rounded bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700 dark:text-sky-300 border border-sky-500/20">
                      FK
                    </span>
                  ) : null}
                </div>
              </td>
              <td className="px-4 py-3 font-mono text-xs font-semibold text-muted-foreground uppercase">
                {column.dataType}
              </td>
              <td className="px-4 py-3 text-right tabular-nums font-medium text-foreground">
                <Cell value={formatPercent(column.nullPercent)} />
              </td>
              <td className="px-4 py-3 text-right tabular-nums font-medium text-foreground">
                <Cell value={formatCount(column.uniqueCount)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SampleTable({ sample }: { sample: SampleRecords | null }) {
  if (!sample || sample.rows.length === 0) {
    return (
      <EmptyState
        title="No sample available"
        detail="The backend did not return sample records for this table."
      />
    )
  }

  return (
    <div className="space-y-2.5">
      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-xs">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <tr className="border-b border-border">
              {sample.columns.map((column) => (
                <th key={column} scope="col" className="whitespace-nowrap px-4 py-3 text-left font-medium">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border font-mono text-xs">
            {sample.rows.map((row, i) => (
              <tr key={i} className="transition-colors hover:bg-muted/30">
                {row.map((value, j) => (
                  <td key={j} className="whitespace-nowrap px-4 py-2.5">
                    {value === null ? (
                      <span className="rounded bg-muted/60 px-1.5 py-0.5 text-[11px] italic text-muted-foreground">
                        null
                      </span>
                    ) : (
                      <span className="text-foreground">{String(value)}</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {sample.sampledFrom !== null ? (
        <p className="text-xs text-muted-foreground">
          {sample.rows.length} rows sampled from <strong className="font-medium text-foreground">{formatCount(sample.sampledFrom)}</strong>.
        </p>
      ) : null}
    </div>
  )
}
