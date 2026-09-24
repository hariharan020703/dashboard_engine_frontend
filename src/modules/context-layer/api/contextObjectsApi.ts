import { contextHttp } from './client'
import { endpoints } from './endpoints'
import type { GlossaryQuery, Understanding } from '../types'

/**
 * The facts an extraction run wrote into the Context Layer.
 *
 * This is the actual product of step 4. The agent's prose answer is a report
 * ABOUT the run; these rows are what it did — one per table, column, join,
 * transformation or example it recorded.
 *
 * Read through the Node backend whichever engine ran step 4: both write the
 * same `context_objects` rows and Node reads that table directly. One page at
 * a time, filtered by type and searched on the server, with the per-type counts
 * of the whole run for the chips - a run is mostly column statistics, and the
 * browser used to receive every one of them, payload and all, to show a few.
 */

/** One fact, as its card renders it. */
export interface ContextObject {
  id: string
  objectType: string
  qualifiedName: string
  sourceType: string
  verified: boolean
  payload: Record<string, unknown> | null
}

export interface ContextObjects {
  resolvedSessionId: string | null
  /** Every fact in the run. */
  count: number
  /** Facts per object type, across the whole run. */
  counts: Record<string, number>
  /** How many the current type filter and search select. */
  matched: number
  objects: ContextObject[]
}

export interface ContextObjectsQuery {
  type?: string
  search?: string
  page: number
  pageSize: number
}

/** Drops unset params so the request carries only what narrows it. */
function params<T extends object>(query: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(query).filter(([, v]) => v !== undefined && v !== null && v !== '' && v !== 'all')
  ) as Partial<T>
}

export function fetchContextObjects(
  connectionId: string,
  query: ContextObjectsQuery
): Promise<ContextObjects> {
  return contextHttp.get<ContextObjects>(endpoints.contextObjects(connectionId), {
    params: params(query),
  })
}

/**
 * The business glossary — entities, metrics and dimensions the latest run
 * recorded, with their review state and the counts above them.
 *
 * Read through the Node backend whichever engine ran step 4: both write the
 * same `context_objects` rows, and Node reads that table directly.
 */
export function fetchUnderstanding(connectionId: string, query: GlossaryQuery): Promise<Understanding> {
  return contextHttp.get<Understanding>(endpoints.understanding(connectionId), {
    params: params(query),
  })
}
