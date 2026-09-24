import { useEffect, useMemo, useState } from 'react'
import { Clock, Columns3, HardDrive, Layers, Search, Table2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { notify } from '@/components/common/notify'
import { Input } from '@/components/ui/input'
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
import { Cell, StatTile } from '../../components/primitives'
import { Pagination } from '../../components/Pagination'
import { usePagination } from '../../components/usePagination'
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
import type { ColumnProfile, ProfileTableRef, SampleRecords } from '../../types'

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
            <TableNav
              tables={data.datasets.flatMap((d) => d.tables)}
              activeTableId={activeTableId}
              onSelect={setActiveTableId}
            />

            <section className="min-w-0">
              {activeTableId ? (
                <TableDetail key={activeTableId} connectionId={connectionId} tableId={activeTableId} />
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

/**
 * The left-hand list: table names only, flattened across datasets.
 *
 * A Domo dataset is one table, so grouping by dataset printed every name
 * twice - once as the heading, once as its only row.
 */
function TableNav({
  tables,
  activeTableId,
  onSelect,
}: {
  tables: ProfileTableRef[]
  activeTableId: string | null
  onSelect: (id: string) => void
}) {
  const [search, setSearch] = useState('')
  const query = search.trim().toLowerCase()
  const visible = query ? tables.filter((t) => t.name.toLowerCase().includes(query)) : tables

  return (
    <aside className="lg:sticky lg:top-0 lg:self-start overflow-hidden rounded-xl border border-border bg-card shadow-xs">
      <div className="border-b border-border bg-muted/30 px-4 py-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Tables</h3>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-primary">
            {tables.length}
          </span>
        </div>
        {tables.length > 5 ? (
          <div className="relative mt-2.5">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter tables…"
              aria-label="Filter tables"
              className="h-8 pl-8 text-xs"
            />
          </div>
        ) : null}
      </div>

      <nav className="max-h-[calc(100vh-300px)] overflow-y-auto p-2">
        <ul className="space-y-0.5">
          {visible.map((table) => {
            const active = table.id === activeTableId
            return (
              <li key={table.id}>
                <button
                  type="button"
                  onClick={() => onSelect(table.id)}
                  title={table.name}
                  aria-current={active ? 'true' : undefined}
                  className={cn(
                    'group relative flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                    active
                      ? 'bg-primary/10 font-medium text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  {active ? (
                    <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-primary" aria-hidden />
                  ) : null}
                  <Table2
                    className={cn('size-3.5 shrink-0', active ? 'text-primary' : 'opacity-60')}
                    aria-hidden
                  />
                  <span className="truncate">{table.name}</span>
                </button>
              </li>
            )
          })}
        </ul>
        {tables.length === 0 ? (
          <p className="px-3 py-2 text-xs italic text-muted-foreground">No tables reported</p>
        ) : visible.length === 0 ? (
          <p className="px-3 py-2 text-xs italic text-muted-foreground">No tables match “{search}”</p>
        ) : null}
      </nav>
    </aside>
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
          <TabsTrigger value="schema" className="gap-1.5 text-xs font-medium">
            Schema &amp; statistics
            <TabCount value={table.columns.length} />
          </TabsTrigger>
          <TabsTrigger value="sample" className="gap-1.5 text-xs font-medium">
            Sample records
            {table.sample ? <TabCount value={table.sample.rows.length} /> : null}
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

function TabCount({ value }: { value: number }) {
  return (
    <span className="rounded-full bg-muted px-1.5 py-px text-[10px] font-semibold tabular-nums text-muted-foreground">
      {formatExact(value)}
    </span>
  )
}

/**
 * A colour per broad type family, so a numeric column reads differently from
 * a text one at a glance. Presentation only - the label is the source's own
 * type name, unchanged.
 */
function typeTone(dataType: string): string {
  const t = dataType.toLowerCase()
  if (/int|long|decimal|double|float|number|numeric|real/.test(t))
    return 'bg-sky-500/10 text-sky-700 border-sky-500/20 dark:text-sky-300'
  if (/date|time/.test(t)) return 'bg-violet-500/10 text-violet-700 border-violet-500/20 dark:text-violet-300'
  if (/bool/.test(t)) return 'bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-300'
  return 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-300'
}

function NullRate({ value }: { value: number | null }) {
  if (value === null) return <Cell value={null} />
  const tone = value >= 50 ? 'bg-red-500' : value >= 10 ? 'bg-amber-500' : 'bg-emerald-500'
  return (
    <div className="flex items-center justify-end gap-2">
      <span className="font-medium tabular-nums text-foreground">{formatPercent(value)}</span>
      <span className="h-1.5 w-14 overflow-hidden rounded-full bg-muted" aria-hidden>
        <span
          className={cn('block h-full rounded-full', tone)}
          style={{ width: `${Math.min(100, Math.max(value > 0 ? 3 : 0, value))}%` }}
        />
      </span>
    </div>
  )
}

function SchemaTable({ columns }: { columns: ColumnProfile[] }) {
  const [search, setSearch] = useState('')
  const query = search.trim().toLowerCase()
  const filtered = query
    ? columns.filter(
        (c) => c.name.toLowerCase().includes(query) || c.dataType.toLowerCase().includes(query)
      )
    : columns
  const paging = usePagination(filtered)

  if (columns.length === 0) {
    return <EmptyState title="No columns reported" />
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5">
        <p className="text-xs text-muted-foreground">
          <strong className="font-semibold text-foreground">{formatExact(columns.length)}</strong> columns
        </p>
        <div className="relative w-full sm:w-56">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              paging.setPage(1)
            }}
            placeholder="Filter columns or types…"
            aria-label="Filter columns"
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <tr className="border-b border-border">
              <th scope="col" className="w-12 px-4 py-3 text-right font-medium">
                #
              </th>
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
            {paging.pageItems.map((column, i) => (
              <tr key={column.name} className="transition-colors hover:bg-muted/30">
                <td className="px-4 py-3 text-right text-xs tabular-nums text-muted-foreground">
                  {paging.startIndex + i + 1}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{column.name}</span>
                    {column.isPrimaryKey ? (
                      <span className="rounded border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                        PK
                      </span>
                    ) : null}
                    {column.isForeignKey ? (
                      <span className="rounded border border-sky-500/20 bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700 dark:text-sky-300">
                        FK
                      </span>
                    ) : null}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      'inline-block rounded-md border px-2 py-0.5 font-mono text-[11px] font-semibold uppercase',
                      typeTone(column.dataType)
                    )}
                  >
                    {column.dataType}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <NullRate value={column.nullPercent} />
                </td>
                <td className="px-4 py-3 text-right font-medium tabular-nums text-foreground">
                  <Cell value={formatCount(column.uniqueCount)} />
                </td>
              </tr>
            ))}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-xs italic text-muted-foreground">
                  No columns match “{search}”
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <Pagination {...paging} noun="columns" />
    </div>
  )
}

function SampleTable({ sample }: { sample: SampleRecords | null }) {
  const paging = usePagination(sample?.rows ?? [])

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
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <tr className="border-b border-border">
                <th
                  scope="col"
                  className="sticky left-0 z-10 w-12 border-r border-border bg-muted px-3 py-3 text-right font-medium"
                >
                  #
                </th>
                {sample.columns.map((column) => (
                  <th key={column} scope="col" className="whitespace-nowrap px-4 py-3 text-left font-medium">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-mono text-xs">
              {paging.pageItems.map((row, i) => (
                <tr key={paging.startIndex + i} className="group transition-colors hover:bg-muted/30">
                  <td className="sticky left-0 z-10 border-r border-border bg-card px-3 py-2.5 text-right tabular-nums text-muted-foreground group-hover:bg-muted">
                    {paging.startIndex + i + 1}
                  </td>
                  {row.map((value, j) => (
                    <td key={j} className="max-w-[260px] whitespace-nowrap px-4 py-2.5">
                      {value === null ? (
                        <span className="rounded bg-muted/60 px-1.5 py-0.5 text-[11px] italic text-muted-foreground">
                          null
                        </span>
                      ) : (
                        <span className="block truncate text-foreground" title={String(value)}>
                          {String(value)}
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination {...paging} noun="records" />
      </div>
      {sample.sampledFrom !== null ? (
        <p className="text-xs text-muted-foreground">
          {formatExact(sample.rows.length)} rows sampled from{' '}
          <strong className="font-medium text-foreground">{formatCount(sample.sampledFrom)}</strong>.
        </p>
      ) : null}
    </div>
  )
}
