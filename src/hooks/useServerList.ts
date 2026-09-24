import { useState } from 'react'
import { useAsync } from '@/hooks/useAsync'
import type { ListQuery, Paged } from '@/types/admin'

/**
 * A server-side list: the query (page, search, sort) as state, and the page the
 * server answered for it.
 *
 * The browser does no searching, sorting or slicing - it asks for one page and
 * renders it. That is the point: a list screen that downloaded every row to
 * show fifteen paid for the whole table on every visit, and its search could
 * only ever see what had been downloaded.
 *
 * `filters` are the screen's own narrowing (role, status, company...). They are
 * part of the request's identity, and changing one returns to page one - a page
 * number means nothing once the list it paged has changed underneath it.
 *
 * The previous page stays on screen while the next one loads (`refreshing`),
 * so paging and typing a search do not flash the table back to a skeleton.
 * `loading` is only true before anything has ever arrived.
 */
export function useServerList<T, F extends object = Record<string, never>>(
  fetchPage: (query: ListQuery & F) => Promise<Paged<T>>,
  initial: ListQuery,
  filters: F = {} as F
) {
  const [query, setQueryState] = useState<ListQuery>(initial)

  // A filter change resets the page, derived during render rather than in an
  // effect, so the stale page number is never requested.
  const filterKey = JSON.stringify(filters)
  const [seenFilterKey, setSeenFilterKey] = useState(filterKey)
  if (seenFilterKey !== filterKey) {
    setSeenFilterKey(filterKey)
    if (query.page !== 1) setQueryState({ ...query, page: 1 })
  }

  const request = { ...query, ...filters }
  // Params the server would treat as "not set" are dropped rather than sent
  // as empty strings.
  const params = Object.fromEntries(
    Object.entries(request).filter(([, v]) => v !== undefined && v !== null && v !== '')
  ) as ListQuery & F

  const state = useAsync(() => fetchPage(params), [JSON.stringify(params)])

  // The last page that arrived, kept (as derived state, not a ref written
  // during render) to stay on screen while the next one loads.
  const [last, setLast] = useState<Paged<T> | null>(null)
  if (state.data && state.data !== last) setLast(state.data)

  return {
    query,
    setQuery: setQueryState,
    data: state.data ?? (state.loading ? last : null),
    error: state.error,
    loading: state.loading && last === null,
    refreshing: state.loading && last !== null,
    reload: state.reload,
    /** True when the list is narrowed, so "no rows" means "no match", not "empty". */
    narrowed:
      Boolean(query.search) ||
      Object.values(filters).some((v) => v !== undefined && v !== null && v !== ''),
  }
}
