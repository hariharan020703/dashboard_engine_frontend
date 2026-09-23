import { contextHttp } from './client'
import { endpoints } from './endpoints'
import type { ModelEdge, ModelGraph } from '../types'
import { decideReviewItem } from './reviewApi'

/**
 * Step 5 — Model. LIVE.
 *
 * Read only, and derived rather than stored. The backend builds this graph
 * from the facts the extraction run already wrote: `table` rows become nodes,
 * their `column_stats` rows become those nodes' columns, and `join` rows
 * become edges carrying the join keys, cardinality and confidence the agent
 * recorded.
 *
 * So there is no "detect relationships" call here. Detection happened in step
 * 4; this step shows what it found. Re-running it means running the extraction
 * again, which is Understand's button, not this one's.
 *
 * Accepting or rejecting a relationship is a REVIEW DECISION on that join row,
 * not a separate relationship resource. One decision, one place it is
 * recorded, one `verified` flag the analyst agent later filters on — rather
 * than two mechanisms that can disagree about whether a join is trusted.
 */

export function fetchModel(connectionId: string): Promise<ModelGraph> {
  return contextHttp.get<ModelGraph>(endpoints.model(connectionId))
}

/**
 * Accepts or rejects a relationship.
 *
 * `edge.id` is the `context_objects` row id of the join, which is exactly what
 * the review endpoints key on — so this is the same call the Review step makes
 * on the same row, reached from the canvas instead of from the queue.
 */
export function decideRelationship(
  connectionId: string,
  relationshipId: string,
  status: 'accepted' | 'rejected'
): Promise<unknown> {
  return decideReviewItem(
    connectionId,
    relationshipId,
    status === 'accepted' ? 'approve' : 'reject'
  )
}

export type { ModelEdge }
