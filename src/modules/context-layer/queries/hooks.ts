import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { QueryClient, UseQueryOptions } from '@tanstack/react-query'
import { contextApi, isEndpointMissing } from '../api'
import { contextKeys } from './keys'
import type {
  Connection,
  Connector,
  ContextSettings,
  ContextVersionState,
  Understanding,
  WorkflowStepId,
  CreatedConnection,
  ModelGraph,
  ProfileOverview,
  PublishResult,
  PublishSummary,
  PublishedVersion,
  PublishValidation,
  ReviewItem,
  ReviewItemUpdate,
  ReviewQueue,
  SelectedDataset,
  TableProfile,
  WarehouseDataset,
  DatasetListing,
  GlossaryQuery,
  ReviewQuery,
} from '../types'
import type { ExtractionResult } from '../api/extractionApi'
import type { ContextObjects, ContextObjectsQuery } from '../api/contextObjectsApi'

/**
 * Every server read and write the Context Layer performs.
 *
 * Components call these and nothing else — no component imports a service, and
 * no component calls fetch or axios. That boundary is what lets the backend
 * contract change underneath without a single step component being touched.
 *
 * Each step's data is fetched when its step is opened, never before: the
 * `enabled` flag on every hook below is what implements that, and it is the
 * difference between opening this workflow costing one small request and
 * costing a full profile of every table in a warehouse.
 */

/* --------------------------------------------------------------- shared --- */

/**
 * A query whose endpoint may not exist yet.
 *
 * Retrying a 404 from an unbuilt route is pointless, so this disables retry for
 * that one case while leaving genuine failures alone. The error itself is
 * passed through unchanged; `isEndpointMissing` is what the UI reads to choose
 * between "not built yet" and "something went wrong".
 */
function proposedQueryOptions<T>() {
  return {
    retry: (failureCount: number, error: unknown) =>
      !isEndpointMissing(error) && failureCount < 2,
  } satisfies Partial<UseQueryOptions<T>>
}

/* ------------------------------------------- settings and versions --- */

const settingsQuery = {
  queryKey: contextKeys.settings(),
  queryFn: () => contextApi.versions.fetchSettings(),
  // Deployment configuration: it changes when the backend restarts, not while
  // somebody is looking at the screen.
  staleTime: 10 * 60_000,
}

/** Which engine runs step 4 — the agent, or the backend's demo generator. */
export function useContextSettings() {
  return useQuery<ContextSettings>(settingsQuery)
}

/**
 * The extraction mode, for use inside a query or mutation function.
 *
 * Read through the cache rather than passed in from a component, so a hook
 * cannot run before the answer is known and silently pick the wrong service.
 */
async function extractionMode(qc: QueryClient): Promise<ContextSettings['extractionMode']> {
  const settings = await qc.ensureQueryData<ContextSettings>(settingsQuery)
  return settings.extractionMode
}

/** Draft / published state and every version of this connection's context. */
export function useContextVersions(connectionId: string | null, enabled = true) {
  return useQuery<ContextVersionState>({
    queryKey: contextKeys.versions(connectionId ?? ''),
    queryFn: () => contextApi.versions.fetchVersions(connectionId!),
    enabled: Boolean(connectionId) && enabled,
  })
}

/**
 * Moves the open draft's step marker as somebody moves through the builder.
 *
 * Never opens a draft — the backend refuses to, because looking through a
 * published context is not editing it. Fire-and-forget: a missed marker is
 * cosmetic and the next write corrects it.
 */
export function useTrackStep(connectionId: string | null) {
  const qc = useQueryClient()
  return useMutation<unknown, unknown, WorkflowStepId>({
    mutationFn: (step) => contextApi.versions.trackStep(connectionId!, step),
    onSuccess: () => qc.invalidateQueries({ queryKey: contextKeys.versions(connectionId ?? '') }),
  })
}

/**
 * Everything that changes the draft also changes what the version badge says,
 * and every fact change is a change to the glossary Understand shows.
 */
function invalidateVersions(qc: QueryClient, connectionId: string | null) {
  qc.invalidateQueries({ queryKey: contextKeys.versions(connectionId ?? '') })
  qc.invalidateQueries({ queryKey: contextKeys.understanding(connectionId ?? '') })
  qc.invalidateQueries({ queryKey: contextKeys.connections(), exact: true })
}

/* ---------------------------------------------------- step 1 — connect --- */

export function useConnectors() {
  return useQuery<Connector[]>({
    queryKey: contextKeys.connectors(),
    queryFn: () => contextApi.connections.listConnectors(),
    // The connector catalogue is deployment configuration. It does not change
    // while somebody is looking at it.
    staleTime: 30 * 60_000,
  })
}

export function useConnections() {
  return useQuery<Connection[]>({
    queryKey: contextKeys.connections(),
    queryFn: () => contextApi.connections.listConnections(),
  })
}

export function useConnection(connectionId: string | null) {
  return useQuery<Connection>({
    queryKey: contextKeys.connection(connectionId ?? ''),
    queryFn: () => contextApi.connections.getConnection(connectionId!),
    enabled: Boolean(connectionId),
  })
}

export function useCreateConnection() {
  const qc = useQueryClient()
  return useMutation<
    CreatedConnection,
    unknown,
    {
      provider: string
      name: string
      host: string
      token: string
      companyId?: number
      limit?: number
    }
  >({
    mutationFn: (body) => contextApi.connections.createConnection(body),
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: contextKeys.connections() })
      /*
       * The create response already carries the datasets the credential can
       * see — the backend had to list them to prove it works. Seeding the
       * Discover cache with them means stepping forward renders instantly
       * instead of re-asking the warehouse for an answer we already have.
       */
      qc.setQueryData<DatasetListing>(
        contextKeys.datasets(created.connection.id, created.limit),
        {
          datasets: created.datasets,
          fetchedAt: new Date().toISOString(),
          limit: created.limit,
          truncated: created.truncated,
        }
      )
    },
  })
}

export function useVerifyConnection() {
  const qc = useQueryClient()
  return useMutation<{ connection: Connection }, unknown, string>({
    mutationFn: (id) => contextApi.connections.verifyConnection(id),
    // Verify records the outcome server-side, so the row on screen must be
    // re-read either way — a refused token has just been marked invalid.
    onSettled: () => qc.invalidateQueries({ queryKey: contextKeys.connections() }),
  })
}

export function useDeleteConnection() {
  const qc = useQueryClient()
  return useMutation<{ deleted: true }, unknown, string>({
    mutationFn: (id) => contextApi.connections.deleteConnection(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: contextKeys.all }),
  })
}

/* --------------------------------------------------- step 2 — discover --- */

/**
 * A capped listing of the warehouse's datasets.
 *
 * `limit` is part of the query key, so raising it is a new request rather than
 * a stale hit, and lowering it back returns the smaller listing from cache
 * without another round trip to the warehouse.
 */
export function useDatasets(
  connectionId: string | null,
  limit?: number,
  enabled = true
) {
  return useQuery<DatasetListing>({
    queryKey: contextKeys.datasets(connectionId ?? '', limit),
    queryFn: () => contextApi.datasets.fetchDatasets(connectionId!, limit),
    enabled: Boolean(connectionId) && enabled,
    // Live warehouse state. Refetching on a revisit is the correct default.
    staleTime: 0,
    // Keeps the current rows on screen while a bigger page is in flight,
    // instead of blanking the table every time the limit changes.
    placeholderData: (prev) => prev,
  })
}

export function useSaveSelection(connectionId: string | null) {
  const qc = useQueryClient()
  return useMutation<
    Connection,
    unknown,
    Array<Pick<SelectedDataset, 'id'> & Partial<WarehouseDataset>>
  >({
    mutationFn: (datasets) => contextApi.datasets.saveSelection(connectionId!, datasets),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: contextKeys.connections() })
      /*
       * The selection is what every later step is computed from, so changing it
       * invalidates all of them rather than just the connection row. A profile
       * of datasets that are no longer selected is worse than no profile.
       */
      if (connectionId) {
        qc.invalidateQueries({ queryKey: contextKeys.datasetsAll(connectionId) })
        qc.invalidateQueries({ queryKey: contextKeys.profile(connectionId) })
        qc.invalidateQueries({ queryKey: contextKeys.extraction(connectionId) })
        qc.invalidateQueries({ queryKey: contextKeys.model(connectionId) })
        qc.invalidateQueries({ queryKey: contextKeys.review(connectionId) })
        qc.invalidateQueries({ queryKey: contextKeys.publish(connectionId) })
        invalidateVersions(qc, connectionId)
      }
    },
  })
}

/* ---------------------------------------------------- step 3 — profile --- */

export function useProfileOverview(connectionId: string | null, enabled = true) {
  return useQuery<ProfileOverview>({
    queryKey: contextKeys.profile(connectionId ?? ''),
    queryFn: () => contextApi.profile.fetchProfileOverview(connectionId!),
    enabled: Boolean(connectionId) && enabled,
    ...proposedQueryOptions<ProfileOverview>(),
  })
}

/**
 * One table's full profile.
 *
 * Deliberately a separate query keyed by table: the step loads the tree first
 * and this only when somebody selects a table, so opening Profile on a
 * connection with two hundred tables fetches one small tree, not two hundred
 * column lists.
 */
export function useTableProfile(connectionId: string | null, tableId: string | null) {
  return useQuery<TableProfile>({
    queryKey: contextKeys.tableProfile(connectionId ?? '', tableId ?? ''),
    queryFn: () => contextApi.profile.fetchTableProfile(connectionId!, tableId!),
    enabled: Boolean(connectionId && tableId),
    ...proposedQueryOptions<TableProfile>(),
  })
}

/* ------------------------------------------------- step 4 — understand --- */

/**
 * The extraction run, against the Context Layer service rather than the Node API.
 *
 * Started from Profile's "Analyse with AI" and displayed in Understand, which
 * is why it lives here rather than inside either step: it is one piece of
 * server state two steps share, and the query cache is where this module keeps
 * those.
 */
export function useExtraction(connectionId: string | null, enabled = true) {
  const qc = useQueryClient()
  return useQuery<ExtractionResult | null>({
    queryKey: contextKeys.extraction(connectionId ?? ''),
    queryFn: async () =>
      (await extractionMode(qc)) === 'demo'
        ? contextApi.extraction.fetchLatestDemoExtraction(connectionId!)
        : contextApi.extraction.fetchLatestExtraction(connectionId!),
    enabled: Boolean(connectionId) && enabled,
    /*
     * A finished run does not change on its own, and re-reading a transcript
     * on every visit to the step is a round trip for an answer that cannot
     * have moved. A new run replaces it through the mutation below.
     */
    staleTime: 5 * 60_000,
    // The service is only reachable when it is running locally; a retry storm
    // against a service that is simply not up helps nobody.
    retry: false,
  })
}

/**
 * Runs the extraction: creates a session, then sends the datasets to it.
 *
 * `stream: false` means the request stays open for the whole run - minutes,
 * not seconds - so the caller shows progress rather than waiting silently.
 * The result is written straight into the cache, so Understand has it the
 * moment the step opens rather than re-reading the transcript it just caused.
 */
export function useRunExtraction(connectionId: string | null) {
  const qc = useQueryClient()
  return useMutation<ExtractionResult, unknown, { datasetIds: string[]; domain?: string }>({
    /*
     * Demo mode runs in the Node backend, from the saved selection — the
     * dataset ids are not sent because the backend reads the same ones.
     */
    mutationFn: async ({ datasetIds, domain }) =>
      (await extractionMode(qc)) === 'demo'
        ? contextApi.extraction.runDemoExtraction(connectionId!)
        : contextApi.extraction.runExtraction(connectionId!, datasetIds, { domain }),
    onSuccess: (result) => {
      qc.setQueryData(contextKeys.extraction(connectionId ?? ''), result)
      invalidateVersions(qc, connectionId)
      // New facts change what Model, Review and Publish derive from them.
      qc.invalidateQueries({ queryKey: contextKeys.model(connectionId ?? '') })
      qc.invalidateQueries({ queryKey: contextKeys.review(connectionId ?? '') })
      qc.invalidateQueries({ queryKey: contextKeys.publish(connectionId ?? '') })
      /*
       * A run's whole purpose is to write context_objects rows, so the facts
       * are stale the moment it finishes. Invalidated rather than seeded: the
       * response carries the agent's report, not the rows it wrote, and those
       * have to be read back from the store.
       */
      qc.invalidateQueries({ queryKey: contextKeys.contextObjects(connectionId ?? '') })
    },
  })
}

/**
 * The facts the latest run wrote.
 *
 * This is the real output of step 4 — the agent's prose is a report about the
 * run, these rows are what it did. Read from the Context Layer store rather
 * than parsed out of that prose, so the screen shows what was actually
 * recorded rather than what the agent said it recorded.
 */
/** The first page of facts, unfiltered - what the Understand step opens on. */
export const DEFAULT_FACTS_QUERY: ContextObjectsQuery = { page: 1, pageSize: 25 }

/** One page of a run's facts. Read through Node in either extraction mode. */
export function useContextObjects(
  connectionId: string | null,
  query: ContextObjectsQuery = DEFAULT_FACTS_QUERY,
  enabled = true
) {
  return useQuery<ContextObjects>({
    queryKey: [...contextKeys.contextObjects(connectionId ?? ''), query],
    queryFn: () => contextApi.contextObjects.fetchContextObjects(connectionId!, query),
    enabled: Boolean(connectionId) && enabled,
    staleTime: 60_000,
    // The previous page stays on screen while the next one loads.
    placeholderData: (prev) => prev,
    retry: false,
  })
}

/** The glossary's opening view: every term, first page. */
export const DEFAULT_GLOSSARY_QUERY: GlossaryQuery = { filter: 'all', page: 1, pageSize: 10 }

/** The business glossary's stats and one page of terms — Understand's main view. */
export function useUnderstanding(
  connectionId: string | null,
  query: GlossaryQuery = DEFAULT_GLOSSARY_QUERY,
  enabled = true
) {
  return useQuery<Understanding>({
    queryKey: [...contextKeys.understanding(connectionId ?? ''), query],
    queryFn: () => contextApi.contextObjects.fetchUnderstanding(connectionId!, query),
    enabled: Boolean(connectionId) && enabled,
    placeholderData: (prev) => prev,
    ...proposedQueryOptions<Understanding>(),
  })
}

/* ------------------------------------------------------ step 5 — model --- */

export function useModel(connectionId: string | null, enabled = true) {
  return useQuery<ModelGraph>({
    queryKey: contextKeys.model(connectionId ?? ''),
    queryFn: () => contextApi.model.fetchModel(connectionId!),
    enabled: Boolean(connectionId) && enabled,
    refetchInterval: (query) =>
      query.state.data?.status === 'generating' ? 4000 : false,
    ...proposedQueryOptions<ModelGraph>(),
  })
}

/**
 * Accepts or rejects a relationship.
 *
 * One mutation where there used to be four. The graph is derived from the
 * extraction's `join` rows, so there is nothing to create, nothing to generate
 * and nothing to delete — deciding about a join IS a review decision on that
 * row, and routing it through the same endpoint means one `verified` flag
 * rather than two mechanisms that can disagree about whether a join is trusted.
 *
 * Invalidates the review queue too: the same row is an item there, and leaving
 * it stale is how the canvas and the queue end up showing different states for
 * one fact.
 */
export function useDecideRelationship(connectionId: string | null) {
  const qc = useQueryClient()
  return useMutation<unknown, unknown, { id: string; status: 'accepted' | 'rejected' }>({
    mutationFn: ({ id, status }) =>
      contextApi.model.decideRelationship(connectionId!, id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: contextKeys.model(connectionId ?? '') })
      qc.invalidateQueries({ queryKey: contextKeys.review(connectionId ?? '') })
      qc.invalidateQueries({ queryKey: contextKeys.publish(connectionId ?? '') })
      invalidateVersions(qc, connectionId)
    },
  })
}

/* ----------------------------------------------------- step 6 — review --- */

export function useReviewQueue(
  connectionId: string | null,
  filters: ReviewQuery,
  enabled = true
) {
  return useQuery<ReviewQueue>({
    queryKey: contextKeys.reviewFiltered(connectionId ?? '', filters),
    queryFn: () => contextApi.review.fetchReviewQueue(connectionId!, filters),
    enabled: Boolean(connectionId) && enabled,
    // Keeps the previous page on screen while a filter change is in flight,
    // instead of blanking the queue on every keystroke of the search box.
    placeholderData: (prev) => prev,
    ...proposedQueryOptions<ReviewQueue>(),
  })
}

/**
 * Approve / reject / skip.
 *
 * Invalidates rather than patching the cached item in place: a decision can
 * cascade server-side — approving a relationship can resolve a blocker, change
 * the counts, and remove another item from the queue — and guessing at that
 * from the client is how the screen and the server drift apart.
 */
export function useDecideReviewItem(connectionId: string | null) {
  const qc = useQueryClient()
  return useMutation<
    ReviewItem,
    unknown,
    { id: string; decision: 'approve' | 'reject' | 'skip' }
  >({
    mutationFn: ({ id, decision }) =>
      contextApi.review.decideReviewItem(connectionId!, id, decision),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: contextKeys.review(connectionId ?? '') })
      qc.invalidateQueries({ queryKey: contextKeys.publish(connectionId ?? '') })
      invalidateVersions(qc, connectionId)
    },
  })
}

export function useUpdateReviewItem(connectionId: string | null) {
  const qc = useQueryClient()
  return useMutation<
    ReviewItem,
    unknown,
    { id: string; body: ReviewItemUpdate; approve?: boolean }
  >({
    mutationFn: ({ id, body, approve }) =>
      approve
        ? contextApi.review.updateAndApproveReviewItem(connectionId!, id, body)
        : contextApi.review.updateReviewItem(connectionId!, id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: contextKeys.review(connectionId ?? '') })
      qc.invalidateQueries({ queryKey: contextKeys.publish(connectionId ?? '') })
      invalidateVersions(qc, connectionId)
    },
  })
}

export function useBulkDecide(connectionId: string | null) {
  const qc = useQueryClient()
  return useMutation<
    { affected: number },
    unknown,
    {
      decision: 'approve' | 'reject' | 'skip'
      filter: { minConfidence?: number; type?: string; status?: string }
    }
  >({
    mutationFn: (body) => contextApi.review.bulkDecide(connectionId!, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: contextKeys.review(connectionId ?? '') })
      qc.invalidateQueries({ queryKey: contextKeys.publish(connectionId ?? '') })
      invalidateVersions(qc, connectionId)
    },
  })
}

/* ---------------------------------------------------- step 7 — publish --- */

export function usePublishSummary(connectionId: string | null, enabled = true) {
  return useQuery<PublishSummary>({
    queryKey: contextKeys.publishSummary(connectionId ?? ''),
    queryFn: () => contextApi.publish.fetchPublishSummary(connectionId!),
    enabled: Boolean(connectionId) && enabled,
    // Always re-read on entering the step: this is the number somebody is
    // about to act on.
    staleTime: 0,
    ...proposedQueryOptions<PublishSummary>(),
  })
}

export function useValidatePublish(connectionId: string | null) {
  return useMutation<PublishValidation, unknown, void>({
    mutationFn: () => contextApi.publish.validatePublish(connectionId!),
  })
}

export function usePublish(connectionId: string | null) {
  const qc = useQueryClient()
  return useMutation<PublishResult, unknown, { name: string; notifyTeam?: boolean }>({
    mutationFn: (body) => contextApi.publish.publishContext(connectionId!, body),
    // Publishing changes what every later read reports about this connection.
    onSuccess: () => qc.invalidateQueries({ queryKey: contextKeys.all }),
  })
}

/** Every version published under this connection, newest first. */
export function usePublications(connectionId: string | null, enabled = true) {
  return useQuery<PublishedVersion[]>({
    queryKey: [...contextKeys.publish(connectionId ?? ''), 'versions'],
    queryFn: () => contextApi.publish.listPublications(connectionId!),
    enabled: Boolean(connectionId) && enabled,
    ...proposedQueryOptions<PublishedVersion[]>(),
  })
}
