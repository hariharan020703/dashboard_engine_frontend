import { contextHttp } from './client'
import { endpoints } from './endpoints'
import type { ReviewItem, ReviewItemUpdate, ReviewQueue } from '../types'

/**
 * Step 6 — Review. PROPOSED: these routes are not built yet.
 *
 * The queue of AI-generated context awaiting a human decision. Every item, its
 * type, its confidence and its downstream impact come from the backend.
 *
 * A decision is a server call, always. Approving an item is not a change to a
 * checkbox — it is the moment a fact becomes part of the published context, so
 * the backend is the only thing that may record it. The UI updates after the
 * call succeeds and refetches the queue, rather than marking an item approved
 * locally and hoping the write landed.
 */

export function fetchReviewQueue(
  connectionId: string,
  params?: { type?: string; status?: string; search?: string }
): Promise<ReviewQueue> {
  return contextHttp.get<ReviewQueue>(endpoints.reviewQueue(connectionId), { params })
}

/** Approve, reject or skip one item. */
export function decideReviewItem(
  connectionId: string,
  itemId: string,
  decision: 'approve' | 'reject' | 'skip'
): Promise<ReviewItem> {
  return contextHttp.post<ReviewItem>(
    endpoints.reviewItemDecision(connectionId, itemId),
    { decision }
  )
}

/**
 * Edit an item's content. Separate from deciding on it, because "this is right
 * as it stands" and "this is right once I fix the formula" are different acts
 * and an editor that conflated them would approve un-edited text on a mis-click.
 */
export function updateReviewItem(
  connectionId: string,
  itemId: string,
  body: ReviewItemUpdate
): Promise<ReviewItem> {
  return contextHttp.patch<ReviewItem>(endpoints.reviewItem(connectionId, itemId), body)
}

/**
 * Edit and approve in one server-side transaction.
 *
 * Two calls would leave a window where the edit landed and the approval did
 * not, which shows up later as an approved item nobody recognises.
 */
export function updateAndApproveReviewItem(
  connectionId: string,
  itemId: string,
  body: ReviewItemUpdate
): Promise<ReviewItem> {
  return contextHttp.post<ReviewItem>(
    endpoints.reviewItemDecision(connectionId, itemId),
    { decision: 'approve', update: body }
  )
}

/**
 * A bulk decision, e.g. "approve everything above 90% confidence".
 *
 * The filter is sent rather than a list of ids, so the backend decides what
 * matches. A client-side list would act on the page the user happened to have
 * loaded, which is not what the button says.
 */
export function bulkDecide(
  connectionId: string,
  body: {
    decision: 'approve' | 'reject' | 'skip'
    filter: { minConfidence?: number; type?: string; status?: string }
  }
): Promise<{ affected: number }> {
  return contextHttp.post<{ affected: number }>(
    endpoints.reviewBulkDecision(connectionId),
    body
  )
}
