import { del, get, post, put } from '@/api/http'
import type {
  Connection,
  Connector,
  CreatedConnection,
  SelectedDataset,
  WarehouseDataset,
} from './types'

/** Everything this module calls. Nothing outside it talks to /api/context. */

export function listConnectors(): Promise<Connector[]> {
  return get<Connector[]>('/context/connectors')
}

export function listConnections(): Promise<Connection[]> {
  return get<Connection[]>('/context/connections')
}

export function getConnection(id: string): Promise<Connection> {
  return get<Connection>(`/context/connections/${encodeURIComponent(id)}`)
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
  return post<CreatedConnection>('/context/connections', body)
}

export function verifyConnection(id: string): Promise<{ connection: Connection }> {
  return post<{ connection: Connection }>(
    `/context/connections/${encodeURIComponent(id)}/verify`
  )
}

/** What the warehouse has right now. Not cached, on either side. */
export function fetchDatasets(
  id: string
): Promise<{ datasets: WarehouseDataset[]; fetchedAt: string }> {
  return get<{ datasets: WarehouseDataset[]; fetchedAt: string }>(
    `/context/connections/${encodeURIComponent(id)}/datasets`
  )
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
  return put<Connection>(`/context/connections/${encodeURIComponent(id)}/datasets`, { datasets })
}

export function deleteConnection(id: string): Promise<{ deleted: true }> {
  return del<{ deleted: true }>(`/context/connections/${encodeURIComponent(id)}`)
}
