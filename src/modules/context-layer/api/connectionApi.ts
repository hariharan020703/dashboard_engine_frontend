import { contextHttp } from './client'
import { endpoints } from './endpoints'
import type { Connection, Connector, CreatedConnection } from '../types'

/**
 * Step 1 — Connect. LIVE.
 *
 * The credential is submitted once and never comes back: the backend validates
 * it against the provider, encrypts it, and returns a connection id. Every
 * later call in the whole workflow is made with that id, so the token is
 * handled exactly once and the frontend has nothing sensitive to hold on to.
 */

export function listConnectors(): Promise<Connector[]> {
  return contextHttp.get<Connector[]>(endpoints.connectors())
}

export function listConnections(): Promise<Connection[]> {
  return contextHttp.get<Connection[]>(endpoints.connections())
}

export function getConnection(id: string): Promise<Connection> {
  return contextHttp.get<Connection>(endpoints.connection(id))
}

/**
 * Validates the credential and saves it, in that order — a connection row
 * whose token was never checked looks identical on screen to one that works.
 *
 * The response already carries the datasets the credential can see, because
 * the backend had to list them to prove it works. Discover reads them from
 * here rather than asking again.
 *
 * `companyId` is read only for a platform account; a company account's
 * connection always belongs to their own company, whatever is sent.
 */
export function createConnection(body: {
  provider: string
  name: string
  host: string
  token: string
  companyId?: number
  /** How many datasets to list while proving the credential. See config.ts. */
  limit?: number
}): Promise<CreatedConnection> {
  return contextHttp.post<CreatedConnection>(endpoints.connections(), body)
}

/** Re-checks a stored credential against the provider. */
export function verifyConnection(id: string): Promise<{ connection: Connection }> {
  return contextHttp.post<{ connection: Connection }>(endpoints.verifyConnection(id))
}

export function deleteConnection(id: string): Promise<{ deleted: true }> {
  return contextHttp.delete<{ deleted: true }>(endpoints.connection(id))
}
