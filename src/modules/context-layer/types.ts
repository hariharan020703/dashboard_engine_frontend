/**
 * The context layer's API contract, exactly as the backend returns it.
 *
 * Kept inside the module rather than in types/admin.ts so the whole feature is
 * one folder — the same reason the backend keeps its half under
 * src/modules/context-layer.
 */

/** A warehouse the platform knows about. `planned` ones cannot be configured. */
export interface Connector {
  id: string
  name: string
  status: 'available' | 'planned'
  description: string
  docsUrl?: string
  credentials: CredentialField[]
}

/**
 * One field of the connect form.
 *
 * The form is rendered from this rather than hand-written per provider, so
 * adding Snowflake does not mean adding a second dialog that drifts from the
 * first.
 */
export interface CredentialField {
  id: string
  label: string
  type: 'text' | 'secret'
  placeholder?: string
  help?: string
}

/** A saved connection. Never carries the credential — only `secretHint`. */
export interface Connection {
  id: string
  companyId: number
  provider: string
  name: string
  host: string
  /** The last four characters of the stored token, for telling two apart. */
  secretHint: string
  status: 'connected' | 'invalid'
  lastError: string | null
  lastVerifiedAt: string | null
  createdAt: string | null
  /** On the list read only. */
  selectedDatasetCount?: number
  /** On the detail read only. */
  selectedDatasets?: SelectedDataset[]
}

/** A dataset as the warehouse currently reports it. */
export interface WarehouseDataset {
  id: string
  name: string
  description: string | null
  rowCount: number | null
  columnCount: number | null
  owner: string | null
  lastUpdated: string | number | null
}

/** A dataset somebody has chosen. `id` is what a context will be built from. */
export interface SelectedDataset {
  id: string
  name: string | null
  rowCount: number | null
  columnCount: number | null
  selectedAt: string
}

/** Who the credential belongs to, reported when it is validated. */
export interface ConnectedAccount {
  accountId: string | number | null
  accountName: string | null
  accountEmail: string | null
}

export interface CreatedConnection {
  connection: Connection
  account: ConnectedAccount
  datasets: WarehouseDataset[]
}
