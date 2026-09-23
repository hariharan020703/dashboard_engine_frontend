import { useEffect, useDeferredValue, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Info, RefreshCw, Search } from 'lucide-react'
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
  const savedIds = useMemo(
    () => (connection.data?.selectedDatasets ?? []).map((d) => d.id),
    [connection.data]
  )
  const selection = selectedDatasetIds ?? savedIds

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
      footerNote={
        selection.length > 0
          ? `${selection.length} dataset${selection.length === 1 ? '' : 's'} selected`
          : 'Select at least one dataset to continue.'
      }
      onNext={async () => {
        const all = datasets.data?.datasets ?? []
        const chosen = all.filter((d) => selection.includes(d.id))
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
            rows={data.datasets}
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

  // Reset to first page when search changes
  useEffect(() => {
    setPage(1)
  }, [search])

  // Only the columns the response actually populates.
  const columns = useMemo(() => COLUMNS.filter((c) => c.present(rows)), [rows])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    const searchers = columns.filter((c) => c.search).map((c) => c.search!)
    return rows.filter((row) => searchers.some((read) => read(row).toLowerCase().includes(q)))
  }, [rows, search, columns])

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-xs">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={searchValue}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search datasets…"
            className="pl-8"
            aria-label="Search datasets"
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
                  {columns.map((col) => (
                    <td
                      key={col.id}
                      className={cn(
                        'px-3 py-2.5',
                        col.align === 'right' ? 'text-right' : 'text-left'
                      )}
                    >
                      {col.render(row)}
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
