import { useState } from 'react'

/** Rows per page for the client-side tables in this module. */
export const PAGE_SIZE = 10

/**
 * Pager props for a list the SERVER pages: the current page, its size and the
 * server's count of matching rows. Same shape as usePagination, so <Pagination>
 * renders either.
 */
export function serverPage(page: number, pageSize: number, total: number) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const currentPage = Math.min(page, totalPages)
  const startIndex = (currentPage - 1) * pageSize
  return {
    page: currentPage,
    totalPages,
    startIndex,
    endIndex: Math.min(startIndex + pageSize, total),
    total,
  }
}

/**
 * Client-side paging over a list that is already fully loaded.
 *
 * The page is clamped rather than trusted, so a list that shrinks under it
 * (a filter, a refetch) lands on its last real page instead of an empty one.
 * Callers reset to page one themselves when the filter changes.
 */
export function usePagination<T>(items: T[], pageSize = PAGE_SIZE) {
  const [page, setPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, items.length)

  return {
    page: currentPage,
    setPage,
    totalPages,
    startIndex,
    endIndex,
    total: items.length,
    pageItems: items.slice(startIndex, endIndex),
  }
}
