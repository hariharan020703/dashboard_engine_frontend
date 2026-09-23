import { contextHttp } from './client'
import { endpoints } from './endpoints'
import type { ModelEdge, ModelGraph, RelationshipInput } from '../types'

/**
 * Step 5 — Model. PROPOSED: these routes are not built yet.
 *
 * Relationship detection is the backend's: it has the profiles, the key
 * metadata and the AI. What comes back is a plain graph — `nodes` and `edges`
 * — and the frontend's whole job is to draw it and let somebody argue with it.
 *
 * No node, edge, join condition or confidence value is authored here. The
 * canvas renders however many tables the backend sends, which is why it uses a
 * real graph library with automatic layout rather than positions chosen to
 * suit a particular example.
 *
 * `position` on a node is optional and round-trips: absent means "lay this out
 * for me", present means somebody moved it and the layout should be kept.
 */

export function fetchModel(connectionId: string): Promise<ModelGraph> {
  return contextHttp.get<ModelGraph>(endpoints.model(connectionId))
}

/** Asks for a fresh detection run. Same shape as the read, so it can seed the cache. */
export function generateModel(connectionId: string): Promise<ModelGraph> {
  return contextHttp.post<ModelGraph>(endpoints.generateModel(connectionId))
}

export function createRelationship(
  connectionId: string,
  body: RelationshipInput
): Promise<ModelEdge> {
  return contextHttp.post<ModelEdge>(endpoints.relationships(connectionId), body)
}

/**
 * Accepting or rejecting an AI suggestion is an update to `status`, not a
 * delete — a rejected suggestion has to stay rejected, or the next detection
 * run proposes it again and somebody dismisses the same thing twice.
 */
export function updateRelationship(
  connectionId: string,
  relationshipId: string,
  body: Partial<RelationshipInput> & { status?: ModelEdge['status'] }
): Promise<ModelEdge> {
  return contextHttp.patch<ModelEdge>(
    endpoints.relationship(connectionId, relationshipId),
    body
  )
}

/** For a relationship somebody added by hand and wants gone entirely. */
export function deleteRelationship(
  connectionId: string,
  relationshipId: string
): Promise<{ deleted: true }> {
  return contextHttp.delete<{ deleted: true }>(
    endpoints.relationship(connectionId, relationshipId)
  )
}

/** Persists a canvas layout. Positions are the one thing the frontend authors. */
export function saveLayout(
  connectionId: string,
  positions: Array<{ id: string; position: { x: number; y: number } }>
): Promise<{ saved: true }> {
  return contextHttp.put<{ saved: true }>(endpoints.model(connectionId), { positions })
}
