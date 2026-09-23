import { listAdkContextObjects } from '@/api/adkAgentApi'
import type { AdkContextObject, AdkContextObjects } from '@/api/adkAgentApi'

/**
 * The facts an extraction run wrote into the Context Layer.
 *
 * This is the actual product of step 4. The agent's prose answer is a report
 * ABOUT the run; these rows are what it did — one per table, column, join,
 * transformation or example it recorded, each tagged with the session that
 * wrote it.
 *
 * Same service as `extractionApi.ts` (`VITE_ADK_API_BASE_URL`), and the same
 * identity trick: `workspace_id` is the connection id.
 *
 * Omitting a session id resolves to the workspace's latest run, which is what
 * the step wants on arrival — "what does the context layer currently know
 * about this connection" without having to remember a session.
 */

export type ContextObject = AdkContextObject
export type ContextObjects = AdkContextObjects

export function fetchContextObjects(
  connectionId: string,
  sessionId?: string
): Promise<ContextObjects> {
  return listAdkContextObjects(connectionId, sessionId)
}

/**
 * Groups objects by `object_type`, preserving the order the service returned.
 *
 * The service sorts by `object_type, qualified_name`, so the groups come out
 * in a stable order without this having to impose one — which matters because
 * the set of types is the skill's, not this application's, and a hardcoded
 * order here would put a new type last or drop it.
 */
export function groupByType(objects: ContextObject[]): Array<{
  type: string
  objects: ContextObject[]
}> {
  const groups = new Map<string, ContextObject[]>()
  for (const object of objects) {
    const key = object.object_type || 'unknown'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(object)
  }
  return [...groups.entries()].map(([type, list]) => ({ type, objects: list }))
}
