/**
 * Where the Context Layer's backend lives, and nothing else.
 *
 * One value, read once. The rest of the module imports `CONTEXT_API_BASE_URL`
 * and never touches `import.meta.env` again — which is what makes moving from a
 * development backend to a production one a change to `.env` rather than a
 * search across components.
 *
 * The default is `/api`: the Express backend serves this SPA and the Vite dev
 * server proxies `/api` to it, so a same-origin relative path is correct in
 * every supported deployment and no URL is shipped in the bundle. Setting
 * VITE_CONTEXT_API_URL to an absolute origin points the whole module elsewhere
 * — at a separate context service, a staging host, a colleague's machine —
 * without touching a line of code.
 */

const RAW = import.meta.env.VITE_CONTEXT_API_URL

/** Trailing slashes are stripped so `${BASE}${path}` never doubles them up. */
export const CONTEXT_API_BASE_URL: string =
  typeof RAW === 'string' && RAW.trim() ? RAW.trim().replace(/\/+$/, '') : '/api'

/**
 * True when the module is talking to the app's own backend over a relative
 * path, false when it has been pointed at an absolute origin.
 *
 * Read by the transport to decide whether a request can go through the app's
 * authenticated client (bearer token, CSRF, session renewal) or has to be a
 * plain cross-origin call. See api/client.ts.
 */
export const IS_SAME_ORIGIN_API = CONTEXT_API_BASE_URL.startsWith('/')

/**
 * How many datasets a listing asks for.
 *
 * Listing is the slowest thing a connector does — an instance with a few
 * thousand datasets is dozens of round trips before the picker can draw
 * anything, and nobody chooses from a list that long by scrolling it. So the
 * workflow asks for a page and offers to widen it.
 *
 * Sent explicitly on every call rather than left to the backend's own default,
 * even though the two agree. The limit is part of the query cache key, so a
 * request that omits it caches under "default" while the create response
 * caches under `20` — the same rows, under two keys, and the picker refetches
 * for an answer it already had.
 */
export const DEFAULT_DATASET_LIMIT = 20

/** What the picker's limit selector offers. The backend caps requests at 500. */
export const DATASET_LIMIT_OPTIONS = [10, 20, 50, 100, 250] as const
