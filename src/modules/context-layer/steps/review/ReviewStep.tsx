import { useDeferredValue, useMemo, useState } from 'react'
import { Check, ChevronRight, Pencil, Search, SkipForward, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { notify } from '@/components/common/notify'
import { cn } from '@/lib/utils'
import { StepFrame } from '../../components/StepFrame'
import {
  EmptyState,
  NoConnectionState,
  QueryBoundary,
  TableSkeleton,
} from '../../components/DataStates'
import { AiBadge, ConfidenceMeter, StatusBadge } from '../../components/primitives'
import { formatText } from '../../components/format'
import { endpoints } from '../../api'
import {
  useBulkDecide,
  useDecideReviewItem,
  useReviewQueue,
  useUpdateReviewItem,
} from '../../queries/hooks'
import { useWorkflow } from '../../state/workflowContext'
import type { ReviewItem } from '../../types'
import { ReviewItemEditor } from './editors'
import { useReviewDraft } from './useReviewDraft'

/**
 * Step 6 — Review.
 *
 * The queue is entirely the backend's: every item, its type, its confidence and
 * its downstream impact. Nothing is authored here, and the filter chips are
 * built from the counts the API returns rather than a list of expected types —
 * a new review type appears in the filters on its own.
 *
 * Every decision is a server call. Approving is the moment a generated fact
 * becomes part of the context that gets published, so it cannot be a local
 * state change that hopes a write landed. The queue refetches after each one,
 * because a decision can cascade: approving a relationship can resolve a
 * blocker and remove another item entirely.
 */
export function ReviewStep() {
  const { connectionId, goToStep } = useWorkflow()

  const [type, setType] = useState<string>('all')
  const [status, setStatus] = useState<string>('all')
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)

  const filters = useMemo(
    () => ({
      ...(type !== 'all' ? { type } : {}),
      ...(status !== 'all' ? { status } : {}),
      ...(deferredSearch.trim() ? { search: deferredSearch.trim() } : {}),
    }),
    [type, status, deferredSearch]
  )

  const queue = useReviewQueue(connectionId, filters)
  const decide = useDecideReviewItem(connectionId)
  const update = useUpdateReviewItem(connectionId)
  const bulk = useBulkDecide(connectionId)

  const [editing, setEditing] = useState<ReviewItem | null>(null)
  const { draft, setDraft } = useReviewDraft(editing)

  if (!connectionId) {
    return (
      <StepFrame title="Review generated context" hideNext>
        <NoConnectionState onConnect={() => goToStep('connect')} />
      </StepFrame>
    )
  }

  const onDecide = async (item: ReviewItem, decision: 'approve' | 'reject' | 'skip') => {
    try {
      await decide.mutateAsync({ id: item.id, decision })
      notify.success(`${item.name} ${decision}d.`)
    } catch (err) {
      notify.failure(`${decision} “${item.name}”`, err)
    }
  }

  const onSaveEdit = async (approve: boolean) => {
    if (!editing) return
    try {
      await update.mutateAsync({ id: editing.id, body: draft, approve })
      notify.success(approve ? `${editing.name} updated and approved.` : `${editing.name} updated.`)
      setEditing(null)
    } catch (err) {
      notify.failure(`save “${editing.name}”`, err)
    }
  }

  const onBulkApprove = async () => {
    try {
      const result = await bulk.mutateAsync({
        decision: 'approve',
        filter: { minConfidence: 0.9, ...(type !== 'all' ? { type } : {}) },
      })
      notify.success(`${result.affected} item${result.affected === 1 ? '' : 's'} approved.`)
    } catch (err) {
      notify.failure('approve the high-confidence items', err)
    }
  }

  return (
    <StepFrame
      title="Review generated context"
      description="Approve, edit or reject each generated item. Only approved context is published."
      actions={
        <Button variant="outline" size="sm" onClick={onBulkApprove} disabled={bulk.isPending}>
          Approve all above 90%
        </Button>
      }
    >
      <QueryBoundary
        query={queue}
        step="Review"
        endpoint={`GET ${endpoints.reviewQueue(connectionId)}`}
        context="load the review queue"
        loading={<TableSkeleton rows={6} columns={4} />}
      >
        {(data) => (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {/* Filter chips built from the backend's own counts. */}
              <FilterChip
                label="All"
                count={data.total}
                active={type === 'all'}
                onClick={() => setType('all')}
              />
              {Object.entries(data.counts).map(([key, count]) => (
                <FilterChip
                  key={key}
                  label={key}
                  count={count}
                  active={type === key}
                  onClick={() => setType(type === key ? 'all' : key)}
                />
              ))}

              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                aria-label="Filter by status"
                className="ml-auto h-8 rounded-md border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring"
              >
                <option value="all">All states</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="skipped">Skipped</option>
              </select>

              <div className="relative w-full max-w-[200px]">
                <Search
                  className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search items…"
                  aria-label="Search review items"
                  className="h-8 pl-8 text-xs"
                />
              </div>
            </div>

            {data.items.length === 0 ? (
              <EmptyState
                title="Nothing to review"
                detail="No item matches the current filters."
              />
            ) : (
              <ul className="space-y-2">
                {data.items.map((item) => (
                  <ReviewRow
                    key={item.id}
                    item={item}
                    busy={decide.isPending}
                    onDecide={(decision) => onDecide(item, decision)}
                    onEdit={() => setEditing(item)}
                  />
                ))}
              </ul>
            )}
          </div>
        )}
      </QueryBoundary>

      {/* ------------------------------------------------- edit drawer --- */}
      <Sheet open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {editing ? (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <span className="truncate">{editing.name}</span>
                  <Badge variant="secondary" className="capitalize">
                    {editing.type}
                  </Badge>
                </SheetTitle>
              </SheetHeader>

              <div className="px-4">
                <ReviewItemEditor item={editing} value={draft} onChange={setDraft} />

                {editing.downstreamImpact ? (
                  <p className="mt-4 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Downstream impact: </span>
                    {editing.downstreamImpact}
                  </p>
                ) : null}
              </div>

              <SheetFooter className="flex-row justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>
                  Cancel
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onSaveEdit(false)}
                  disabled={update.isPending}
                >
                  Save
                </Button>
                <Button size="sm" onClick={() => onSaveEdit(true)} disabled={update.isPending}>
                  <Check className="size-4" aria-hidden />
                  Save and approve
                </Button>
              </SheetFooter>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </StepFrame>
  )
}

function FilterChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string
  count: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border px-2.5 py-1 text-xs capitalize transition-colors',
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'bg-card hover:bg-accent'
      )}
    >
      {label} <span className="tabular-nums opacity-70">({count})</span>
    </button>
  )
}

function ReviewRow({
  item,
  busy,
  onDecide,
  onEdit,
}: {
  item: ReviewItem
  busy: boolean
  onDecide: (decision: 'approve' | 'reject' | 'skip') => void
  onEdit: () => void
}) {
  const settled = item.status !== 'pending'

  return (
    <li
      className={cn(
        'rounded-lg border-l-2 bg-card p-3 transition-colors',
        item.status === 'approved' && 'border-l-emerald-500',
        item.status === 'rejected' && 'border-l-rose-500 opacity-60',
        item.status === 'skipped' && 'border-l-muted-foreground opacity-60',
        item.status === 'pending' && 'border-l-amber-400'
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-medium">{item.name}</p>
        <Badge variant="secondary" className="capitalize">
          {item.type}
        </Badge>
        {item.status === 'pending' ? <AiBadge /> : <StatusBadge status={item.status} />}
        <div className="ml-auto">
          <ConfidenceMeter value={item.confidence} />
        </div>
      </div>

      {item.description ? (
        <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
      ) : null}

      {item.formula ? (
        <code className="mt-1.5 block overflow-x-auto rounded bg-muted px-2 py-1 font-mono text-xs">
          {item.formula}
        </code>
      ) : null}

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {item.downstreamImpact ? (
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <ChevronRight className="size-3" aria-hidden />
            {item.downstreamImpact}
          </p>
        ) : null}

        <div className="ml-auto flex items-center gap-1.5">
          {settled ? (
            <Button size="sm" variant="ghost" onClick={onEdit}>
              <Pencil className="size-3.5" aria-hidden />
              Edit
            </Button>
          ) : (
            <>
              <Button
                size="sm"
                className="h-7 bg-emerald-600 hover:bg-emerald-700"
                onClick={() => onDecide('approve')}
                disabled={busy}
              >
                <Check className="size-3.5" aria-hidden />
                Approve
              </Button>
              <Button size="sm" variant="outline" className="h-7" onClick={onEdit}>
                <Pencil className="size-3.5" aria-hidden />
                Edit
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7"
                onClick={() => onDecide('reject')}
                disabled={busy}
              >
                <X className="size-3.5" aria-hidden />
                Reject
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7"
                onClick={() => onDecide('skip')}
                disabled={busy}
              >
                <SkipForward className="size-3.5" aria-hidden />
                Skip
              </Button>
            </>
          )}
        </div>
      </div>

      {formatText(item.source) !== '—' ? (
        <p className="mt-1.5 text-xs text-muted-foreground">Source: {item.source}</p>
      ) : null}
    </li>
  )
}
