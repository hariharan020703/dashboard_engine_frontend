import * as connections from './connectionApi'
import * as datasets from './datasetApi'
import * as profile from './profileApi'
import * as model from './modelApi'
import * as review from './reviewApi'
import * as publish from './publishApi'
import * as extraction from './extractionApi'
import * as contextObjects from './contextObjectsApi'

/**
 * The Context Layer's API surface, one namespace per step.
 *
 * `contextApi.profile.fetchTableProfile(...)` reads as what it is. The
 * individual modules are also exported directly, for a caller that wants one
 * function and no namespace.
 *
 * Nothing outside `api/` builds a URL, calls axios, or knows which backend is
 * answering. That is the seam: when the real contract arrives, it is absorbed
 * here and in `endpoints.ts`, and the hooks, steps and components above are
 * unaffected.
 */
export const contextApi = {
  connections,
  datasets,
  profile,
  model,
  review,
  publish,
  extraction,
  contextObjects,
} as const

export * from './connectionApi'
export * from './datasetApi'
export * from './profileApi'
export * from './modelApi'
export * from './reviewApi'
export * from './publishApi'
export * from './extractionApi'
export * from './contextObjectsApi'
export { isEndpointMissing, ApiError } from './client'
export { endpoints, STEP_ENDPOINT_LIVE } from './endpoints'
