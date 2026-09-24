import { useDeferredValue, useMemo, useState } from 'react'
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Info,
  RefreshCw,
  Search,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { notify } from '@/components/common/notify'
import { cn } from '@/lib/utils'
import { StepFrame } from '../../components/StepFrame'
import { EmptyState, QueryBoundary, TableSkeleton } from '../../components/DataStates'
import { Cell } from '../../components/primitives'
import {
  EMPTY,
  formatBytes,
  formatCount,
  formatExact,
  formatPercent,
  formatRelativeTime,
  formatText,
} from '../../components/format'
import { endpoints } from '../../api'
import { DATASET_LIMIT_OPTIONS, DEFAULT_DATASET_LIMIT } from '../../config'
import { useConnection, useDatasets, useSaveSelection } from '../../queries/hooks'
import { useWorkflow } from '../../state/workflowContext'
import { NoConnectionState } from '../../components/DataStates'
import type { WarehouseDataset } from '../../types'

/**
 * Step 2 — Discover.
 *
 * The dataset list is whatever the backend read from the warehouse through the
 * stored credential. Nothing on this screen is authored here: no example
 * dataset, no placeholder row count, no invented schema name.
 *
 * The column set is derived from the response rather than declared. A column
 * appears only when at least one row actually carries that field, so the
 * backend adding `sizeBytes` later lights up a Size column with no frontend
 * change — and a field it does not send is absent rather than rendered as a
 * plausible-looking zero. Within a visible column, an individual row missing
 * the value shows "—", because "not reported" and "zero" are different facts.
 */

/** One column of the table, and how to read it off a dataset row. */
interface ColumnDef {
  id: string
  header: string
  align?: 'right'
  /** True when any row carries this field — the test that shows the column. */
  present: (rows: WarehouseDataset[]) => boolean
  render: (row: WarehouseDataset) => React.ReactNode
  /** What the search box matches against, when this column is searchable. */
  search?: (row: WarehouseDataset) => string
}

const has = <K extends keyof WarehouseDataset>(key: K) => (rows: WarehouseDataset[]) =>
  rows.some((r) => r[key] !== undefined && r[key] !== null)

const COLUMNS: ColumnDef[] = [
  {
    id: 'name',
    header: 'Dataset',
    present: () => true,
    search: (r) => `${r.name} ${r.description ?? ''}`,
    render: (r) => (
      <div className="min-w-0">
        <p className="truncate font-medium">{r.name}</p>
        {r.description ? (
          <p className="truncate text-xs text-muted-foreground">{r.description}</p>
        ) : null}
      </div>
    ),
  },
  {
    id: 'type',
    header: 'Type',
    present: has('type'),
    render: (r) => <Cell value={formatText(r.type)} />,
  },
  {
    id: 'schema',
    header: 'Schema',
    present: has('schema'),
    search: (r) => r.schema ?? '',
    render: (r) => <Cell value={formatText(r.schema)} />,
  },
  {
    id: 'tables',
    header: 'Tables',
    align: 'right',
    present: has('tableCount'),
    render: (r) => <Cell value={formatExact(r.tableCount)} />,
  },
  {
    id: 'columns',
    header: 'Columns',
    align: 'right',
    present: has('columnCount'),
    render: (r) => <Cell value={formatExact(r.columnCount)} />,
  },
  {
    id: 'rows',
    header: 'Rows',
    align: 'right',
    present: has('rowCount'),
    render: (r) => <Cell value={formatCount(r.rowCount)} />,
  },
  {
    id: 'size',
    header: 'Size',
    align: 'right',
    present: has('sizeBytes'),
    // A byte count the BACKEND calculated. Formatted here, never derived here.
    render: (r) => <Cell value={formatBytes(r.sizeBytes)} />,
  },
  {
    id: 'owner',
    header: 'Owner',
    present: has('owner'),
    search: (r) => r.owner ?? '',
    render: (r) => <Cell value={formatText(r.owner)} />,
  },
  {
    id: 'quality',
    header: 'Quality',
    align: 'right',
    present: has('qualityScore'),
    render: (r) => <Cell value={formatPercent(r.qualityScore)} />,
  },
  {
    id: 'metadata',
    header: 'Metadata',
    present: has('metadataStatus'),
    render: (r) => <Cell value={formatText(r.metadataStatus)} />,
  },
  {
    id: 'updated',
    header: 'Last updated',
    align: 'right',
    present: has('lastUpdated'),
    render: (r) => <Cell value={formatRelativeTime(r.lastUpdated)} />,
  },
]

export function DiscoverStep() {
  const { connectionId, selectedDatasetIds, setSelectedDatasetIds, goToStep } = useWorkflow()

  /**
   * How many datasets to ask the warehouse for.
   *
   * A cap, not a client-side slice: the backend stops paging once it has this
   * many, so the round trips for the rest are never made. Raising it is a new
   * request; lowering it back comes from cache.
   */
  const [limit, setLimit] = useState<number>(DEFAULT_DATASET_LIMIT)

  const datasets = useDatasets(connectionId, limit)
  const connection = useConnection(connectionId)
  const saveSelection = useSaveSelection(connectionId)

  const [search, setSearch] = useState('')
  // Defers filtering off the keystroke, so typing stays responsive on a long list.
  const deferredSearch = useDeferredValue(search)

  /**
   * What is ticked right now, derived rather than synchronised.
   *
   * The draft is `null` until somebody touches it, and until then this falls
   * back to the selection already saved on the server. Copying one into the
   * other with an effect would mean a background refetch could land mid-edit
   * and revert a half-made choice; deriving it cannot.
   */
  const saved = useMemo(
    () => connection.data?.selectedDatasets ?? [],
    [connection.data]
  )
  const savedIds = useMemo(() => saved.map((d) => d.id), [saved])
  const selection = selectedDatasetIds ?? savedIds

  /**
   * The rows to show: what the warehouse just listed, plus anything already
   * configured that the listing did not reach.
   *
   * Without the second half this screen lies by omission, and then acts on the
   * lie. The listing is capped, so a dataset configured months ago can easily
   * sit outside the current page — it would render nowhere, look unconfigured,
   * and the save below (which REPLACES the whole selection) would drop it. The
   * symptom is a context quietly losing datasets nobody unticked.
   *
   * The stand-in rows carry only what the server actually stored at selection
   * time: id, name and the two counts. Description, owner and the rest are
   * null, because this application never saw them for these rows.
   */
  const rows = useMemo<WarehouseDataset[]>(() => {
    const listed = datasets.data?.datasets ?? []
    const listedIds = new Set(listed.map((d) => d.id))
    const offPage: WarehouseDataset[] = saved
      .filter((d) => !listedIds.has(d.id))
      .map((d) => ({
        id: d.id,
        name: d.name || d.id,
        description: null,
        rowCount: d.rowCount,
        columnCount: d.columnCount,
        owner: null,
        lastUpdated: null,
      }))
    // Configured-but-unlisted first: they are the ones somebody needs to see
    // on arrival, and burying them under a page of new rows defeats the point.
    return [...offPage, ...listed]
  }, [datasets.data, saved])

  const toggleDataset = (id: string) =>
    setSelectedDatasetIds(
      selection.includes(id) ? selection.filter((x) => x !== id) : [...selection, id]
    )

  if (!connectionId) {
    return (
      <StepFrame title="Discover datasets" hideNext>
        <NoConnectionState onConnect={() => goToStep('connect')} />
      </StepFrame>
    )
  }

  return (
    <StepFrame
      title="Discover datasets"
      description="Choose the datasets to build context from."
      actions={
        <>
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            Show
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              disabled={datasets.isFetching}
              aria-label="How many datasets to fetch"
              className="h-8 rounded-md border border-input bg-transparent px-2 text-xs text-foreground outline-none focus-visible:border-ring disabled:opacity-50"
            >
              {DATASET_LIMIT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <Button
            variant="outline"
            size="sm"
            onClick={() => datasets.refetch()}
            disabled={datasets.isFetching}
          >
            <RefreshCw
              className={cn('size-4', datasets.isFetching && 'animate-spin')}
              aria-hidden
            />
            Refresh
          </Button>
        </>
      }
      nextDisabled={selection.length === 0}
      nextPending={saveSelection.isPending}
      pendingLabel="Saving selection…"
      pendingOverlay={{
        title: 'Saving your selection',
        detail: `Recording ${selection.length} dataset${selection.length === 1 ? '' : 's'} for this context.`,
      }}
      refreshing={datasets.isFetching && !datasets.isPending}
      footerNote={
        selection.length > 0
          ? `${selection.length} dataset${selection.length === 1 ? '' : 's'} selected`
          : 'Select at least one dataset to continue.'
      }
      onNext={async () => {
        /*
         * From the merged rows, not the fetched page. `saveSelection` replaces
         * the whole selection, so filtering against one page would delete
         * every configured dataset that page did not happen to contain.
         */
        const chosen = rows.filter((d) => selection.includes(d.id))
        try {
          await saveSelection.mutateAsync(
            chosen.map((d) => ({
              id: d.id,
              name: d.name,
              rowCount: d.rowCount,
              columnCount: d.columnCount,
            }))
          )
          return true
        } catch (err) {
          notify.failure('save your dataset selection', err)
          return false
        }
      }}
    >
      <QueryBoundary
        query={datasets}
        step="Discover"
        endpoint={`GET ${endpoints.datasets(connectionId)}`}
        context="load datasets from your connection"
        loading={<TableSkeleton rows={8} columns={6} />}
        isEmpty={(d) => d.datasets.length === 0}
        empty={
          <EmptyState
            title="This connection reports no datasets"
            detail="The credential is valid but the account can see nothing. Check its permissions in the source, then refresh."
            action={
              <Button variant="outline" size="sm" onClick={() => datasets.refetch()}>
                <RefreshCw className="size-4" aria-hidden />
                Refresh
              </Button>
            }
          />
        }
      >
        {(data) => (
          <DatasetTable
            rows={rows}
            configuredIds={savedIds}
            listedCount={data.datasets.length}
            fetchedAt={data.fetchedAt}
            truncated={data.truncated}
            limit={data.limit}
            onWiden={() => {
              const next = DATASET_LIMIT_OPTIONS.find((option) => option > data.limit)
              if (next) setLimit(next)
            }}
            search={deferredSearch}
            onSearch={setSearch}
            searchValue={search}
            selectedIds={selection}
            onToggle={toggleDataset}
            onSetAll={setSelectedDatasetIds}
          />
        )}
      </QueryBoundary>
    </StepFrame>
  )
}

function DatasetTable({
  rows,
  configuredIds,
  listedCount,
  fetchedAt,
  truncated,
  limit,
  onWiden,
  search,
  searchValue,
  onSearch,
  selectedIds,
  onToggle,
  onSetAll,
}: {
  rows: WarehouseDataset[]
  /** Already saved on the server for this connection, from a previous visit. */
  configuredIds: string[]
  /** How many of `rows` came from the live listing, as opposed to storage. */
  listedCount: number
  fetchedAt: string
  /** The warehouse was proven to hold at least one dataset beyond these. */
  truncated: boolean
  limit: number
  onWiden: () => void
  search: string
  searchValue: string
  onSearch: (value: string) => void
  selectedIds: string[]
  onToggle: (id: string) => void
  onSetAll: (ids: string[]) => void
}) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  /*
   * Back to page one when the search changes.
   *
   * Compared during render rather than synchronised in an effect: an effect
   * would paint the old page against the new results first, and React's own
   * guidance is that a value derived from another value is not a side effect.
   */
  const [pageFor, setPageFor] = useState(search)
  if (search !== pageFor) {
    setPageFor(search)
    setPage(1)
  }

  const configured = useMemo(() => new Set(configuredIds), [configuredIds])
  /** Saved previously but not in the current listing — the easily-lost ones. */
  const offPageCount = rows.length - listedCount

  /**
   * Whether the ticked set differs from what is saved.
   *
   * Compared by contents, not by length: swapping one dataset for another
   * leaves the count identical, and a "Reset to saved" button that vanishes
   * exactly when somebody has made a change is worse than not having one.
   */
  const dirty = useMemo(() => {
    if (selectedIds.length !== configuredIds.length) return true
    const current = new Set(selectedIds)
    return configuredIds.some((id) => !current.has(id))
  }, [selectedIds, configuredIds])

  // Only the columns the response actually populates.
  const columns = useMemo(() => COLUMNS.filter((c) => c.present(rows)), [rows])

  const query = search.trim().toLowerCase()

  /**
   * Matching rows.
   *
   * The id is always searchable, independently of which columns are on screen.
   * It is not rendered in any column, so tying it to column visibility would
   * make it findable or not for reasons nobody could see — and the id is what
   * people actually have to hand, because it is what the extraction payload,
   * the agent and Domo's own URLs all identify a dataset by.
   *
   * Everything else is matched through the visible columns' own searchers, so
   * a hidden column is not silently searched.
   */
  const filtered = useMemo(() => {
    if (!query) return rows
    const searchers = columns.filter((c) => c.search).map((c) => c.search!)
    return rows.filter(
      (row) =>
        row.id.toLowerCase().includes(query) ||
        searchers.some((read) => read(row).toLowerCase().includes(query))
    )
  }, [rows, query, columns])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, filtered.length)
  const paginatedRows = useMemo(
    () => filtered.slice(startIndex, endIndex),
    [filtered, startIndex, endIndex]
  )

  const selected = new Set(selectedIds)
  const currentPageIds = paginatedRows.map((r) => r.id)
  const allCurrentPageSelected =
    currentPageIds.length > 0 && currentPageIds.every((id) => selected.has(id))

  const toggleAllCurrentPage = () => {
    if (allCurrentPageSelected) {
      onSetAll(selectedIds.filter((id) => !currentPageIds.includes(id)))
    } else {
      onSetAll([...new Set([...selectedIds, ...currentPageIds])])
    }
  }

  return (
    <div className="space-y-3">
      {/*
        What is already configured, stated on arrival.

        Coming back to a connection, the first question is "what did I pick
        last time" — and a page of ticked checkboxes scattered through a long
        list does not answer it. The count does, and the second line covers the
        case that caused real trouble: datasets configured earlier that this
        listing did not reach.
      */}
      {configuredIds.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs">
          <CheckCircle2 className="size-3.5 shrink-0 text-primary" aria-hidden />
          <span className="text-foreground">
            <strong className="font-medium">
              {configuredIds.length} dataset{configuredIds.length === 1 ? '' : 's'}
            </strong>{' '}
            already configured for this connection
            {offPageCount > 0 ? (
              <>
                {' '}
                — {offPageCount} of them {offPageCount === 1 ? 'is' : 'are'} outside the
                current listing and {offPageCount === 1 ? 'is' : 'are'} shown first below,
                so {offPageCount === 1 ? 'it stays' : 'they stay'} selected when you save.
              </>
            ) : null}
            .
          </span>
          {dirty ? (
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto h-6"
              onClick={() => onSetAll(configuredIds)}
            >
              Reset to saved
            </Button>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-xs">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={searchValue}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search datasets or paste an id…"
            className="pl-8"
            aria-label="Search datasets by name, id, schema or owner"
          />
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {selectedIds.length > 0 ? (
            <Button variant="ghost" size="sm" onClick={() => onSetAll([])}>
              Clear selection ({selectedIds.length})
            </Button>
          ) : null}
          <span>
            {filtered.length} of {rows.length}
            {truncated ? '+' : ''} · fetched {formatRelativeTime(fetchedAt)}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr className="border-b">
              <th scope="col" className="w-10 px-3 py-2.5">
                <Checkbox
                  checked={allCurrentPageSelected}
                  onCheckedChange={toggleAllCurrentPage}
                  aria-label="Select all datasets on this page"
                />
              </th>
              {columns.map((col) => (
                <th
                  key={col.id}
                  scope="col"
                  className={cn(
                    'whitespace-nowrap px-3 py-2.5 font-medium',
                    col.align === 'right' ? 'text-right' : 'text-left'
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {paginatedRows.map((row) => {
              const isSelected = selected.has(row.id)
              return (
                <tr
                  key={row.id}
                  onClick={() => onToggle(row.id)}
                  className={cn(
                    'cursor-pointer transition-colors hover:bg-accent/40',
                    isSelected && 'bg-primary/5'
                  )}
                >
                  <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => onToggle(row.id)}
                      aria-label={`Select ${row.name}`}
                    />
                  </td>
                  {columns.map((col, colIndex) => (
                    <td
                      key={col.id}
                      className={cn(
                        'px-3 py-2.5',
                        col.align === 'right' ? 'text-right' : 'text-left'
                      )}
                    >
                      {/*
                        The badge rides in the first column rather than taking
                        a column of its own: it applies to a minority of rows,
                        and an almost-empty column costs width on every row to
                        say nothing about most of them.
                      */}
                      {colIndex === 0 ? (
                        <div className="flex items-start gap-2">
                          <div className="min-w-0 flex-1">
                            {col.render(row)}
                            {/*
                              Shown only when the id is what matched.

                              A row that appears because of something invisible
                              reads as a bug in the search. Rendering the id on
                              every row instead would cost a line of height on
                              all of them to answer a question almost nobody is
                              asking.
                            */}
                            {query && row.id.toLowerCase().includes(query) ? (
                              <p className="truncate font-mono text-[11px] text-muted-foreground">
                                {row.id}
                              </p>
                            ) : null}
                          </div>
                          {configured.has(row.id) ? (
                            <Badge
                              variant="outline"
                              className="mt-0.5 shrink-0 border-primary/30 bg-primary/10 text-[10px] text-primary"
                            >
                              Configured
                            </Badge>
                          ) : null}
                        </div>
                      ) : (
                        col.render(row)
                      )}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>

        {filtered.length === 0 ? (
          <p className="px-3 py-10 text-center text-sm text-muted-foreground">
            No dataset matches “{searchValue}”.
          </p>
        ) : null}
      </div>

      {/* Pagination Controls */}
      {filtered.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <div className="flex items-center gap-1">
              {[10, 25, 50].map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => {
                    setPageSize(size)
                    setPage(1)
                  }}
                  className={cn(
                    'h-7 px-2.5 rounded-md font-medium transition-colors',
                    pageSize === size
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                  )}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span>
              Showing <strong className="font-semibold text-foreground">{startIndex + 1}</strong>–
              <strong className="font-semibold text-foreground">{endIndex}</strong> of{' '}
              <strong className="font-semibold text-foreground">{filtered.length}</strong>
              {truncated ? '+' : ''}
            </span>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="size-7"
                onClick={() => setPage(1)}
                disabled={currentPage <= 1}
                title="First page"
                aria-label="Go to first page"
              >
                <ChevronsLeft className="size-3.5" aria-hidden />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-7"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                title="Previous page"
                aria-label="Go to previous page"
              >
                <ChevronLeft className="size-3.5" aria-hidden />
              </Button>
              <span className="px-2 font-medium text-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="size-7"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                title="Next page"
                aria-label="Go to next page"
              >
                <ChevronRight className="size-3.5" aria-hidden />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-7"
                onClick={() => setPage(totalPages)}
                disabled={currentPage >= totalPages}
                title="Last page"
                aria-label="Go to last page"
              >
                <ChevronsRight className="size-3.5" aria-hidden />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Truncated notice */}
      {truncated ? (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs dark:border-amber-900 dark:bg-amber-950/40">
          <Info className="size-3.5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
          <span className="text-amber-800 dark:text-amber-200">
            Showing the first {limit}. This connection has more datasets than are listed here.
          </span>
          <Button variant="outline" size="sm" className="ml-auto h-7" onClick={onWiden}>
            Load more
          </Button>
        </div>
      ) : null}

      {columns.length < COLUMNS.length ? (
        <p className="text-xs text-muted-foreground">
          Columns are shown only when the connection reports them. Missing:{' '}
          {COLUMNS.filter((c) => !columns.includes(c))
            .map((c) => c.header)
            .join(', ')}
          . A value the source does not provide is shown as {EMPTY} rather than estimated.
        </p>
      ) : null}
    </div>
  )
}
