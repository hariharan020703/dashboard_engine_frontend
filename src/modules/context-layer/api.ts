import { apiFetch } from '@/api/client'
import type {
  Connection,
  Connector,
  CreatedConnection,
  SelectedDataset,
  WarehouseDataset,
} from './types'

/** Everything this module calls. Nothing outside it talks to /api/context. */

export function listConnectors(): Promise<Connector[]> {
  return apiFetch<Connector[]>('/api/context/connectors')
}

export function listConnections(): Promise<Connection[]> {
  return apiFetch<Connection[]>('/api/context/connections')
}

export function getConnection(id: string): Promise<Connection> {
  return apiFetch<Connection>(`/api/context/connections/${encodeURIComponent(id)}`)
}

/**
 * Validates the credential and saves it, in that order.
 *
 * The response already carries the datasets the token can see — the backend
 * had to list them to prove the credential works, so asking again would be a
 * second round trip to the warehouse for an answer it already has.
 *
 * `companyId` is only read for a platform account; a company account's
 * connection always belongs to their own company, whatever is sent.
 */
export function createConnection(body: {
  provider: string
  name: string
  host: string
  token: string
  companyId?: number
}): Promise<CreatedConnection> {
  return apiFetch<CreatedConnection>('/api/context/connections', { method: 'POST', body })
}

export function verifyConnection(id: string): Promise<{ connection: Connection }> {
  return apiFetch(`/api/context/connections/${encodeURIComponent(id)}/verify`, { method: 'POST' })
}

/** What the warehouse has right now. Not cached, on either side. */
export function fetchDatasets(
  id: string
): Promise<{ datasets: WarehouseDataset[]; fetchedAt: string }> {
  return apiFetch(`/api/context/connections/${encodeURIComponent(id)}/datasets`)
}

/**
 * Replaces the whole selection.
 *
 * The full list every time, including nothing: sending only what changed is
 * how a cleared checkbox survives a save.
 */
export function saveSelection(
  id: string,
  datasets: Array<Pick<SelectedDataset, 'id'> & Partial<WarehouseDataset>>
): Promise<Connection> {
  return apiFetch<Connection>(`/api/context/connections/${encodeURIComponent(id)}/datasets`, {
    method: 'PUT',
    body: { datasets },
  })
}

export function deleteConnection(id: string): Promise<{ deleted: true }> {
  return apiFetch(`/api/context/connections/${encodeURIComponent(id)}`, { method: 'DELETE' })
}
