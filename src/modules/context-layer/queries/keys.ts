/**
 * Every query key in the module, built from one factory.
 *
 * Keys are hierarchical and always start `['context']`, so invalidation can be
 * as broad or as narrow as the mutation deserves: approving one review item
 * invalidates that connection's review queue and its publish summary, and
 * leaves the profile and the model alone.
 *
 * Hand-written key arrays are how two call sites end up disagreeing about a
 * key — one cached under `['datasets', id]`, the other invalidating
 * `['dataset', id]`, and a stale list nobody can explain. There is one spelling
 * of each key, here.
 */
export const contextKeys = {
  all: ['context'] as const,

  connectors: () => [...contextKeys.all, 'connectors'] as const,

  settings: () => [...contextKeys.all, 'settings'] as const,

  /** Draft / published state of one connection's context. */
  versions: (connectionId: string) => [...contextKeys.all, 'versions', connectionId] as const,

  connections: () => [...contextKeys.all, 'connections'] as const,
  connection: (id: string) => [...contextKeys.connections(), id] as const,

  /*
   * The limit is part of the key, not a detail of the request.
   *
   * Two listings of the same connection at different limits are different
   * answers, and caching them under one key means raising the limit shows the
   * old twenty rows until something invalidates them.
   */
  datasets: (connectionId: string, limit?: number) =>
    [...contextKeys.all, 'datasets', connectionId, limit ?? 'default'] as const,
  /** Every listing of one connection, whatever the limit. For invalidation. */
  datasetsAll: (connectionId: string) =>
    [...contextKeys.all, 'datasets', connectionId] as const,

  profile: (connectionId: string) => [...contextKeys.all, 'profile', connectionId] as const,
  tableProfile: (connectionId: string, tableId: string) =>
    [...contextKeys.profile(connectionId), 'table', tableId] as const,

  /**
   * The context extraction run. Lives against the Context Layer service, not
   * the Node API, but is cached here like anything else this module reads.
   */
  /** The facts a run wrote — read from the Context Layer store itself. */
  contextObjects: (connectionId: string) =>
    [...contextKeys.all, 'context-objects', connectionId] as const,

  extraction: (connectionId: string) =>
    [...contextKeys.all, 'extraction', connectionId] as const,


  model: (connectionId: string) => [...contextKeys.all, 'model', connectionId] as const,

  review: (connectionId: string) => [...contextKeys.all, 'review', connectionId] as const,
  reviewFiltered: (connectionId: string, filters: Record<string, unknown>) =>
    [...contextKeys.review(connectionId), filters] as const,

  publish: (connectionId: string) => [...contextKeys.all, 'publish', connectionId] as const,
  publishSummary: (connectionId: string) =>
    [...contextKeys.publish(connectionId), 'summary'] as const,
}
