import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, Search, X } from 'lucide-react'
import { EmptyState } from '@/ui/page'

export interface ColumnDef<T> {
  key: string
  header: string
  render?: (item: T) => ReactNode
  sortable?: boolean
  sortValue?: (item: T) => string | number | boolean | null | undefined
  align?: 'left' | 'right' | 'center'
  className?: string
  width?: string
}

interface DataTableProps<T> {
  data: T[]
  columns: ColumnDef<T>[]
  keyOf: (item: T) => string | number
  searchPlaceholder?: string
  searchFilter?: (item: T, query: string) => boolean
  loading?: boolean
  emptyMessage?: string
  emptyHint?: ReactNode
  emptyAction?: ReactNode
  actions?: ReactNode
  filters?: ReactNode
  onRowClick?: (item: T) => void
  pageSize?: number
}

export default function DataTable<T>({
  data,
  columns,
  keyOf,
  searchPlaceholder = 'Search...',
  searchFilter,
  loading = false,
  emptyMessage = 'No records found',
  emptyHint,
  emptyAction,
  actions,
  filters,
  onRowClick,
  pageSize = 15,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(1)

  // Filtering
  const filteredData = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return data

    if (searchFilter) {
      return data.filter((item) => searchFilter(item, q))
    }

    // Default search across all string/number fields of item
    return data.filter((item) => {
      const record = item as Record<string, unknown>
      return Object.values(record).some((val) => {
        if (val === null || val === undefined) return false
        return String(val).toLowerCase().includes(q)
      })
    })
  }, [data, search, searchFilter])

  // Sorting
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData
    const col = columns.find((c) => c.key === sortKey)
    if (!col) return filteredData

    return [...filteredData].sort((a, b) => {
      const valA = col.sortValue
        ? col.sortValue(a)
        : (a as Record<string, unknown>)[sortKey]
      const valB = col.sortValue
        ? col.sortValue(b)
        : (b as Record<string, unknown>)[sortKey]

      if (valA === valB) return 0
      if (valA === null || valA === undefined) return 1
      if (valB === null || valB === undefined) return -1

      const result = valA < valB ? -1 : 1
      return sortDir === 'asc' ? result : -result
    })
  }, [filteredData, sortKey, sortDir, columns])

  // Pagination
  const totalPages = Math.ceil(sortedData.length / pageSize) || 1
  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize
    return sortedData.slice(start, start + pageSize)
  }, [sortedData, page, pageSize])

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc')
      else {
        setSortKey(null)
        setSortDir('asc')
      }
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2.5">
          <div className="relative min-w-[200px] max-w-sm flex-1">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder={searchPlaceholder}
              className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-9 pr-8 text-xs text-slate-800 transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('')
                  setPage(1)
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>
          {filters}
        </div>

        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70">
              {columns.map((col) => {
                const isSorted = sortKey === col.key
                const alignCls =
                  col.align === 'right'
                    ? 'text-right'
                    : col.align === 'center'
                    ? 'text-center'
                    : 'text-left'

                return (
                  <th
                    key={col.key}
                    scope="col"
                    style={col.width ? { width: col.width } : undefined}
                    className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 ${alignCls} ${
                      col.className || ''
                    }`}
                  >
                    {col.sortable ? (
                      <button
                        type="button"
                        onClick={() => handleSort(col.key)}
                        className={`inline-flex items-center gap-1 hover:text-slate-800 ${alignCls}`}
                      >
                        <span>{col.header}</span>
                        {isSorted ? (
                          sortDir === 'asc' ? (
                            <ArrowUp size={13} className="text-blue-600" />
                          ) : (
                            <ArrowDown size={13} className="text-blue-600" />
                          )
                        ) : (
                          <ArrowUpDown size={12} className="text-slate-300" />
                        )}
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              // Skeleton rows
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={`skeleton-${i}`} className="animate-pulse">
                  {columns.map((c) => (
                    <td key={c.key} className="px-4 py-3.5">
                      <div className="h-4 w-3/4 rounded bg-slate-100" />
                    </td>
                  ))}
                </tr>
              ))
            ) : sortedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center">
                  <EmptyState message={emptyMessage} hint={emptyHint} />
                  {emptyAction && <div className="mt-3">{emptyAction}</div>}
                </td>
              </tr>
            ) : (
              paginatedData.map((item) => {
                const key = keyOf(item)
                return (
                  <tr
                    key={key}
                    onClick={onRowClick ? () => onRowClick(item) : undefined}
                    className={`group transition-colors ${
                      onRowClick
                        ? 'cursor-pointer hover:bg-blue-50/30'
                        : 'hover:bg-slate-50/50'
                    }`}
                  >
                    {columns.map((col) => {
                      const alignCls =
                        col.align === 'right'
                          ? 'text-right'
                          : col.align === 'center'
                          ? 'text-center'
                          : 'text-left'

                      const content = col.render
                        ? col.render(item)
                        : String((item as Record<string, unknown>)[col.key] ?? '')

                      return (
                        <td
                          key={col.key}
                          className={`px-4 py-3 text-slate-700 align-middle ${alignCls} ${
                            col.className || ''
                          }`}
                        >
                          {content}
                        </td>
                      )
                    })}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer / Pagination */}
      {!loading && sortedData.length > 0 && (
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
          <div>
            Showing{' '}
            <span className="font-semibold text-slate-700">
              {Math.min((page - 1) * pageSize + 1, sortedData.length)}
            </span>{' '}
            to{' '}
            <span className="font-semibold text-slate-700">
              {Math.min(page * pageSize, sortedData.length)}
            </span>{' '}
            of <span className="font-semibold text-slate-700">{sortedData.length}</span> results
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                className="rounded-md border border-slate-200 px-2.5 py-1 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>
              <span className="px-2 font-medium text-slate-600">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                className="rounded-md border border-slate-200 px-2.5 py-1 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
