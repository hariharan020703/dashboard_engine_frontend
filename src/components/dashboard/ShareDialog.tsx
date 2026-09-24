import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, Share2, UsersRound } from 'lucide-react'
import {
  fetchDashboardGrants,
  grantUserAccess,
  listShareablePeople,
  revokeUserAccess,
} from '@/api/workspaceApi'
import { useAsync } from '@/hooks/useAsync'
import { AccessLevelBadge } from '@/components/common/Badges'
import { GrantActionsMenu } from '@/components/common/GrantActionsMenu'
import {
  ACCESS_LEVEL_LABELS,
  ACCESS_LEVEL_ORDER,
  levelAtLeast,
} from '@/components/common/labels'
import { ErrorState, InlineLoading } from '@/components/common/States'
import { notify } from '@/components/common/notify'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { AccessLevel } from '@/types/auth'

/**
 * Sharing one dashboard, from the dashboard itself.
 *
 * Open to anyone whose level on it is "Can share" or above - not only company
 * administrators. What it offers follows the backend's rules exactly, from the
 * `you` block the grants read returns:
 *
 *   - levels up to the sharer's own (an administrator: all four);
 *   - changing someone's level only if theirs does not exceed the sharer's;
 *   - removing access only with "Full control" (or as an administrator);
 *   - never the sharer's own grant.
 *
 * Group grants are shown for completeness but managed on the Access page:
 * a team-wide change is an administrator's decision.
 */
export function ShareDialog({
  dashboardId,
  dashboardTitle,
  open,
  onOpenChange,
  accessPagePath,
}: {
  dashboardId: string
  dashboardTitle: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Where an administrator manages every grant, if they may. */
  accessPagePath?: string | null
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="size-4" aria-hidden />
            Share {dashboardTitle}
          </DialogTitle>
          <DialogDescription>
            Choose who can open this dashboard, and what they can do with it.
          </DialogDescription>
        </DialogHeader>
        {/* Mounted only while open, so nothing is fetched until it is. */}
        {open ? <ShareBody dashboardId={dashboardId} accessPagePath={accessPagePath} /> : null}
      </DialogContent>
    </Dialog>
  )
}

function ShareBody({
  dashboardId,
  accessPagePath,
}: {
  dashboardId: string
  accessPagePath?: string | null
}) {
  const grants = useAsync(() => fetchDashboardGrants(dashboardId), [dashboardId])
  const people = useAsync(() => listShareablePeople(dashboardId), [dashboardId])

  const [personId, setPersonId] = useState('')
  const [level, setLevel] = useState<AccessLevel>('view')
  const [adding, setAdding] = useState(false)
  const [pendingUser, setPendingUser] = useState<number | null>(null)

  if (grants.error) {
    return <ErrorState error={grants.error} onRetry={grants.reload} compact />
  }
  if (grants.loading || !grants.data) {
    return <InlineLoading label="Loading who has access…" />
  }

  const you = grants.data.you
  const administrator = Boolean(you?.administrator)
  const myLevel: AccessLevel = you?.level ?? 'view'
  const myId = you?.userId ?? null
  const allowed = administrator
    ? ACCESS_LEVEL_ORDER
    : ACCESS_LEVEL_ORDER.filter((l) => levelAtLeast(myLevel, l))

  const holders = grants.data.users
  const holderIds = new Set(holders.map((h) => h.userId))
  const candidates = (people.data ?? []).filter((p) => !holderIds.has(p.id) && p.id !== myId)
  const effectiveLevel = allowed.includes(level) ? level : allowed[0]

  /** May the caller act on this person's grant at all? */
  const mayTouch = (userId: number, theirLevel: AccessLevel) =>
    administrator || (userId !== myId && levelAtLeast(myLevel, theirLevel))

  const add = async () => {
    if (!personId) return
    setAdding(true)
    try {
      await grantUserAccess(dashboardId, Number(personId), effectiveLevel)
      const name = candidates.find((p) => String(p.id) === personId)?.username ?? 'They'
      notify.success(`${name} ${ACCESS_LEVEL_LABELS[effectiveLevel].toLowerCase()} this dashboard.`)
      setPersonId('')
      grants.reload()
    } catch (err) {
      notify.failure('share this dashboard', err)
    } finally {
      setAdding(false)
    }
  }

  const act = async (userId: number, work: () => Promise<unknown>, message: string, failure: string) => {
    setPendingUser(userId)
    try {
      await work()
      notify.success(message)
      grants.reload()
    } catch (err) {
      notify.failure(failure, err)
    } finally {
      setPendingUser(null)
    }
  }

  return (
    <div className="space-y-5">
      {/* ------------------------------------------------------------ add --- */}
      <div className="rounded-lg border bg-muted/30 p-3">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_10rem]">
          <div className="space-y-1.5">
            <Label htmlFor="share-person" className="text-xs font-medium">
              Person
            </Label>
            <Select value={personId} onValueChange={setPersonId} disabled={adding}>
              <SelectTrigger id="share-person" className="w-full">
                <SelectValue
                  placeholder={
                    people.loading
                      ? 'Loading colleagues…'
                      : candidates.length
                        ? 'Choose a colleague…'
                        : 'Everyone already has access'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {candidates.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.username}
                    {p.email ? <span className="text-muted-foreground"> · {p.email}</span> : null}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="share-level" className="text-xs font-medium">
              They can
            </Label>
            <Select
              value={effectiveLevel}
              onValueChange={(v) => setLevel(v as AccessLevel)}
              disabled={adding}
            >
              <SelectTrigger id="share-level" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allowed.map((l) => (
                  <SelectItem key={l} value={l}>
                    {ACCESS_LEVEL_LABELS[l]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {administrator
              ? 'As an administrator you can give any level.'
              : `You can give up to "${ACCESS_LEVEL_LABELS[myLevel]}", the access you hold.`}
          </p>
          <Button size="sm" onClick={() => void add()} disabled={adding || !personId}>
            {adding ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            Share
          </Button>
        </div>
      </div>

      {/* --------------------------------------------------------- people --- */}
      <section>
        <h3 className="mb-2 text-sm font-semibold">People with access</h3>
        {holders.length === 0 ? (
          <p className="rounded-lg border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
            Nobody has been given this dashboard individually yet.
          </p>
        ) : (
          <ul className="max-h-64 divide-y overflow-y-auto rounded-lg border">
            {holders.map((h) => {
              const touchable = mayTouch(h.userId, h.level)
              return (
                <li key={h.userId} className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {h.username}
                      {h.userId === myId ? (
                        <span className="ml-1.5 text-xs font-normal text-muted-foreground">(you)</span>
                      ) : null}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">{h.email}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    <AccessLevelBadge level={h.level} />
                    <GrantActionsMenu
                      holderName={h.username}
                      level={h.level}
                      allowedLevels={allowed}
                      mayChange={touchable}
                      mayRemove={touchable && Boolean(you?.mayRevoke)}
                      pending={pendingUser === h.userId}
                      onChangeLevel={(next) =>
                        void act(
                          h.userId,
                          () => grantUserAccess(dashboardId, h.userId, next),
                          `${h.username} now ${ACCESS_LEVEL_LABELS[next].toLowerCase()} this dashboard.`,
                          'change that permission'
                        )
                      }
                      onRemove={() =>
                        void act(
                          h.userId,
                          () => revokeUserAccess(dashboardId, h.userId),
                          `${h.username} can no longer open this dashboard.`,
                          'remove that access'
                        )
                      }
                    />
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* --------------------------------------------------------- groups --- */}
      {grants.data.groups.length > 0 ? (
        <section>
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
            <UsersRound className="size-4 text-muted-foreground" aria-hidden />
            Groups with access
          </h3>
          <ul className="divide-y rounded-lg border">
            {grants.data.groups.map((g) => (
              <li key={g.groupId} className="flex items-center justify-between gap-3 px-3 py-2.5">
                <span className="truncate text-sm font-medium">{g.groupName}</span>
                <AccessLevelBadge level={g.level} />
              </li>
            ))}
          </ul>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Group access is managed by a company administrator.
          </p>
        </section>
      ) : null}

      {administrator && accessPagePath ? (
        <p className="text-xs text-muted-foreground">
          To manage groups and every dashboard at once, open{' '}
          <Link to={accessPagePath} className="font-medium text-primary hover:underline">
            Dashboard access
          </Link>
          .
        </p>
      ) : null}
    </div>
  )
}
