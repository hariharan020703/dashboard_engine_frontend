import { useState } from 'react'
import { KeyRound, Loader2, Plus, UserPlus, UsersRound } from 'lucide-react'
import {
  fetchDashboardGrants,
  grantGroupAccess,
  grantUserAccess,
  listAccessLevels,
  listGrantableDashboards,
  listGroups,
  listUserOptions,
  revokeGroupAccess,
  revokeUserAccess,
} from '@/api/workspaceApi'
import { useAsync } from '@/hooks/useAsync'
import { useAuth } from '@/context/authContext'
import { Page, PageHeader, Section } from '@/components/common/Page'
import { AccessLevelBadge } from '@/components/common/Badges'
import { GrantActionsMenu } from '@/components/common/GrantActionsMenu'
import { ACCESS_LEVEL_LABELS } from '@/components/common/labels'
import { EmptyState, ErrorState, InlineLoading, TableSkeleton } from '@/components/common/States'
import { notify } from '@/components/common/notify'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import type { AccessLevel } from '@/types/auth'

/**
 * Who can see which dashboard.
 *
 * Organised by dashboard rather than by person, because that is the question a
 * company administrator actually arrives with - "who can see Revenue?" - and it
 * is the one the per-person screen answers badly. The reverse view lives on
 * each member's own page.
 *
 * The levels are named in plain words throughout. "developer" is the id the API
 * uses; "Can edit" is what it means to somebody deciding whether a colleague
 * should have it.
 */
export default function AccessPage() {
  const { can, user } = useAuth()
  const mayGrant = can('access.grant')
  const mayRevoke = can('access.revoke')

  const dashboards = useAsync(() => listGrantableDashboards(), [])
  const rows = dashboards.data ?? []

  /*
   * Which dashboard is open, DERIVED rather than stored: null means "the first
   * one", and a stored choice that is no longer grantable falls back to the
   * first. No effect, so no second render on load and no stale id.
   */
  const [picked, setPicked] = useState<string | null>(null)
  const selectedId =
    picked !== null && rows.some((dashboard) => dashboard.id === picked)
      ? picked
      : (rows[0]?.id ?? '')

  const grants = useAsync(
    () => (selectedId ? fetchDashboardGrants(selectedId) : Promise.resolve(null)),
    [selectedId]
  )

  // The level descriptions, for the options menu on every row.
  const levels = useAsync(() => listAccessLevels(), [])

  const [granting, setGranting] = useState<'user' | 'group' | null>(null)
  /** Which row is being changed or removed (`user:3`, `group:7`), so only it waits. */
  const [pendingKey, setPendingKey] = useState<string | null>(null)

  /*
   * One runner for both actions. Changing a level is the same PUT that
   * granted it - the backend replaces the existing grant - so no new endpoint.
   */
  const act = async (
    key: string,
    work: () => Promise<unknown>,
    message: string,
    failure: string
  ) => {
    setPendingKey(key)
    try {
      await work()
      notify.success(message)
      grants.reload()
    } catch (err) {
      notify.failure(failure, err)
    } finally {
      setPendingKey(null)
    }
  }

  const selected = rows.find((dashboard) => dashboard.id === selectedId) ?? null
  const selectedTitle = selected?.title || selected?.id || ''

  return (
    <Page>
      <PageHeader
        title="Dashboard access"
        description={
          user?.companyName
            ? `Who at ${user.companyName} can see which dashboard.`
            : 'Who can see which dashboard.'
        }
      />

      {dashboards.error ? (
        <Section>
          <ErrorState
            error={dashboards.error}
            title="Unable to load dashboards"
            onRetry={dashboards.reload}
          />
        </Section>
      ) : dashboards.loading ? (
        <Section flush>
          <TableSkeleton rows={4} columns={2} />
        </Section>
      ) : rows.length === 0 ? (
        <Section flush>
          <EmptyState
            title="No dashboards to share yet"
            body="A platform administrator decides which dashboards your company may use. Once they do, you choose who sees each one."
            icon={KeyRound}
          />
        </Section>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
          <Section title="Dashboards" flush>
            <ul className="divide-y divide-border" role="listbox" aria-label="Dashboards">
              {rows.map((dashboard) => {
                const active = dashboard.id === selectedId
                return (
                  <li key={dashboard.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => setPicked(dashboard.id)}
                      className={cn(
                        'w-full truncate px-4 py-3 text-left text-sm transition-colors',
                        'focus-visible:outline-ring focus-visible:outline-2 focus-visible:-outline-offset-2',
                        active
                          ? 'bg-accent font-medium text-accent-foreground'
                          : 'text-foreground hover:bg-muted/50'
                      )}
                    >
                      {dashboard.title || dashboard.id}
                    </button>
                  </li>
                )
              })}
            </ul>
          </Section>

          <div className="space-y-6">
            <Section
              title="People"
              description={`Colleagues given ${selectedTitle} individually.`}
              actions={
                mayGrant && (
                  <Button size="sm" onClick={() => setGranting('user')}>
                    <UserPlus aria-hidden />
                    Add a person
                  </Button>
                )
              }
              flush
            >
              {grants.error ? (
                <ErrorState error={grants.error} onRetry={grants.reload} compact />
              ) : grants.loading ? (
                <InlineLoading label="Loading access…" />
              ) : (grants.data?.users.length ?? 0) === 0 ? (
                <EmptyState
                  title="Nobody individually"
                  body={
                    mayGrant
                      ? 'Add someone here, or give a whole group access below.'
                      : 'Nobody has been given this dashboard directly.'
                  }
                  compact
                />
              ) : (
                <ul className="divide-y divide-border">
                  {(grants.data?.users ?? []).map((holder) => (
                    <li
                      key={holder.userId}
                      className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-foreground">
                          {holder.username}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {holder.email}
                        </span>
                      </span>
                      <span className="flex items-center gap-2">
                        <AccessLevelBadge level={holder.level} />
                        <GrantActionsMenu
                          holderName={holder.username}
                          level={holder.level}
                          levels={levels.data ?? undefined}
                          mayChange={mayGrant}
                          mayRemove={mayRevoke}
                          pending={pendingKey === `user:${holder.userId}`}
                          onChangeLevel={(level) =>
                            void act(
                              `user:${holder.userId}`,
                              () => grantUserAccess(selectedId, holder.userId, level),
                              `${holder.username} now ${ACCESS_LEVEL_LABELS[level].toLowerCase()} ${selectedTitle}.`,
                              'change that permission'
                            )
                          }
                          onRemove={() =>
                            void act(
                              `user:${holder.userId}`,
                              () => revokeUserAccess(selectedId, holder.userId),
                              `${holder.username} can no longer see ${selectedTitle}.`,
                              'remove that access'
                            )
                          }
                        />
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section
              title="Groups"
              description="A group passes its access to every active member."
              actions={
                mayGrant && (
                  <Button size="sm" variant="outline" onClick={() => setGranting('group')}>
                    <Plus aria-hidden />
                    Add a group
                  </Button>
                )
              }
              flush
            >
              {grants.error ? null : grants.loading ? (
                <InlineLoading label="Loading groups…" />
              ) : (grants.data?.groups.length ?? 0) === 0 ? (
                <EmptyState
                  title="No groups"
                  body="Giving a group access is the tidiest way to keep a whole team in step."
                  icon={UsersRound}
                  compact
                />
              ) : (
                <ul className="divide-y divide-border">
                  {(grants.data?.groups ?? []).map((holder) => (
                    <li
                      key={holder.groupId}
                      className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-sm font-medium text-foreground">
                          {holder.groupName}
                        </span>
                        {!holder.active && (
                          // A paused group keeps its grant but passes nothing on.
                          // Saying so here avoids a long hunt for why somebody
                          // cannot see a dashboard their group "has".
                          <Badge variant="outline" className="text-muted-foreground">
                            Paused
                          </Badge>
                        )}
                      </span>
                      <span className="flex items-center gap-2">
                        <AccessLevelBadge level={holder.level} />
                        <GrantActionsMenu
                          holderName={holder.groupName}
                          level={holder.level}
                          levels={levels.data ?? undefined}
                          mayChange={mayGrant}
                          mayRemove={mayRevoke}
                          pending={pendingKey === `group:${holder.groupId}`}
                          onChangeLevel={(level) =>
                            void act(
                              `group:${holder.groupId}`,
                              () => grantGroupAccess(selectedId, holder.groupId, level),
                              `${holder.groupName} now ${ACCESS_LEVEL_LABELS[level].toLowerCase()} ${selectedTitle}.`,
                              'change that permission'
                            )
                          }
                          onRemove={() =>
                            void act(
                              `group:${holder.groupId}`,
                              () => revokeGroupAccess(selectedId, holder.groupId),
                              `${holder.groupName} no longer has ${selectedTitle}.`,
                              'remove that access'
                            )
                          }
                        />
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </div>
        </div>
      )}

      {granting && (
        <GrantDialog
          kind={granting}
          dashboardId={selectedId}
          dashboardTitle={selectedTitle}
          onClose={() => setGranting(null)}
          onGranted={() => {
            setGranting(null)
            grants.reload()
          }}
        />
      )}
    </Page>
  )
}

/* ----------------------------------------------------------------- grant --- */

function GrantDialog({
  kind,
  dashboardId,
  dashboardTitle,
  onClose,
  onGranted,
}: {
  kind: 'user' | 'group'
  dashboardId: string
  dashboardTitle: string
  onClose: () => void
  onGranted: () => void
}) {
  const [mode, setMode] = useState<'user' | 'group'>(kind)
  /*
   * One chosen target per mode rather than one that gets cleared when the tab
   * changes. Switching to Groups and back no longer loses the person who was
   * already selected, and there is no effect resetting state on a prop change.
   */
  const [targets, setTargets] = useState<{ user: string; group: string }>({ user: '', group: '' })
  const targetId = targets[mode]
  const setTargetId = (value: string) =>
    setTargets((current) => ({ ...current, [mode]: value }))

  const [level, setLevel] = useState<AccessLevel>('view')
  const [pending, setPending] = useState(false)

  const people = useAsync(() => listUserOptions(), [])
  const groups = useAsync(() => listGroups(), [])
  const levels = useAsync(() => listAccessLevels(), [])

  const submit = async () => {
    if (!targetId) return
    setPending(true)
    try {
      if (mode === 'user') {
        await grantUserAccess(dashboardId, Number(targetId), level)
      } else {
        await grantGroupAccess(dashboardId, Number(targetId), level)
      }
      notify.success(
        `Access to ${dashboardTitle} granted.`,
        mode === 'group' ? 'Every active member of the group has it now.' : undefined
      )
      onGranted()
    } catch (err) {
      notify.failure('give that access', err)
      setPending(false)
    }
  }

  const levelOptions = levels.data ?? []

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Give access to {dashboardTitle}</DialogTitle>
          <DialogDescription>
            Choose who, and what they should be able to do with it.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(value) => setMode(value as 'user' | 'group')}>
          <TabsList className="w-full">
            <TabsTrigger value="user" className="flex-1">
              A person
            </TabsTrigger>
            <TabsTrigger value="group" className="flex-1">
              A group
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="grant-target" className="text-xs font-medium">
              {mode === 'user' ? 'Person' : 'Group'}
            </Label>
            <Select value={targetId} onValueChange={setTargetId} disabled={pending}>
              <SelectTrigger id="grant-target" className="w-full">
                <SelectValue placeholder={mode === 'user' ? 'Choose a colleague…' : 'Choose a group…'} />
              </SelectTrigger>
              <SelectContent>
                {mode === 'user'
                  ? (people.data ?? []).map((person) => (
                      <SelectItem key={person.id} value={String(person.id)}>
                        {person.username}
                      </SelectItem>
                    ))
                  : (groups.data ?? []).map((group) => (
                      <SelectItem key={group.id} value={String(group.id)}>
                        {group.name} · {group.memberCount}{' '}
                        {group.memberCount === 1 ? 'member' : 'members'}
                      </SelectItem>
                    ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="grant-level" className="text-xs font-medium">
              They can
            </Label>
            <Select
              value={level}
              onValueChange={(value) => setLevel(value as AccessLevel)}
              disabled={pending || levelOptions.length === 0}
            >
              <SelectTrigger id="grant-level" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {levelOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {ACCESS_LEVEL_LABELS[option.id] ?? option.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {levelOptions.find((option) => option.id === level)?.description}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={pending || !targetId}>
            {pending && <Loader2 className="animate-spin" aria-hidden />}
            Give access
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
