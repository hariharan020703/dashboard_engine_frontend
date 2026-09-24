import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { ArrowDown, ArrowUp, ChevronsUpDown, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EmptyState, ErrorState, NoResultsState, TableSkeleton } from '@/components/common/States'
import type { ListQuery } from '@/types/admin'

/**
 * The product's one table.
 *
 * Search, sort, paginate, row actions and every one of the four async states in
 * a single component, because the alternative - each screen assembling its own
 * from the shadcn primitives - is how two directories end up sorting
 * differently and one of them forgets what to show while loading.
 *
 * Columns declare how to render a cell and, separately, how to SORT it. A cell
 * that renders a badge still sorts by the underlying value, which a DOM-text
 * comparison could not do.
 *
 * Two modes. Client mode (the default) searches, sorts and pages `data` in the
 * browser - right for a list that is small by nature (a table's columns).
 * Server mode (`server` set) does none of that: `data` is the one page the
 * server already searched, sorted and limited, and the table only renders it
 * and reports what the user asked for next. Any list that grows with the
 * business - people, companies, the audit trail - uses server mode.
 */

export interface ColumnDef<T> {
  key: string
  header: ReactNode
  render: (item: T) => ReactNode
  /** Client mode: supply to make the column sortable; it returns the value to compare. */
  sortValue?: (item: T) => string | number | boolean | null | undefined
  /** Server mode: the endpoint's sort key for this column, if it is sortable. */
  serverSort?: string
  align?: 'left' | 'right' | 'center'
  /** Tailwind width, e.g. 'w-40'. Omit to let the column size to its content. */
  width?: string
  /** Hidden below `md`. For the columns a phone has no room for. */
  secondary?: boolean
  className?: string
}

interface DataTableProps<T> {
  data: T[] | null
  columns: ColumnDef<T>[]
  keyOf: (item: T) => string | number
  loading?: boolean
  error?: unknown
  onRetry?: () => void

  /** Return true when `item` matches the lowercased `query`. */
  searchFilter?: (item: T, query: string) => boolean
  searchPlaceholder?: string

  /** Shown when the source genuinely has no rows, as opposed to none matching. */
  empty: { title: string; body?: ReactNode; action?: ReactNode }

  /** Filter controls rendered beside the search box. */
  toolbar?: ReactNode
  onRowClick?: (item: T) => void
  pageSize?: number

  /**
   * Server mode. `total` is how many rows match the current query; `narrowed`
   * says a search or filter is applied, so an empty page reads as "no match"
   * rather than "nothing here yet".
   */
  server?: {
    total: number
    query: ListQuery
    onQueryChange: (next: ListQuery) => void
    narrowed: boolean
  }
}

export function DataTable<T>({
  data,
  columns,
  keyOf,
  loading = false,
  error,
  onRetry,
  searchFilter,
  searchPlaceholder = 'Search…',
  empty,
  toolbar,
  onRowClick,
  pageSize: clientPageSize = 15,
  server,
}: DataTableProps<T>) {
  const [query, setQuery] = useState(server?.query.search ?? '')
  const [clientSortKey, setSortKey] = useState<string | null>(null)
  const [clientSortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [clientPage, setClientPage] = useState(1)

  // Server mode: the search box is sent after a pause in typing, not on every
  // keystroke - each send is a query.
  const serverSearch = server?.query.search ?? ''
  const onServerQuery = server?.onQueryChange
  const serverQuery = server?.query
  useEffect(() => {
    if (!onServerQuery || !serverQuery) return
    const next = query.trim()
    if (next === serverSearch) return
    const timer = setTimeout(() => onServerQuery({ ...serverQuery, search: next, page: 1 }), 300)
    return () => clearTimeout(timer)
  }, [query, serverSearch, onServerQuery, serverQuery])

  const sortKey = server ? (server.query.sort ?? null) : clientSortKey
  const sortDirection = server ? (server.query.dir ?? 'asc') : clientSortDirection
  const pageSize = server ? server.query.pageSize : clientPageSize
  const page = server ? server.query.page : clientPage
  const setPage = (next: (p: number) => number) => {
    if (server) server.onQueryChange({ ...server.query, page: next(server.query.page) })
    else setClientPage(next)
  }

  // Memoised so the filter and sort below are not redone on every keystroke
  // elsewhere in the page: `data ?? []` is a fresh array each render otherwise.
  const rows = useMemo(() => data ?? [], [data])

  const filtered = useMemo(() => {
    if (server) return rows
    const needle = query.trim().toLowerCase()
    if (!needle || !searchFilter) return rows
    return rows.filter((item) => searchFilter(item, needle))
  }, [rows, query, searchFilter, server])

  const sorted = useMemo(() => {
    if (server || !sortKey) return filtered
    const column = columns.find((c) => c.key === sortKey)
    if (!column?.sortValue) return filtered

    const direction = sortDirection === 'asc' ? 1 : -1
    return [...filtered].sort((a, b) => {
      const left = column.sortValue!(a)
      const right = column.sortValue!(b)

      // Absent values sort last in both directions: a row with no "last active"
      // is not the earliest date, it is a row with nothing to compare.
      if (left === right) return 0
      if (left === null || left === undefined) return 1
      if (right === null || right === undefined) return -1

      if (typeof left === 'number' && typeof right === 'number') {
        return (left - right) * direction
      }
      return String(left).localeCompare(String(right), undefined, { numeric: true }) * direction
    })
  }, [filtered, sortKey, sortDirection, columns, server])

  // In server mode the page IS the data, and the count is the server's.
  const matchedCount = server ? server.total : sorted.length
  const pageCount = Math.max(1, Math.ceil(matchedCount / pageSize))
  const currentPage = Math.min(page, pageCount)
  const visible = server ? sorted : sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const toggleSort = (key: string) => {
    if (server) {
      const column = columns.find((c) => c.key === key)
      if (!column?.serverSort) return
      const same = server.query.sort === column.serverSort
      server.onQueryChange({
        ...server.query,
        sort: column.serverSort,
        dir: same && server.query.dir !== 'desc' ? 'desc' : 'asc',
        page: 1,
      })
      return
    }
    if (clientSortKey === key) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDirection('asc')
    }
    setClientPage(1)
  }

  const clearSearch = () => {
    setQuery('')
    if (server) server.onQueryChange({ ...server.query, search: '', page: 1 })
  }

  const hasSearch = Boolean(searchFilter || server)
  const isEmpty = server ? rows.length === 0 && !server.narrowed : rows.length === 0
  const noMatch = server ? rows.length === 0 && server.narrowed : sorted.length === 0

  const alignClass = (align: ColumnDef<T>['align']) =>
    align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'

  const showToolbar = Boolean(hasSearch || toolbar)

  return (
    <div>
      {showToolbar && (
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
          {hasSearch && (
            <div className="relative min-w-0 flex-1 sm:max-w-xs">
              <Search
                className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value)
                  if (!server) setClientPage(1)
                }}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                className="pl-8"
              />
              {query && (
                <button
                  type="button"
                  onClick={clearSearch}
                  aria-label="Clear search"
                  className="absolute top-1/2 right-2 grid size-5 -translate-y-1/2 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          )}
          {toolbar && <div className="flex flex-wrap items-center gap-2">{toolbar}</div>}
        </div>
      )}

      {/* Order matters: a failure must never be reported as an empty table. */}
      {error ? (
        <ErrorState error={error} onRetry={onRetry} title="Unable to load" />
      ) : loading ? (
        <TableSkeleton columns={Math.min(columns.length, 5)} />
      ) : isEmpty ? (
        <EmptyState title={empty.title} body={empty.body} action={empty.action} />
      ) : noMatch ? (
        <NoResultsState query={query} onClear={clearSearch} />
      ) : (
        <>
          {/* Horizontal scroll rather than a squeezed layout: a table that has
              to be readable on a phone is readable by scrolling, not by
              collapsing its columns into unlabelled fragments. */}
          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  {columns.map((column) => {
                    const sortable = server ? Boolean(column.serverSort) : Boolean(column.sortValue)
                    const active = server
                      ? Boolean(column.serverSort) && sortKey === column.serverSort
                      : sortKey === column.key
                    return (
                      <TableHead
                        key={column.key}
                        className={cn(
                          alignClass(column.align),
                          column.width,
                          column.secondary && 'hidden md:table-cell'
                        )}
                        aria-sort={
                          active ? (sortDirection === 'asc' ? 'ascending' : 'descending') : undefined
                        }
                      >
                        {sortable ? (
                          <button
                            type="button"
                            onClick={() => toggleSort(column.key)}
                            className={cn(
                              'inline-flex items-center gap-1 rounded transition-colors hover:text-foreground',
                              active && 'text-foreground'
                            )}
                          >
                            {column.header}
                            {active ? (
                              sortDirection === 'asc' ? (
                                <ArrowUp className="size-3" aria-hidden />
                              ) : (
                                <ArrowDown className="size-3" aria-hidden />
                              )
                            ) : (
                              <ChevronsUpDown className="size-3 opacity-40" aria-hidden />
                            )}
                          </button>
                        ) : (
                          column.header
                        )}
                      </TableHead>
                    )
                  })}
                </TableRow>
              </TableHeader>

              <TableBody>
                {visible.map((item) => (
                  <TableRow
                    key={keyOf(item)}
                    onClick={onRowClick ? () => onRowClick(item) : undefined}
                    /* A clickable row is reachable and activatable from the
                       keyboard. Without this the row action exists for a mouse
                       only, and every screen here has one. */
                    tabIndex={onRowClick ? 0 : undefined}
                    role={onRowClick ? 'button' : undefined}
                    onKeyDown={
                      onRowClick
                        ? (event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault()
                              onRowClick(item)
                            }
                          }
                        : undefined
                    }
                    className={cn(onRowClick && 'cursor-pointer')}
                  >
                    {columns.map((column) => (
                      <TableCell
                        key={column.key}
                        className={cn(
                          alignClass(column.align),
                          column.secondary && 'hidden md:table-cell',
                          column.className
                        )}
                      >
                        {column.render(item)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {pageCount > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
              <p className="text-xs text-muted-foreground" aria-live="polite">
                Showing{' '}
                <span className="font-medium text-foreground tabular-nums">
                  {(currentPage - 1) * pageSize + 1}–
                  {Math.min(currentPage * pageSize, matchedCount)}
                </span>{' '}
                of <span className="font-medium text-foreground tabular-nums">{matchedCount}</span>
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {currentPage} / {pageCount}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                  disabled={currentPage === pageCount}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
