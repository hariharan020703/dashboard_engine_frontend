import { contextHttp } from './client'
import { endpoints } from './endpoints'
import type { Connection, DatasetListing, SelectedDataset, WarehouseDataset } from '../types'

/**
 * Step 2 — Discover. LIVE.
 *
 * What the warehouse has right now, listed by the backend through the stored
 * credential. Not cached on either side: a dataset list that is quietly stale
 * is worse than one that takes a moment, because the selection made from it is
 * what the whole context gets built on.
 */

/**
 * The first `limit` datasets, newest-account-order as the warehouse reports it.
 *
 * The cap is the backend's, not a client-side slice of a full list — the whole
 * point is that the round trips are never made. Omitting `limit` takes the
 * backend's default (20). The response says which limit was applied and
 * whether anything was left behind.
 */
export function fetchDatasets(
  connectionId: string,
  limit?: number
): Promise<DatasetListing> {
  return contextHttp.get<DatasetListing>(endpoints.datasets(connectionId), {
    params: limit ? { limit } : undefined,
  })
}

/**
 * Replaces the whole selection.
 *
 * The full list every time, including the empty one: sending only what changed
 * is how a cleared checkbox survives a save.
 */
export function saveSelection(
  connectionId: string,
  datasets: Array<Pick<SelectedDataset, 'id'> & Partial<WarehouseDataset>>
): Promise<Connection> {
  return contextHttp.put<Connection>(endpoints.datasets(connectionId), { datasets })
}
