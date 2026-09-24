/**
 * The Context Layer's API contract, as TypeScript.
 *
 * Two halves, and the difference matters when reading this file:
 *
 *   LIVE      — steps 1 to 3. These shapes are what the Node backend returns
 *               today (backend/src/modules/context-layer/). Changing one means
 *               changing the backend with it.
 *
 *   PROPOSED  — steps 5 to 7. The endpoints behind these do not exist yet.
 *               The shapes are the contract the frontend is written against,
 *               published here so the backend has something exact to build to.
 *               Every one is marked. When the real contract arrives, this file
 *               is the diff.
 *
 * Step 4 (Understand) is in neither half: it does not talk to the Node backend
 * at all. See its section below.
 *
 * A rule that holds throughout: a field the backend may not know is typed
 * `| null`, never defaulted to a number. `rowCount: null` renders as "—";
 * `rowCount: 0` renders as zero rows. The UI must be able to tell those apart,
 * so the types refuse to let a component invent the difference.
 */

/* ========================================================== step 1 — connect
   LIVE. Served by backend/src/modules/context-layer/routes.js.
   ========================================================================== */

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
 * first — and the backend and frontend cannot disagree about which fields exist.
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
  /**
   * On the list read only: where this connection's context stands — the open
   * draft if there is one, otherwise the latest published version. Null when
   * nothing has been built yet.
   */
  context?: ContextVersionHeadline | null
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
  /** The first page, listed while proving the credential can read data. */
  datasets: WarehouseDataset[]
  /** The limit that was applied. May be lower than the one asked for. */
  limit: number
  /** True only when the warehouse was proven to hold at least one more. */
  truncated: boolean
}

/**
 * A dataset listing.
 *
 * Capped, always. Listing is the slowest thing a connector does, and an
 * instance with thousands of datasets is dozens of round trips before the
 * picker can draw anything — so the backend returns a page and says whether
 * there is more, rather than pretending the answer is the whole warehouse.
 *
 * `truncated` is a fact, not an inference: the backend asks for one row beyond
 * the limit and discards it, so an account holding exactly `limit` datasets is
 * distinguishable from one holding thousands.
 */
export interface DatasetListing {
  datasets: WarehouseDataset[]
  fetchedAt: string
  limit: number
  truncated: boolean
}

/* ========================================================= step 2 — discover
   LIVE, with proposed additions marked per field.
   ========================================================================== */

/**
 * A dataset as the warehouse currently reports it.
 *
 * `id`, `name`, `description`, `rowCount`, `columnCount`, `owner` and
 * `lastUpdated` are LIVE today. The rest are PROPOSED: the discover table
 * renders a column only when at least one row carries that field, so adding
 * one backend-side lights the column up with no frontend change, and omitting
 * it hides the column rather than showing a fabricated value.
 */
export interface WarehouseDataset {
  id: string
  name: string
  description: string | null
  rowCount: number | null
  columnCount: number | null
  owner: string | null
  lastUpdated: string | number | null

  /** PROPOSED. The container the dataset lives in — schema, folder, workspace. */
  schema?: string | null
  /** PROPOSED. Warehouse's own classification, e.g. "Schema", "View". */
  type?: string | null
  /** PROPOSED. Tables inside the dataset, when the source groups them. */
  tableCount?: number | null
  /** PROPOSED. Backend-calculated. Never derived in the browser. */
  sizeBytes?: number | null
  /** PROPOSED. 0–100. */
  qualityScore?: number | null
  /** PROPOSED. Whether this dataset already has context built from it. */
  metadataStatus?: 'none' | 'partial' | 'complete' | string | null
}

/** A dataset somebody has chosen. `id` is what a context will be built from. */
export interface SelectedDataset {
  id: string
  name: string | null
  rowCount: number | null
  columnCount: number | null
  selectedAt: string
}

/* ========================================================== step 3 — profile
   LIVE. GET /context/connections/:id/profile
         GET /context/connections/:id/tables/:tableId

   Read from the SOURCE, not generated. The overview comes from the selection
   this application stored; the per-table detail is read live from the
   warehouse. Nothing in this section is AI output — that starts at step 4.
   ========================================================================== */

/** One entry in the Profile step's left-hand navigation tree. */
export interface ProfileDataset {
  datasetId: string
  name: string
  tableCount: number | null
  tables: ProfileTableRef[]
}

export interface ProfileTableRef {
  id: string
  datasetId: string
  name: string
  rowCount: number | null
  columnCount: number | null
}

/** The nav tree for every selected dataset. */
export interface ProfileOverview {
  datasets: ProfileDataset[]
  /** When the backend last refreshed this profile from the source. */
  profiledAt: string | null
}

/**
 * Everything known about one table.
 *
 * `sizeBytes` is a raw byte count the BACKEND calculated from source metadata.
 * The frontend formats it for display and does nothing else with it — it never
 * fetches rows to measure a table.
 */
export interface TableProfile {
  id: string
  datasetId: string
  name: string
  description: string | null
  rowCount: number | null
  columnCount: number | null
  sizeBytes: number | null
  qualityScore: number | null
  lastRefreshedAt: string | null
  owner: string | null
  columns: ColumnProfile[]
  sample: SampleRecords | null
  /**
   * How many rows the per-column statistics were computed over.
   *
   * Present because those statistics describe a SAMPLE on anything larger than
   * it, and a null rate presented without its basis reads as a fact about the
   * whole table. The screen states the sample size next to them.
   */
  statsSampleSize: number | null
  qualityIssues: QualityIssue[]
}

export interface ColumnProfile {
  name: string
  dataType: string
  nullable: boolean | null
  /** 0–100. */
  nullPercent: number | null
  uniqueCount: number | null
  /** The backend's semantic classification, e.g. "email", "currency". */
  semanticType: string | null
  isPrimaryKey: boolean
  isForeignKey: boolean
  min: string | number | null
  max: string | number | null
  /** A small histogram for the inline distribution cell. */
  distribution: DistributionBucket[] | null
}

export interface DistributionBucket {
  label: string
  count: number
}

/** Column-oriented header plus row tuples — compact for wide tables. */
export interface SampleRecords {
  columns: string[]
  rows: Array<Array<string | number | boolean | null>>
  /** How many rows the sample was drawn from, when the backend says. */
  sampledFrom: number | null
}

export interface QualityIssue {
  id: string
  severity: 'info' | 'warning' | 'error' | string
  column: string | null
  title: string
  detail: string | null
  affectedRows: number | null
}

/* ======================================================= step 4 — understand
   Not a Node API contract, and deliberately empty.

   Understand renders the output of the `context_layer_extractor` agent, run
   against the Context Layer service (Elze-backend) — see api/extractionApi.ts
   for the shape. Nothing is described here because what that agent returns is
   markdown it wrote, not a structure this application defines.
   ========================================================================== */

/* =========================================================== step 5 — model
   PROPOSED, AI-generated. GET /context/connections/:id/model
   ========================================================================== */

export interface ModelNodeColumn {
  name: string
  dataType: string | null
  isPrimaryKey: boolean
  isForeignKey: boolean
}

export interface ModelNode {
  id: string
  label: string
  datasetId: string | null
  /** The backend's own classification. Drives node accent only. */
  kind: 'fact' | 'dimension' | 'table' | string
  columns: ModelNodeColumn[]
  /** Optional saved layout. Absent means "lay this out automatically". */
  position: { x: number; y: number } | null
}

export type RelationshipType =
  | 'one-to-one'
  | 'one-to-many'
  | 'many-to-one'
  | 'many-to-many'
  | string

export interface ModelEdge {
  id: string
  source: string
  target: string
  sourceColumn: string
  targetColumn: string
  relationshipType: RelationshipType
  /** 0–1. */
  confidence: number | null
  status: 'suggested' | 'accepted' | 'rejected' | string
  /** Human-readable join, e.g. `a.customer_id = b.customer_id`. */
  joinCondition: string | null
  /** The AI's reasoning, shown in the detail panel. */
  suggestion: string | null
}

export interface ModelGraph {
  connectionId: string
  status: 'pending' | 'generating' | 'ready' | 'failed'
  generatedAt: string | null
  error: string | null
  nodes: ModelNode[]
  edges: ModelEdge[]
}

/** The writable half of an edge. Everything else is backend-owned. */
export interface RelationshipInput {
  source: string
  target: string
  sourceColumn: string
  targetColumn: string
  relationshipType: RelationshipType
  status?: ModelEdge['status']
}

/* ========================================================== step 6 — review
   PROPOSED. GET /context/connections/:id/review
   ========================================================================== */

export type ReviewItemType =
  | 'metric'
  | 'definition'
  | 'relationship'
  | 'entity'
  | 'dimension'
  | 'table'
  | 'column'
  | string

export type ReviewItemStatus = 'pending' | 'approved' | 'rejected' | 'skipped' | string

/**
 * One thing awaiting a human decision.
 *
 * `fields` carries the type-specific payload the editor renders — a metric's
 * formula, a relationship's columns — so a new review type needs a new editor
 * and no change to this interface.
 */
export interface ReviewItem {
  id: string
  type: ReviewItemType
  name: string
  status: ReviewItemStatus
  /** 0–1. */
  confidence: number | null
  description: string | null
  formula: string | null
  source: string | null
  /** What else changes if this is approved, in the backend's words. */
  downstreamImpact: string | null
  suggestion: string | null
  createdAt: string | null
  updatedAt: string | null
  fields: Record<string, unknown> | null
}

export interface ReviewQueue {
  connectionId: string
  items: ReviewItem[]
  /** Totals per type AND per status, keyed by the same strings as above. */
  counts: Record<string, number>
  total: number
}

/** The editable subset. The backend owns status transitions and timestamps. */
export interface ReviewItemUpdate {
  name?: string
  description?: string | null
  formula?: string | null
  source?: string | null
  fields?: Record<string, unknown>
}

/* ========================================================= step 7 — publish
   LIVE. GET/POST /context/connections/:id/publish
   ========================================================================== */

/** A headline count on the publish screen. Label and value both backend-owned. */
export interface PublishStat {
  id: string
  label: string
  value: number | string
}

export interface PublishDataset {
  id: string
  name: string
  tableCount: number | null
}

/** One line of "what will be published", with whether it is actually included. */
export interface PublishContentItem {
  id: string
  label: string
  included: boolean
}

export interface PublishBlocker {
  id: string
  severity: 'blocker' | 'warning' | string
  message: string
  /** Which step resolves it, so the UI can offer a link back. */
  step: WorkflowStepId | null
}

export interface PublishSummary {
  connectionId: string
  /**
   * A starting point for the name field, not the answer.
   *
   * The previous publication name where there is one, the connection name
   * otherwise. A connection is where the data came from; a published context
   * is what it is FOR, and one connection can produce several.
   */
  suggestedName: string
  /** The last version published under that name, or null. */
  previousVersion: number | null
  /** The draft that publishing will turn into a published version, or null. */
  draft: ContextVersion | null
  stats: PublishStat[]
  datasets: PublishDataset[]
  content: PublishContentItem[]
  ready: boolean
  blockers: PublishBlocker[]
}

export interface PublishValidation {
  valid: boolean
  blockers: PublishBlocker[]
  warnings: PublishBlocker[]
}

/** One published version, as the history lists it. */
export interface PublishedVersion {
  id: string
  name: string
  version: number
  sessionId: string | null
  objectCount: number
  stats: Record<string, unknown>
  publishedBy: number | null
  publishedAt: string
}

export interface PublishResult {
  id: string
  /** The name it was published under. */
  name: string
  /** Per NAME, not per connection: republishing "Revenue" makes v2 of Revenue. */
  version: string
  publishedAt: string
  /** How many approved facts the snapshot holds. */
  objectCount: number
  status: 'published' | 'failed' | string
}

/* =========================================================================
   Versions — LIVE (Node, `context_layer_versions`)

   A context is a `draft` from its first edit until it is published; publishing
   turns that row `published`. Editing afterwards opens a NEW draft — the next
   version — beside it, so a published version never changes.
   ========================================================================== */

export type ContextVersionStatus = 'draft' | 'published'

export interface ContextVersion {
  id: string
  connectionId: string
  name: string
  version: number
  /** `v2` — the backend's own spelling, so the screen never builds it. */
  label: string
  status: ContextVersionStatus
  currentStep: WorkflowStepId | null
  datasetIds: string[]
  /** The published version this draft was edited from. */
  basedOnId: string | null
  sessionId: string | null
  extractionMode: 'agent' | 'demo' | null
  extractedAt: string | null
  objectCount: number
  stats: Record<string, unknown>
  createdBy: number | null
  createdAt: string
  updatedAt: string
  publishedBy: number | null
  publishedAt: string | null
}

export interface ContextVersionState {
  connectionId: string
  /** `none` until the first edit. */
  status: ContextVersionStatus | 'none'
  draft: ContextVersion | null
  latestPublished: ContextVersion | null
  /** Every version, newest first. */
  versions: ContextVersion[]
}

/** The one-line summary a connection card shows. */
export interface ContextVersionHeadline {
  name: string
  version: number
  label: string
  status: ContextVersionStatus
  publishedAt: string | null
  updatedAt: string
}

/** Deployment facts the builder needs from the backend. */
export interface ContextSettings {
  /**
   * `demo` while the real agent is unavailable: step 4 is run by the Node
   * backend's templated generator instead of the ADK extraction agent.
   */
  extractionMode: 'agent' | 'demo'
}

/* ======================================================== workflow (client)
   Frontend-owned. Not part of the API contract.
   ========================================================================== */

export type WorkflowStepId =
  | 'connect'
  | 'discover'
  | 'profile'
  | 'understand'
  | 'model'
  | 'review'
  | 'publish'
