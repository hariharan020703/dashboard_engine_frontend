import { useState } from 'react'
import type { ReviewItem, ReviewItemUpdate } from '../../types'

/**
 * Holds the edit draft while the review drawer is open.
 *
 * The draft starts empty and only carries the fields somebody actually changed,
 * so saving sends a patch rather than rewriting an item with values that were
 * merely displayed.
 *
 * Re-seeding on a different item happens during render, keyed on the item's id,
 * rather than in an effect. An effect would run after the drawer had already
 * painted with the previous item's draft, and — worse — a background refetch of
 * the queue would re-run it and wipe an edit in progress. Comparing the id here
 * cannot do either.
 *
 * In its own file because `editors.tsx` exports components, and a module that
 * exports both a hook and components loses fast refresh.
 */
export function useReviewDraft(item: ReviewItem | null) {
  const [draft, setDraft] = useState<ReviewItemUpdate>({})
  const [draftFor, setDraftFor] = useState<string | null>(null)

  if (item && item.id !== draftFor) {
    setDraftFor(item.id)
    setDraft({})
  }

  return { draft, setDraft }
}
