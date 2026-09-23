import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { UseQueryOptions } from '@tanstack/react-query'
import { contextApi, isEndpointMissing } from '../api'
import { contextKeys } from './keys'
import type {
  Connection,
  Connector,
  CreatedConnection,
  ModelEdge,
  ModelGraph,
  ProfileOverview,
  PublishResult,
  PublishSummary,
  PublishValidation,
  RelationshipInput,
  ReviewItem,
  ReviewItemUpdate,
  ReviewQueue,
  SelectedDataset,
  TableProfile,
  Understanding,
  WarehouseDataset,
  DatasetListing,
} from '../types'

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
        qc.invalidateQueries({ queryKey: contextKeys.understanding(connectionId) })
        qc.invalidateQueries({ queryKey: contextKeys.model(connectionId) })
        qc.invalidateQueries({ queryKey: contextKeys.review(connectionId) })
        qc.invalidateQueries({ queryKey: contextKeys.publish(connectionId) })
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

export function useUnderstanding(connectionId: string | null, enabled = true) {
  return useQuery<Understanding>({
    queryKey: contextKeys.understanding(connectionId ?? ''),
    queryFn: () => contextApi.understanding.fetchUnderstanding(connectionId!),
    enabled: Boolean(connectionId) && enabled,
    /*
     * While a run is in flight the backend reports `generating`; poll until it
     * settles. Returning false rather than a number stops the timer, so a ready
     * or failed result is not re-fetched every few seconds forever.
     */
    refetchInterval: (query) =>
      query.state.data?.status === 'generating' ? 4000 : false,
    ...proposedQueryOptions<Understanding>(),
  })
}

export function useGenerateUnderstanding(connectionId: string | null) {
  const qc = useQueryClient()
  return useMutation<Understanding, unknown, void>({
    mutationFn: () => contextApi.understanding.generateUnderstanding(connectionId!),
    onSuccess: (data) => {
      // Seed with the run's initial state so the poller above takes over
      // immediately rather than after the next refetch.
      qc.setQueryData(contextKeys.understanding(connectionId ?? ''), data)
    },
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

export function useGenerateModel(connectionId: string | null) {
  const qc = useQueryClient()
  return useMutation<ModelGraph, unknown, void>({
    mutationFn: () => contextApi.model.generateModel(connectionId!),
    onSuccess: (data) => qc.setQueryData(contextKeys.model(connectionId ?? ''), data),
  })
}

export function useUpdateRelationship(connectionId: string | null) {
  const qc = useQueryClient()
  return useMutation<
    ModelEdge,
    unknown,
    { id: string; body: Partial<RelationshipInput> & { status?: ModelEdge['status'] } }
  >({
    mutationFn: ({ id, body }) =>
      contextApi.model.updateRelationship(connectionId!, id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: contextKeys.model(connectionId ?? '') })
      // Accepting a relationship changes what would be published.
      qc.invalidateQueries({ queryKey: contextKeys.publish(connectionId ?? '') })
    },
  })
}

export function useCreateRelationship(connectionId: string | null) {
  const qc = useQueryClient()
  return useMutation<ModelEdge, unknown, RelationshipInput>({
    mutationFn: (body) => contextApi.model.createRelationship(connectionId!, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: contextKeys.model(connectionId ?? '') })
      qc.invalidateQueries({ queryKey: contextKeys.publish(connectionId ?? '') })
    },
  })
}

export function useDeleteRelationship(connectionId: string | null) {
  const qc = useQueryClient()
  return useMutation<{ deleted: true }, unknown, string>({
    mutationFn: (id) => contextApi.model.deleteRelationship(connectionId!, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: contextKeys.model(connectionId ?? '') })
      qc.invalidateQueries({ queryKey: contextKeys.publish(connectionId ?? '') })
    },
  })
}

/* ----------------------------------------------------- step 6 — review --- */

export function useReviewQueue(
  connectionId: string | null,
  filters: { type?: string; status?: string; search?: string },
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
  return useMutation<PublishResult, unknown, { notifyTeam?: boolean } | void>({
    mutationFn: (body) =>
      contextApi.publish.publishContext(connectionId!, body ?? undefined),
    // Publishing changes what every later read reports about this connection.
    onSuccess: () => qc.invalidateQueries({ queryKey: contextKeys.all }),
  })
}
